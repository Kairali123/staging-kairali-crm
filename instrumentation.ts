export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    try {
      const { ensureSchedulerRunning } = await import('@/lib/whatsapp-triggers/scheduler-service')
      ensureSchedulerRunning()
    } catch (e) {
      console.warn('[Instrumentation] Could not start whatsapp scheduler:', e)
    }
    // Pull the calls report into the server cache now, so the first person to open /calls/reports does not
    // wait out the slow upstream call. Fire and forget; set CALLS_REPORT_WARMUP=0 to disable.
    if (process.env.CALLS_REPORT_WARMUP !== '0') {
      import('@/lib/calls-report-cache')
        .then(m => m.getCallsReport())
        .catch(e => console.warn('[Instrumentation] Calls report warm-up skipped:', e instanceof Error ? e.message : e))
    }
  }
}
