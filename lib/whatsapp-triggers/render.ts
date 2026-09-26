import {exportSalesHTML} from '@/lib/daily-sales-report'
import {reportExportHTML} from '@/lib/marketing-daily-report'
import {loadScheduledSales} from '@/lib/email-triggers/load-sales'
import {loadScheduledMarketing} from '@/lib/email-triggers/load-marketing'
import type {ConfigInput} from './schema'

// Resolve a working browser launch options object, trying multiple paths/channels so the
// renderer survives on machines where Edge isn't registered in the expected registry path.
async function launchBrowser() {
  let chromium: any
  try {
    const pw = await import('playwright-core')
    chromium = pw.chromium
  } catch {
    throw new Error('Playwright is not available in this environment. Headless rendering is disabled.')
  }

  // In serverless environments (Vercel/Lambda), use @sparticuz/chromium which bundles
  // a precompiled Chromium binary that works without a local browser installation.
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV)
  if (isServerless) {
    try {
      // @ts-expect-error — optional peer dep, only present in serverless environments
      const sparticuz = await import('@sparticuz/chromium')
      const executablePath = await sparticuz.default.executablePath()
      return chromium.launch({
        args: sparticuz.default.args,
        executablePath,
        headless: true,
        timeout: 60000,
      })
    } catch (e) {
      console.warn('[render] @sparticuz/chromium failed, trying local browsers:', e)
    }
  }

  // 1. Explicit override via environment variable (highest priority)
  if (process.env.WHATSAPP_CHROMIUM_PATH) {
    return chromium.launch({ headless: true, executablePath: process.env.WHATSAPP_CHROMIUM_PATH, timeout: 30000 })
  }
  // 2. Edge via playwright channel (works when Edge is in the default install location)
  const candidates: (() => Promise<any>)[] = [
    () => chromium.launch({ headless: true, channel: 'msedge', timeout: 30000 }),
    () => chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', timeout: 30000 }),
    () => chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', timeout: 30000 }),
    () => chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', timeout: 30000 }),
    () => chromium.launch({ headless: true, channel: 'chrome', timeout: 30000 }),
  ]
  let lastErr: unknown
  for (const attempt of candidates) {
    try { return await attempt() } catch (e) { lastErr = e }
  }
  throw lastErr ?? Error('No supported browser found. Set WHATSAPP_CHROMIUM_PATH in .env.local.')
}

// A fresh browser context for document rendering only: no CRM session, cookies or network.
export async function renderJPEG(html:string){
 const browser=await launchBrowser()
 try{
  const context=await browser.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:1.5,javaScriptEnabled:false,serviceWorkers:'block'})
  const page=await context.newPage();await page.setContent(html,{waitUntil:'load',timeout:30000})
  const bounds=await page.locator('body').boundingBox()
  if(!bounds||bounds.height>16000)throw Error('Report is too long for one image; select one company or fewer details')
  const image=await page.screenshot({type:'jpeg',quality:92,fullPage:true,timeout:30000})
  if(image.length>5*1024*1024)throw Error('Report image exceeds 5 MB; select one company or fewer details')
  return image
 }finally{await browser.close()}
}
export async function buildReportImage(config:ConfigInput,date:string){
 if(config.reportId==='daily-sales-report')return renderJPEG(exportSalesHTML(await loadScheduledSales(date),config.company))
 const report=await loadScheduledMarketing(date),scope=config.company==='ALL'?'all':config.company==='VILLARAAG'?'VILARAAG':config.company
 const expanded=config.details?report.companies.filter(c=>scope==='all'||c.name===scope).flatMap(c=>[c.name+'-leads',c.name+'-sales']):[]
 return renderJPEG(reportExportHTML(date,report,{scope,expanded}))
}
