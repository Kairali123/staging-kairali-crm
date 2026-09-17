#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^['']|['']g/, '')
      if (key && val && !process.env[key]) process.env[key] = val
    }
  } catch {}
}
loadEnv()

const API_KEY = process.env.REDLAVA_API_KEY?.trim()
const PHONE_ID = process.env.REDLAVA_PHONE_ID?.trim()
const BASE = 'https://wa.redlava.in'

if (!API_KEY) { console.error('REDLAVA_API_KEY not set'); process.exit(1) }
console.log('API_KEY found:', API_KEY.slice(0,8) + '...')

async function redlava(endpoint, body) {
  const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY }
  if (PHONE_ID) headers['x-phone-id'] = PHONE_ID
  const res = await fetch(BASE + endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { status: res.status, ok: res.ok, data }
}

const TEMPLATES = [
  { name: 'crm_daily_sales_report_image', body: 'Dear Team,\nYour requested Daily Sales Report for {{1}} covering {{2}} is attached as an image.\nThis is your scheduled internal report notification.\nKairali Group' },
  { name: 'crm_marketing_daily_report_image', body: 'Dear Team,\nYour requested Marketing Daily Report for {{1}} covering {{2}} is attached as an image.\nThis is your scheduled internal report notification.\nKairali Group' },
]

;(async () => {
  console.log('\nFetching existing templates...')
  const { ok, data } = await redlava('/api/v1/messageTemplate/getTemplates', { pagination: { current: 1, pageSize: 100 }, order: [{ fieldName: 'creationTime', dir: 'desc' }], search: [] })
  const existing = (ok && Array.isArray(data.results)) ? data.results.map(r => r.template).filter(Boolean) : []
  console.log('Found', existing.length, 'templates')
  const relevantNames = new Set(TEMPLATES.map(t => t.name))
  for (const t of existing.filter(t => relevantNames.has(t.name))) {
    const header = t.components?.find(c => c.type === 'HEADER')?.format || 'NONE'
    console.log('  Existing:', t.name, '| status:', t.status, '| header:', header, '| language:', t.language)
  }

  for (const tpl of TEMPLATES) {
    const ex = existing.find(t => t.name === tpl.name)
    const header = ex?.components?.find(c => c.type === 'HEADER')?.format || 'NONE'
    if (ex?.status === 'APPROVED' && header === 'IMAGE') {
      console.log('\nALREADY APPROVED:', tpl.name, '-- skipping')
      continue
    }
    if (ex) {
      console.log('\nEXISTS BUT NOT APPROVED:', tpl.name, '| status:', ex.status, '| header:', header)
      console.log('  --> Please approve it at https://wa.redlava.in -> Message Templates')
      continue
    }
    console.log('\nCreating:', tpl.name)
    const r = await redlava('/api/v1/messageTemplate/createTemplate', {
      name: tpl.name, language: 'en', category: 'UTILITY',
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: tpl.body },
        { type: 'FOOTER', text: 'Internal report - Kairali Group' }
      ]
    })
    console.log('  HTTP', r.status, JSON.stringify(r.data).slice(0, 300))
  }
  console.log('\nDone. Go to https://wa.redlava.in to approve any pending templates.')
})()
