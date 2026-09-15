import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSessionUser } from '@/lib/authz'
import { readReportSnapshot, marketingMailConfig, parseReportRecipients } from '@/lib/marketing-report-email'
import { reportExportHTML, displayDate, scopeLabel, validateReportView } from '@/lib/marketing-daily-report'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
export async function POST(req:NextRequest){
 const user=getSessionUser(req)
 if(!user)return NextResponse.json({error:'Please sign in'},{status:401,headers})
 const role=String(user?.role||'').trim().toLowerCase()
 if(role!=='super_admin'&&role!=='super admin')return NextResponse.json({error:'Super administrator access required'},{status:403,headers})
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid request origin'},{status:403,headers})
 const limit=await checkApiRateLimit(req,'marketing-email',user.id,5,60_000)
 if(!limit.allowed)return rateLimitResponse(limit.retryAfterSeconds)
 let report,to,view
 try{
  const text=await req.text();if(text.length>410000)throw Error()
  const body=JSON.parse(text)
  report=readReportSnapshot(body.snapshot,req.cookies.get('kairali_user')?.value||'');to=parseReportRecipients(body.to);view=validateReportView(report,body.view)
 }catch{return NextResponse.json({error:'Invalid or expired report. Refresh the report and check recipients.'},{status:400,headers})}
 const config=marketingMailConfig()
 if(!config.configured)return NextResponse.json({error:'Email sending is not configured. You can copy or download this email template.'},{status:503,headers})
 const date=report.date!,subject=`Marketing Daily Report | ${displayDate(date)} | ${scopeLabel(report,view.scope)}`
 const html=reportExportHTML(date,report,view)
 try{
  const transport=nodemailer.createTransport({host:config.host,port:config.port,secure:config.port===465,auth:{user:config.user!,pass:config.pass!},connectionTimeout:15000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true})
  const info=await transport.sendMail({from:`Kairali Group Marketing <${config.user!}>`,to,subject,html,text:`${subject}\nThe formatted report is included in this email.`,disableFileAccess:true,disableUrlAccess:true})
  if(info.rejected?.length)return NextResponse.json({error:'Some recipients were rejected. Check delivery before retrying.'},{status:502,headers})
  return NextResponse.json({success:true},{headers})
 }catch{return NextResponse.json({error:'Delivery could not be confirmed. Check your mailbox before retrying.'},{status:502,headers})}
}
