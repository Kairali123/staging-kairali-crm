import {NextRequest,NextResponse} from 'next/server'
import {z} from 'zod'
import {authorized,responseHeaders as headers} from '@/lib/whatsapp-triggers/auth'
import {transaction} from '@/lib/whatsapp-triggers/store'
import {sendReport} from '@/lib/whatsapp-triggers/provider'
import {reportTemplates} from '@/lib/whatsapp-triggers/schema'
import {yesterdayIST} from '@/lib/marketing-daily-report'
export const runtime='nodejs'
const schema=z.object({id:z.string().uuid(),revision:z.number().int(),requestId:z.string().uuid(),to:z.string().regex(/^\+[1-9]\d{7,14}$/),date:z.string(),image:z.string().max(5600000).regex(/^[A-Za-z0-9+/]+={0,2}$/)})
export async function POST(req:NextRequest){
 if(!authorized(req)||req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Access denied'},{status:403,headers})
 let requestId:string|undefined
 try{
  const text=await req.text();if(text.length>5700000)return NextResponse.json({error:'Report image must be under 4 MB'},{status:413,headers})
  const parsed=schema.safeParse(JSON.parse(text));if(!parsed.success)return NextResponse.json({error:'Invalid test message request'},{status:400,headers})
  const input=parsed.data;if(input.date!==yesterdayIST())throw Error('Regenerate the image for yesterday before sending')
  const image=Buffer.from(input.image,'base64');if(image.length>4*1024*1024||image.length<4||image[0]!==255||image[1]!==216||image[image.length-2]!==255||image[image.length-1]!==217)throw Error('A valid JPEG under 4 MB is required')
  const config=await transaction(s=>{
   if(s.runs.some(r=>r.id===input.requestId))throw Error('This test request was already submitted. Check its result before retrying.')
   const c=s.triggers.find(t=>t.id===input.id);if(!c||c.revision!==input.revision)throw Error('Save and reload the current configuration first')
   if(!c.consent||!c.recipients.includes(input.to))throw Error('Select an opted-in recipient from the saved configuration')
   if(s.runs.some(r=>r.triggerId===c.id&&Date.now()-Date.parse(r.startedAt)<60000))throw Error('Wait one minute between test messages')
   const templateName=reportTemplates[c.reportId]?.template||'crm_daily_sales_report_image'
   s.runs.push({id:input.requestId,triggerId:c.id,triggerName:c.name,scheduledAt:new Date().toISOString(),startedAt:new Date().toISOString(),status:'Sending',detail:`Test send to ${input.to}`,templateName,templateLink:'https://wa.redlava.in/ListTemplate'});return c
  })
  requestId=input.requestId
  const messageId=await sendReport(config,input.to,input.date,image)
  await transaction(s=>{const run=s.runs.find(r=>r.id===requestId)!;run.status='Accepted';run.messageId=messageId;run.detail=`Test message accepted by Redlava (${input.to})`})
  return NextResponse.json({status:'Accepted',message:'Redlava accepted the message. Delivery is not yet confirmed.'},{headers})
 }catch(e){
  if(requestId)await transaction(s=>{const run=s.runs.find(r=>r.id===requestId);if(run){run.status='Unknown';run.detail='Acceptance uncertain. Check Redlava.'}}).catch(()=>{})
  return NextResponse.json({error:e instanceof Error?e.message:'Acceptance unknown. Check Redlava before retrying.'},{status:400,headers})
 }
}
