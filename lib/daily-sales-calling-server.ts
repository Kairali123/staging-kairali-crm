import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseEmployees, parsePending, count, type CallingData, type PendingCompany } from './daily-sales-calling'

const spreadsheetId = '1BVzVFnWYomZrJKKEBxh49fN5ImH79XpDR8rhO20AjB4'
const liveURL = 'https://script.google.com/macros/s/AKfycbz1wmE_4sczF7XrozAB-EYaZwmtC367uBPchMYcH_yi3UQJC5J3ANIkgTQTOQ7JzOD5nA/exec'
const FMS_PENDING_URL = 'https://script.google.com/macros/s/AKfycbz3TmE2vjHfMLhrjPlhQm5diRug-s1mZZhxSXFA3pX1-PS5dRKi3vR2QrR9j0tSmDyCdw/exec'

const DEFAULT_PENDING_SNAPSHOT = {
  capturedAt: '2026-09-17T12:54:20.000Z',
  rows: [
    ['COUNT', '', '', 'KTAHV', 'VILLARAAG', 'KAPPL'],
    [], [], [], [],
    ['TOTAL', '', '', 348, 166, 199],
    [], [], [], [],
    ['TOTAL', '', '', 8, 53, 647],
    [], [], [], [],
    ['TOTAL', '', '', 128, 0, 75]
  ]
}

async function loadPendingSnapshot() {
  try {
    const raw = await readFile(join(process.cwd(), 'data/daily-sales-report/pending-snapshot.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return DEFAULT_PENDING_SNAPSHOT
  }
}

export async function loadCalling(connection?: any, date?: string): Promise<CallingData> {
  const result: CallingData = {
    employees: [],
    pending: {},
    pendingCapturedAt: null,
    pendingMode: 'unavailable',
    fetchedAt: new Date().toISOString(),
    warnings: [],
  }

  await Promise.all([
    (async () => {
      const attemptFetch = async () => {
        const r = await fetch(liveURL, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
        if (!r.ok) throw Error(`HTTP ${r.status}`)
        const b = await r.json()
        if (b.success !== true || !Array.isArray(b.data)) throw Error('Unexpected response shape')
        return parseEmployees(b.data)
      }
      try {
        result.employees = await attemptFetch()
      } catch (err1) {
        console.warn('[loadCalling] Employee feed attempt 1 failed:', err1)
        // Retry once after a short delay before giving up
        await new Promise(res => setTimeout(res, 5000))
        try {
          result.employees = await attemptFetch()
        } catch (err2) {
          console.error('[loadCalling] Employee feed attempt 2 failed:', err2)
          result.warnings.push('Employee calling feed unavailable. Refresh to retry.')
        }
      }
    })(),

    (async () => {
      try {
        // 1. Check database first for dialer_pending data
        if (connection) {
          try {
            const [tables] = await connection.query("SHOW TABLES LIKE 'dialer_pending'")
            if (Array.isArray(tables) && tables.length > 0) {
              const [rows] = await connection.query(
                "SELECT * FROM dialer_pending WHERE report_date = ? OR report_date IS NULL",
                [date || '']
              )
              if (Array.isArray(rows) && rows.length > 0) {
                const dbPending: Record<string, PendingCompany> = {}
                for (const r of rows as Record<string, unknown>[]) {
                  const co = String(r.company || '').toUpperCase()
                  if (['KTAHV', 'VILLARAAG', 'KAPPL'].includes(co)) {
                    dbPending[co] = {
                      national: count(r.national ?? r.national_pending),
                      international: count(r.international ?? r.international_pending),
                      appsheet: count(r.appsheet ?? r.appsheet_pending),
                    }
                  }
                }
                if (Object.keys(dbPending).length > 0) {
                  result.pending = dbPending
                  result.pendingCapturedAt = new Date().toISOString()
                  result.pendingMode = 'database'
                  return
                }
              }
            }
          } catch {
            // DB table does not exist or query failed; fallback to sheet
          }
        }

        // 2. Fallback: use DialerPending sheet (1BVzVFnWYomZrJKKEBxh49fN5ImH79XpDR8rhO20AjB4)
        // 2a. Direct Google Sheets API if service account configured
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
          try {
            const { google } = await import('googleapis')
            const auth = new google.auth.GoogleAuth({
              credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
              scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            })
            const sheets = google.sheets({ version: 'v4', auth })
            const response = await sheets.spreadsheets.values.get(
              { spreadsheetId, range: "'DialerPending'!O8:T23", valueRenderOption: 'FORMATTED_VALUE' },
              { timeout: 15000 }
            )
            result.pending = parsePending(response.data.values || [])
            result.pendingCapturedAt = new Date().toISOString()
            result.pendingMode = 'live'
            return
          } catch {
            // Proceed to live FMS feed or snapshot
          }
        }

        // 2b. Live FMS Backlog API for DialerPending campaigns
        try {
          const r = await fetch(FMS_PENDING_URL, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
          if (r.ok) {
            const json = await r.json()
            const items = (json.data || []).filter((t: any) => t.url && t.url.includes(spreadsheetId))
            if (items.length > 0) {
              const livePending: Record<string, PendingCompany> = {
                KTAHV: { national: 0, international: 0, appsheet: null },
                VILLARAAG: { national: 0, international: 0, appsheet: null },
                KAPPL: { national: 0, international: 0, appsheet: null },
              }
              for (const item of items) {
                const co = String(item.company || '').toUpperCase()
                if (!livePending[co]) continue
                const name = String(item.fmsName || '').toUpperCase()
                // Only include NBD and CRR campaigns that are tracked on DialerPending
                const isNbdOrCrr = name.includes('NBD') || name.includes('CRR') || name.includes('SALES')
                const isExcluded = name.includes('LANGUAGE BARRIER') || name.includes('FEEDBACK') || name.includes('REFERRAL') || name.includes('TREATMENT') || name.includes('COLD CALLING')
                if (!isNbdOrCrr || isExcluded) continue

                const c = Number(item.totalPendingCount) || 0
                const isIntl = name.includes('INTERNATIONAL')
                if (isIntl) {
                  livePending[co].international = (livePending[co].international || 0) + c
                } else {
                  livePending[co].national = (livePending[co].national || 0) + c
                }
              }

              // Populate company AppSheet baseline from snapshot
              try {
                const saved = await loadPendingSnapshot()
                const snapshotPending = parsePending(saved.rows)
                for (const co of ['KTAHV', 'VILLARAAG', 'KAPPL']) {
                  livePending[co].appsheet = snapshotPending[co]?.appsheet ?? null
                }
              } catch {}

              result.pending = livePending
              result.pendingCapturedAt = new Date().toISOString()
              result.pendingMode = 'live'
              return
            }
          }
        } catch {
          // Proceed to snapshot
        }

        // 2c. Fallback to DialerPending snapshot
        const saved = await loadPendingSnapshot()
        result.pending = parsePending(saved.rows)
        result.pendingCapturedAt = saved.capturedAt
        result.pendingMode = 'snapshot'
        result.warnings.push('Pending totals are from the connected DialerPending Google Sheet snapshot.')
      } catch {
        result.warnings.push('Pending summary could not be read. No zero totals were substituted.')
      }
    })(),
  ])

  result.warnings.push('National/International calls-done split is not present in Live column M; those two cards remain unavailable. Company filters use the employee’s registered CRM company; activity counts are employee totals, not per-company call attribution.')
  return result
}

