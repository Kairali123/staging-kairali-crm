import { NextRequest,NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { administrator,privateHeaders } from '@/lib/trigger-monitor/security'
export const runtime='nodejs'
export async function GET(req:NextRequest){
 if(!administrator(req))return NextResponse.json({error:'Administrator access required'},{status:403})
 return new NextResponse(await readFile(path.join(process.cwd(),'docs/trigger-monitor/connector.gs'),'utf8'),{headers:{...privateHeaders,'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="KairaliTriggerMonitor.gs"'}})
}
