import { readState, transaction } from './store'
import { dispatchDue } from './dispatch'
import { buildReportImage } from './render'
import { sendReport } from './provider'
import { workerReady } from './schedule'

declare global {
  var _whatsappScheduler: {
    timer: NodeJS.Timeout | null
    isTicking: boolean
    startedAt: string
  } | undefined
}

export async function runSchedulerTick(): Promise<{ processed: number; heartbeat: string }> {
  const now = Date.now()
  let rendererOk = true

  try {
    const state = await readState()
    if (!workerReady(state, now)) {
      try {
        const { renderJPEG } = await import('./render')
        await renderJPEG('<!doctype html><html><body style="background:white;padding:24px">Scheduler tick health check</body></html>')
      } catch (renderErr) {
        console.warn('[WhatsApp Scheduler] Renderer check warning:', renderErr instanceof Error ? renderErr.message : renderErr)
        rendererOk = false
      }
    }

    await transaction(s => {
      s.heartbeat = new Date(now).toISOString()
      s.rendererReady = rendererOk
    })

    const result = await dispatchDue(now, { build: buildReportImage, send: sendReport })
    return { processed: result.processed, heartbeat: new Date(now).toISOString() }
  } catch (err: any) {
    console.error('[WhatsApp Scheduler] Tick error:', err?.message || err)
    return { processed: 0, heartbeat: new Date(now).toISOString() }
  }
}

function getGlobal(): any {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof global !== 'undefined') return global
  return {}
}

export function ensureSchedulerRunning(): { running: boolean; started: boolean } {
  if (typeof window !== 'undefined') {
    return { running: false, started: false }
  }

  const g = getGlobal()
  if (g._whatsappScheduler?.timer) {
    return { running: true, started: false }
  }

  const setIntervalFn = typeof setInterval !== 'undefined' ? setInterval : (typeof g.setInterval === 'function' ? g.setInterval : null)
  if (!setIntervalFn) {
    return { running: false, started: false }
  }

  const scheduler = {
    timer: null as NodeJS.Timeout | null,
    isTicking: false,
    startedAt: new Date().toISOString(),
  }

  const TICK_INTERVAL_MS = 30000 // Tick every 30 seconds

  scheduler.timer = setIntervalFn(async () => {
    if (scheduler.isTicking) return
    scheduler.isTicking = true
    try {
      await runSchedulerTick()
    } catch (e: any) {
      console.warn('[WhatsApp Scheduler] Background interval error:', e?.message || e)
    } finally {
      scheduler.isTicking = false
    }
  }, TICK_INTERVAL_MS)

  // Unref timer so it doesn't block graceful Node shutdown
  if (scheduler.timer && typeof scheduler.timer.unref === 'function') {
    scheduler.timer.unref()
  }

  g._whatsappScheduler = scheduler

  // Fire an immediate initial tick in the background
  setTimeout(() => {
    runSchedulerTick().catch(e => {
      console.warn('[WhatsApp Scheduler] Initial tick error:', e?.message || e)
    })
  }, 1000)

  return { running: true, started: true }
}
