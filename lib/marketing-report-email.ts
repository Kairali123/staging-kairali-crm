import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { ReportData } from './marketing-daily-report'
const actorKey=(actor:string)=>createHash('sha256').update(actor).digest('hex')
const prefix='marketing-report-snapshot-v1:'
export function signReportSnapshot(report:ReportData,actor:string){
 const secret=process.env.NEXTAUTH_SECRET
 if(!secret) return null
 const payload=Buffer.from(JSON.stringify({report,actor:actorKey(actor),expires:Date.now()+60*60*1000})).toString('base64url')
 return payload+'.'+createHmac('sha256',secret).update(prefix+payload).digest('base64url')
}
export function readReportSnapshot(token:string,actor:string):ReportData{
 const secret=process.env.NEXTAUTH_SECRET
 if(!secret||typeof token!=='string'||token.length>400000)throw Error('Invalid snapshot')
 const [payload,sig,...extra]=token.split('.');if(!payload||!sig||extra.length)throw Error('Invalid snapshot')
 const expected=createHmac('sha256',secret).update(prefix+payload).digest(),actual=Buffer.from(sig,'base64url')
 if(actual.length!==expected.length||!timingSafeEqual(expected,actual))throw Error('Invalid snapshot')
 const parsed=JSON.parse(Buffer.from(payload,'base64url').toString())
 if(parsed.actor!==actorKey(actor)||parsed.expires<Date.now()||!parsed.report?.date)throw Error('Expired snapshot')
 return parsed.report
}
export function marketingMailConfig(){
 const user=process.env.SMTP_USER||process.env.EMAIL_USER,pass=process.env.SMTP_PASS||process.env.SMTP_PASSWORD||process.env.EMAIL_PASS
 return {user,pass,host:process.env.SMTP_HOST||'smtp.gmail.com',port:Number(process.env.SMTP_PORT||587),configured:Boolean(user&&pass)}
}
export function parseReportRecipients(value:unknown):string[]{
 if(typeof value!=='string'||value.length>1500||/[\r\n]/.test(value))throw Error('Enter valid email addresses')
 const recipients=[...new Set(value.split(/[,;]/).map(s=>s.trim()).filter(Boolean))]
 if(!recipients.length||recipients.length>10||recipients.some(s=>! /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(s)))throw Error('Enter up to 10 valid email addresses')
 return recipients
}
