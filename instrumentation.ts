export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    try {
      const { ensureSchedulerRunning } = await import('@/lib/whatsapp-triggers/scheduler-service')
      ensureSchedulerRunning()
    } catch (e) {
      console.warn('[Instrumentation] Could not start whatsapp scheduler:', e)
    }
  }
}
