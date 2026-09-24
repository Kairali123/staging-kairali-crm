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
      // 0. Try DB snapshot first (pushed by local worker or previous successful fetch)
      if (connection) {
        try {
          const [tables] = await connection.query("SHOW TABLES LIKE 'calling_employee_snapshot'") as any[]
          if (!tables || tables.length === 0) {
            await connection.query(`
              CREATE TABLE IF NOT EXISTS calling_employee_snapshot (
                id INT NOT NULL DEFAULT 1 PRIMARY KEY,
                captured_at DATETIME NOT NULL,
                employees JSON NOT NULL
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `)
          }
          const [rows] = await connection.query(
            "SELECT employees, captured_at FROM calling_employee_snapshot WHERE id = 1 AND captured_at >= NOW() - INTERVAL 4 HOUR LIMIT 1"
          ) as any[]
          if (Array.isArray(rows) && rows.length > 0 && rows[0]?.employees) {
            const rawEmps = rows[0].employees
            const parsed = Array.isArray(rawEmps) ? rawEmps : (typeof rawEmps === 'string' ? JSON.parse(rawEmps) : null)
            if (Array.isArray(parsed) && parsed.length > 0) {
              result.employees = parsed
              result.warnings.push(`Employee calling data served from database snapshot (captured ${new Date(rows[0].captured_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST).`)
              return
            }
          }
        } catch (dbErr) {
          console.warn('[loadCalling] DB employee snapshot check failed:', dbErr)
        }
      }

      // 1. Live fetch with retries and exponential backoff
      const attemptFetch = async () => {
        const r = await fetch(liveURL, { cache: 'no-store', signal: AbortSignal.timeout(25000) })
        if (!r.ok) throw Error(`HTTP ${r.status}`)
        const b = await r.json()
        if (b.success !== true || !Array.isArray(b.data)) throw Error('Unexpected response shape')
        return parseEmployees(b.data)
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const emps = await attemptFetch()
          if (Array.isArray(emps) && emps.length > 0) {
            result.employees = emps
            // Save fresh snapshot to database so subsequent queries and hosted runs have it
            if (connection) {
              try {
                await connection.query(
                  `INSERT INTO calling_employee_snapshot (id, captured_at, employees)
                   VALUES (1, NOW(), ?)
                   ON DUPLICATE KEY UPDATE captured_at = NOW(), employees = VALUES(employees)`,
                  [JSON.stringify(emps)]
                )
              } catch (saveErr) {
                console.warn('[loadCalling] Snapshot cache write failed:', saveErr)
              }
            }
            return
          }
        } catch (err) {
          console.warn(`[loadCalling] Employee feed attempt ${attempt} failed:`, (err as any)?.message || err)
          if (attempt < 3) {
            await new Promise(res => setTimeout(res, 2000 * attempt))
          }
        }
      }

      // Fallback: Check if ANY snapshot exists in DB (even older than 4 hours) before giving up
      if (connection && result.employees.length === 0) {
        try {
          const [fallbackRows] = await connection.query(
            "SELECT employees, captured_at FROM calling_employee_snapshot WHERE id = 1 LIMIT 1"
          ) as any[]
          if (Array.isArray(fallbackRows) && fallbackRows.length > 0 && fallbackRows[0]?.employees) {
            const rawEmps = fallbackRows[0].employees
            const parsed = Array.isArray(rawEmps) ? rawEmps : (typeof rawEmps === 'string' ? JSON.parse(rawEmps) : null)
            if (Array.isArray(parsed) && parsed.length > 0) {
              result.employees = parsed
              result.warnings.push(`Live calling feed was unreachable; using cached snapshot from ${new Date(fallbackRows[0].captured_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST.`)
              return
            }
          }
        } catch (fallbackErr) {
          console.warn('[loadCalling] Fallback DB snapshot check failed:', fallbackErr)
        }
      }

      if (result.employees.length === 0) {
        result.warnings.push('Employee calling feed unavailable. Waiting for full data.')
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

