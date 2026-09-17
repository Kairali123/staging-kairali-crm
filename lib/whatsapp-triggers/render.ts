import {chromium} from 'playwright-core'
import {exportSalesHTML} from '@/lib/daily-sales-report'
import {reportExportHTML} from '@/lib/marketing-daily-report'
import {loadScheduledSales} from '@/lib/email-triggers/load-sales'
import {loadScheduledMarketing} from '@/lib/email-triggers/load-marketing'
import type {ConfigInput} from './schema'
// A fresh browser context for document rendering only: no CRM session, cookies or network.
export async function renderJPEG(html:string){
 const browser=await chromium.launch({headless:true,...(process.env.WHATSAPP_CHROMIUM_PATH?{executablePath:process.env.WHATSAPP_CHROMIUM_PATH}:{channel:'msedge'}),timeout:30000})
 try{
  const context=await browser.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:1,javaScriptEnabled:false,serviceWorkers:'block'})
  await context.route('**/*',route=>route.abort())
  const page=await context.newPage();await page.setContent(html,{waitUntil:'load',timeout:15000})
  const bounds=await page.locator('body').boundingBox()
  if(!bounds||bounds.height>16000)throw Error('Report is too long for one image; select one company or fewer details')
  const image=await page.screenshot({type:'jpeg',quality:90,fullPage:true,timeout:30000})
  if(image.length>4*1024*1024)throw Error('Report image exceeds 4 MB; select one company or fewer details')
  return image
 }finally{await browser.close()}
}
export async function buildReportImage(config:ConfigInput,date:string){
 if(config.reportId==='daily-sales-report')return renderJPEG(exportSalesHTML(await loadScheduledSales(date),config.company))
 const report=await loadScheduledMarketing(date),scope=config.company==='ALL'?'all':config.company==='VILLARAAG'?'VILARAAG':config.company
 const expanded=config.details?report.companies.filter(c=>scope==='all'||c.name===scope).flatMap(c=>[c.name+'-leads',c.name+'-sales']):[]
 return renderJPEG(reportExportHTML(date,report,{scope,expanded}))
}
