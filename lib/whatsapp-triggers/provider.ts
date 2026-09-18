import {normalizeTemplate,reportTemplates,type ConfigInput} from './schema'
const base='https://wa.redlava.in'
export function configured(){return !!process.env.REDLAVA_API_KEY?.trim()}
async function request(endpoint:string,body:unknown){
 const key=process.env.REDLAVA_API_KEY?.trim();if(!key)throw Error('Redlava API key is not configured on this server')
 const response=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,...(process.env.REDLAVA_PHONE_ID?{'x-phone-id':process.env.REDLAVA_PHONE_ID}:{})},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)})
 if(!response.ok)throw Error('Redlava request failed (HTTP '+response.status+'). Check provider access and account status.')
 const contentType=response.headers?.get?.('content-type')||''
 if(contentType&&!contentType.includes('application/json')){
  throw Error('Redlava returned an unexpected non-JSON response. Check provider service status.')
 }
 let data: any
 try{data=await response.json()}catch{throw Error('Could not parse response from Redlava as JSON')}
 if(data?.error)throw Error('Redlava rejected the request. Check the provider message log.');return data
}
export async function templates(){
 const all=[]
 for(let current=1;current<=20;current++){
  const data=await request('/api/v1/messageTemplate/getTemplates',{pagination:{current,pageSize:100},order:[{fieldName:'creationTime',dir:'desc'}],search:[]})
  if(!Array.isArray(data.results))throw Error('Unexpected template response from Redlava')
  for(const row of data.results){const t=normalizeTemplate(row.template);if(t&&Object.values(reportTemplates).some(r=>r.template===t.name))all.push(t)}
  if(data.results.length<100||current*100>=Number(data.total||data.metadata?.totalRecords))return all
 }
 throw Error('Template inventory exceeds supported limit; provider verification incomplete')
}
export function getReportUrl(config: { reportId: string; company?: string }, date: string): string {
 const base = (
  process.env.WHATSAPP_REPORT_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'https://kairali-group-crm.vercel.app'
 ).trim().replace(/\/+$/, '')
 const normalizedBase = base.startsWith('http://') || base.startsWith('https://') ? base : `https://${base}`
 if (config.reportId === 'marketing-daily-report') {
  return `${normalizedBase}/marketing-daily-report?date=${encodeURIComponent(date)}`
 }
 const company = config.company || 'ALL'
 return `${normalizedBase}/sales/reports/daily-alert?date=${encodeURIComponent(date)}&company=${encodeURIComponent(company)}`
}

export function formatReportScopeVariable(config: ConfigInput, date: string): string {
 const companyLabel = config.company === 'ALL' ? 'All companies' : config.company === 'VILLARAAG' ? 'VILARAAG' : config.company
 const url = getReportUrl(config, date)
 return `${companyLabel} (View / PDF: ${url})`
}

export async function sendReport(config:ConfigInput,to:string,date:string,image:Buffer){
 const name=reportTemplates[config.reportId].template
 const template=(await templates()).find(t=>t.name===name&&t.compatible)
 if(!template)throw Error('Sending blocked: the mapped template must be APPROVED with an IMAGE header and the expected variables')
 const scopeVariable = formatReportScopeVariable(config, date)
 const data=await request('/api/v1/whatsapp/sendMessage',{templateName:name,language:'en',to:to.slice(1),base64File:{name:config.reportId+'-'+date+'.jpg',body:image.toString('base64')},templateVariables:[date,scopeVariable]})
 if(typeof data.waMessageId!=='string'||!data.waMessageId)throw Error('Provider acceptance could not be confirmed; check Redlava before retrying')
 return data.waMessageId as string
}
