import { z } from 'zod'
import { validDay, nextRun } from './schedule'
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),day=z.string().refine(validDay,'Invalid calendar date')
const addresses=z.string().max(3000).refine(s=>!/[\r\n]/.test(s)&&s.split(',').filter(x=>x.trim()).every(x=>z.string().email().safeParse(x.trim()).success),'Use comma-separated email addresses')
export const triggerSchema=z.object({
 id:z.string().uuid().optional(),revision:z.number().int().nonnegative().optional(),name:z.string().trim().min(1).max(120),
 reportId:z.enum(['daily-sales-report','marketing-daily-report']),source:z.enum(['Daily Sales Report Alert','Marketing Daily Report']),template:z.string().max(120),department:z.string().max(60),
 company:z.enum(['All companies','KTAHV','VILARAAG','KAPPL']),to:addresses,cc:addresses,bcc:addresses,
 subject:z.string().trim().min(1).max(250).refine(s=>!/[\r\n]/.test(s)),body:z.string().max(20000).default(''),bodyType:z.enum(['Full report in email body','Static','Dynamic','Mixed']),
 intro:z.string().max(3000).default(''),closing:z.string().max(3000).default(''),period:z.enum(['Today','Yesterday','Selected date']),previewDate:day.optional(),
 reportDetail:z.enum(['Full report','Summary only','Include source-wise details']),status:z.enum(['Draft','Active','Paused']),
 frequency:z.enum(['Daily','Every 6 hours','Custom','Weekly','Monthly','One-time']),time,custom:z.string().max(180),interval:z.string().regex(/^\d+$/).refine(s=>+s>=1&&+s<=168),
 weekday:z.enum(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),monthday:z.enum(['1','5','10','15','20','25','Last day']),timezone:z.enum(['Asia/Kolkata','Asia/Dubai','UTC']),start:day,end:z.union([day,z.literal('')]),
 attachment:z.literal('None'),mode:z.literal('Same email to all recipients'),condition:z.enum(['Always send','Only when data is available']),retry:z.literal('No retries'),missed:z.literal('Skip missed run'),replyTo:z.union([z.string().email(),z.literal('')]),
}).superRefine((c,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message})
 if(c.bodyType!=='Full report in email body'&&!c.body.trim())issue('Email body is required')
 if(c.end&&c.end<c.start)issue('End date must be after start date')
 if(c.frequency==='Custom'&&(!c.custom.trim()||c.custom.split(',').some(t=>!time.safeParse(t.trim()).success)))issue('Enter valid custom times')
 if(c.period==='Selected date'&&!c.previewDate)issue('Choose the report date')
 if(c.reportId==='marketing-daily-report'&&c.period==='Today')issue('Marketing reports require a completed reporting day')
 if(c.source!==(c.reportId==='daily-sales-report'?'Daily Sales Report Alert':'Marketing Daily Report'))issue('Report template mismatch')
 const recipients=[c.to,c.cc,c.bcc].flatMap(x=>x.split(',').map(x=>x.trim()).filter(Boolean))
 if(recipients.length>50)issue('Maximum 50 recipients')
 if(c.status==='Active'&&!c.to.trim())issue('To recipients are required to activate')
 if(c.status==='Active'&&!nextRun(c,Date.now()))issue('Schedule has no future run')
})
export type TriggerInput=z.infer<typeof triggerSchema>
export type Trigger=TriggerInput&{id:string;revision:number;owner:string;updatedAt:string;nextRun:string|null;lastResult:string}
export type Run={id:string;triggerId:string;name:string;scheduledAt:string;startedAt:string;finishedAt?:string;status:'Preparing'|'Sending'|'Accepted'|'Failed'|'Unknown'|'Skipped'|'Partial';detail:string;recipientCount:number}
