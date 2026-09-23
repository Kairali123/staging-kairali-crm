import { z } from 'zod'
import { validDay } from '@/lib/email-triggers/schedule'
export const reportTemplates = {
  'daily-sales-report': { title: 'Daily Sales Report Alert', template: 'crm_daily_sales_report_image' },
  'marketing-daily-report': { title: 'Marketing Daily Report', template: 'crm_marketing_daily_report_image' },
} as const
export const configSchema = z.object({
  id: z.string().uuid().optional(), revision: z.number().int().nonnegative().optional(),
  name: z.string().trim().min(1).max(120), reportId: z.enum(['daily-sales-report','marketing-daily-report']),
  company: z.enum(['ALL','KTAHV','VILLARAAG','KAPPL']),
  recipients: z.array(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international numbers, e.g. +919876543210')).max(50),
  consent: z.boolean(), status: z.enum(['Draft','Active','Paused']),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.literal('Asia/Kolkata'),
  period: z.enum(['Today', 'Yesterday']).default('Today'), start: z.string().refine(validDay,'Invalid start date'),
  details: z.boolean(),
}).strict().superRefine((c,ctx)=>{
  if(c.status==='Active'&&(!c.consent||!c.recipients.length))ctx.addIssue({code:'custom',message:'Active triggers require opted-in recipients'})
  if(new Set(c.recipients).size!==c.recipients.length)ctx.addIssue({code:'custom',message:'Remove duplicate recipients'})
})
export type ConfigInput = z.infer<typeof configSchema>
export type Config = ConfigInput & { id:string; revision:number; updatedAt:string; owner:string; nextRun?:string|null }
export type Template = { name:string; language:string; status:string; header:string; body:string; compatible:boolean }
export function normalizeTemplate(raw:unknown):Template|null {
  const result = z.object({name:z.string(),language:z.string(),status:z.string(),components:z.array(z.object({type:z.string(),format:z.string().optional(),text:z.string().optional()}).passthrough())}).safeParse(raw)
  if(!result.success)return null
  const t=result.data, header=t.components.find(c=>c.type==='HEADER')?.format||'NONE',body=t.components.find(c=>c.type==='BODY')?.text||''
  const variables=[...body.matchAll(/\{\{(\d+)\}\}/g)].map(m=>m[1])
  return {name:t.name,language:t.language,status:t.status,header,body,compatible:t.status==='APPROVED'&&header==='IMAGE'&&t.language==='en'&&variables.length===2&&variables[0]==='1'&&variables[1]==='2'&&!t.components.some(c=>!['HEADER','BODY','FOOTER'].includes(c.type))}
}
