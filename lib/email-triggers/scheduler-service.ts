import { dispatchDue } from './dispatch'

declare global {
  var _emailScheduler: {
    timer: NodeJS.Timeout | null
    isTicking: boolean
    startedAt: string
  } | undefined
}

function getGlobal(): any {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof global !== 'undefined') return global
  return {}
}

export async function runEmailSchedulerTick(): Promise<{ processed: number; heartbeat: string }> {
  const now = Date.now()
  try {
    const result = await dispatchDue(now)
    return { processed: result?.processed ?? 0, heartbeat: new Date(now).toISOString() }
  } catch (err: any) {
    console.error('[Email Scheduler] Tick error:', err?.message || err)
    return { processed: 0, heartbeat: new Date(now).toISOString() }
  }
}

export function ensureEmailSchedulerRunning(): { running: boolean; started: boolean } {
  if (typeof window !== 'undefined' || process.env.VERCEL) {
    return { running: false, started: false }
  }

  const g = getGlobal()
  if (g._emailScheduler?.timer) {
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

  const TICK_INTERVAL_MS = 20000 // Tick every 20 seconds

  scheduler.timer = setIntervalFn(async () => {
    if (scheduler.isTicking) return
    scheduler.isTicking = true
    try {
      await runEmailSchedulerTick()
    } catch (e: any) {
      console.warn('[Email Scheduler] Background interval error:', e?.message || e)
    } finally {
      scheduler.isTicking = false
    }
  }, TICK_INTERVAL_MS)

  if (scheduler.timer && typeof scheduler.timer.unref === 'function') {
    scheduler.timer.unref()
  }

  g._emailScheduler = scheduler

  // Fire an immediate initial tick in the background
  setTimeout(() => {
    runEmailSchedulerTick().catch(e => {
      console.warn('[Email Scheduler] Initial tick error:', e?.message || e)
    })
  }, 1000)

  return { running: true, started: true }
}
