// Server-side stale-while-revalidate cache for the calls report.
//
// The upstream Apps Script web app takes 30-45 s per call (and sometimes answers with an HTML
// error page), yet the payload is only ~33 KB gzipped. Browsers used to wait on it directly on
// every page open. Now one server-side call is shared by everyone:
//   - fresh (< FRESH_MS): served from memory
//   - stale: served immediately, refreshed in the background (single flight, with a cool-down)
//   - cold start: the last good copy is restored from disk, so a restart does not bring the wait back
// Only a valid, non-empty JSON payload is ever cached.
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildCallsReport, type CallsReport } from './calls-report'

const UPSTREAM_URL =
  process.env.CALLS_REPORT_SOURCE_URL ||
  'https://script.google.com/macros/s/AKfycbydzH-IMa6XAwjjmJmy6yfDjnuu2Rfc8n2OUHYPYp5gQjNoqjjc5BrtLxB83torBcU/exec'

const FRESH_MS = 5 * 60 * 1000
const RETRY_COOLDOWN_MS = 60 * 1000
const UPSTREAM_TIMEOUT_MS = 110 * 1000
const CACHE_FILE = process.env.CALLS_REPORT_CACHE_FILE || path.join(os.tmpdir(), 'kairali-calls-report-cache.json')

type Entry = { report: CallsReport; fetchedAt: number }
export type CallsReportResult = Entry & { stale: boolean; refreshing: boolean; warning?: string }

let memory: Entry | null = null
let diskLoad: Promise<void> | null = null
let inflight: Promise<Entry> | null = null
let lastFailure: { at: number; message: string } | null = null

async function readDisk() {
  try {
    const parsed = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ CACHE_FILE, 'utf8'))
    if (parsed?.report?.dateGroups?.length && Number.isFinite(parsed.fetchedAt)) memory = parsed
  } catch {
    // No usable disk copy; the first request fetches upstream.
  }
}

async function writeDisk(entry: Entry) {
  try {
    const temp = `${CACHE_FILE}.${process.pid}.tmp`
    await fs.writeFile(/*turbopackIgnore: true*/ temp, JSON.stringify(entry))
    await fs.rename(/*turbopackIgnore: true*/ temp, CACHE_FILE)
  } catch {
    // Read-only or full disk: memory cache still works.
  }
}

async function fetchUpstream(): Promise<Entry> {
  const res = await fetch(UPSTREAM_URL, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Calls data source answered HTTP ${res.status}`)
  let json: any
  try {
    json = JSON.parse(await res.text())
  } catch {
    throw new Error('Calls data source returned an unreadable response')
  }
  if (!json || typeof json !== 'object' || !Object.keys(json).length) throw new Error('Calls data source returned no data')
  const report = buildCallsReport(json)
  if (!report.dateGroups.length) throw new Error('Calls data source returned no usable rows')
  return { report, fetchedAt: Date.now() }
}

function refresh(): Promise<Entry> {
  if (!inflight) {
    inflight = fetchUpstream()
      .then(async entry => {
        memory = entry
        lastFailure = null
        await writeDisk(entry)
        return entry
      })
      .catch(err => {
        lastFailure = { at: Date.now(), message: err instanceof Error ? err.message : 'Refresh failed' }
        throw err
      })
      .finally(() => { inflight = null })
  }
  return inflight
}

export async function getCallsReport(opts: { forceRefresh?: boolean } = {}): Promise<CallsReportResult> {
  diskLoad ||= readDisk()
  await diskLoad

  if (opts.forceRefresh) {
    try {
      const entry = await refresh()
      return { ...entry, stale: false, refreshing: false }
    } catch (err) {
      if (!memory) throw err
      return { ...memory, stale: true, refreshing: false, warning: `Could not refresh: ${lastFailure?.message}` }
    }
  }

  if (memory) {
    const stale = Date.now() - memory.fetchedAt > FRESH_MS
    const coolingDown = lastFailure && Date.now() - lastFailure.at < RETRY_COOLDOWN_MS
    if (stale && !inflight && !coolingDown) refresh().catch(err => console.warn('[calls-report] background refresh failed:', err?.message || err))
    return {
      ...memory,
      stale,
      refreshing: Boolean(inflight),
      warning: stale && lastFailure ? `Latest refresh failed: ${lastFailure.message}` : undefined,
    }
  }

  const entry = await refresh()
  return { ...entry, stale: false, refreshing: false }
}
