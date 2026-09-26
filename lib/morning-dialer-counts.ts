import 'server-only'
import { google } from 'googleapis'
import { parsePending } from './daily-sales-calling'

const spreadsheetId = '1BVzVFnWYomZrJKKEBxh49fN5ImH79XpDR8rhO20AjB4'
const backlogUrl = 'https://script.google.com/macros/s/AKfycbz3TmE2vjHfMLhrjPlhQm5diRug-s1mZZhxSXFA3pX1-PS5dRKi3vR2QrR9j0tSmDyCdw/exec'

export type MorningDialerCounts = {
  domestic: number | null
  international: number | null
  capturedAt: string | null
  source: 'Live dialer backlog' | 'DialerPending sheet' | 'unavailable'
}

function validCount(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

async function fromBacklog(): Promise<MorningDialerCounts | null> {
  const response = await fetch(backlogUrl, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`Dialer backlog HTTP ${response.status}`)
  const body = await response.json()
  if (!Array.isArray(body.data)) throw new Error('Dialer backlog format changed')
  let domestic = 0
  let international = 0
  let campaigns = 0
  for (const item of body.data) {
    if (!String(item.url || '').includes(spreadsheetId)) continue
    if (!['KTAHV', 'VILLARAAG', 'KAPPL'].includes(String(item.company || '').toUpperCase())) continue
    const name = String(item.fmsName || '').toUpperCase()
    if (!/(NBD|CRR|SALES)/.test(name) || /(LANGUAGE BARRIER|FEEDBACK|REFERRAL|TREATMENT|COLD CALLING)/.test(name)) continue
    const count = validCount(item.totalPendingCount)
    if (count === null) throw new Error('Invalid dialer pending count')
    if (name.includes('INTERNATIONAL')) international += count
    else domestic += count
    campaigns++
  }
  return campaigns ? { domestic, international, capturedAt: new Date().toISOString(), source: 'Live dialer backlog' } : null
}

async function fromSheet(): Promise<MorningDialerCounts | null> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null
  const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'DialerPending'!O8:T23", valueRenderOption: 'FORMATTED_VALUE' }, { timeout: 12000 })
  const pending = parsePending(response.data.values || [])
  const companies = ['KTAHV', 'VILLARAAG', 'KAPPL']
  const domestic = companies.map(company => pending[company]?.national)
  const international = companies.map(company => pending[company]?.international)
  if ([...domestic, ...international].some(value => value === null || value === undefined)) return null
  return {
    domestic: domestic.reduce<number>((sum, value) => sum + (value || 0), 0),
    international: international.reduce<number>((sum, value) => sum + (value || 0), 0),
    capturedAt: new Date().toISOString(),
    source: 'DialerPending sheet',
  }
}

export async function loadMorningDialerCounts(): Promise<MorningDialerCounts> {
  try { const live = await fromBacklog(); if (live) return live } catch { /* Try the linked summary sheet. */ }
  try { const sheet = await fromSheet(); if (sheet) return sheet } catch { /* Keep missing counts unknown. */ }
  return { domestic: null, international: null, capturedAt: null, source: 'unavailable' }
}
