import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseEmployees, parsePending, type CallingData } from './daily-sales-calling'
const spreadsheetId='1BVzVFnWYomZrJKKEBxh49fN5ImH79XpDR8rhO20AjB4'
const liveURL='https://script.google.com/macros/s/AKfycbz1wmE_4sczF7XrozAB-EYaZwmtC367uBPchMYcH_yi3UQJC5J3ANIkgTQTOQ7JzOD5nA/exec'
export async function loadCalling():Promise<CallingData>{
 const result:CallingData={employees:[],pending:{},pendingCapturedAt:null,pendingMode:'unavailable',fetchedAt:new Date().toISOString(),warnings:[]}
 await Promise.all([
 (async()=>{try{const r=await fetch(liveURL,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const b=await r.json();if(b.success!==true||!Array.isArray(b.data))throw Error();result.employees=parseEmployees(b.data)}catch{result.warnings.push('Employee calling feed unavailable. Refresh to retry.')}})(),
 (async()=>{try{
 if(process.env.GOOGLE_SERVICE_ACCOUNT_JSON){const {google}=await import('googleapis');const auth=new google.auth.GoogleAuth({credentials:JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});const sheets=google.sheets({version:'v4',auth});const response=await sheets.spreadsheets.values.get({spreadsheetId,range:"'DialerPending'!O8:T23",valueRenderOption:'FORMATTED_VALUE'},{timeout:15000});result.pending=parsePending(response.data.values||[]);result.pendingCapturedAt=new Date().toISOString();result.pendingMode='live'}
 else {const saved=JSON.parse(await readFile(join(process.cwd(),'data/daily-sales-report/pending-snapshot.json'),'utf8'));result.pending=parsePending(saved.rows);result.pendingCapturedAt=saved.capturedAt;result.pendingMode='snapshot';result.warnings.push('Pending totals are the last connected Google Sheets snapshot. Automatic refresh needs Sheets read access configured on the CRM server.')}
 }catch{result.warnings.push('Pending summary could not be read. No zero totals were substituted.')}})()
 ])
 result.warnings.push('National/International calls-done split is not present in Live column M; those two cards remain unavailable. Company filters use the employee’s registered CRM company; activity counts are employee totals, not per-company call attribution.')
 return result
}
