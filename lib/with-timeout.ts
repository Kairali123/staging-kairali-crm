// src/lib/with-timeout.ts
// Wraps any fetch/promise with a hard timeout so a stalled pipeline step
// fails with a clear message instead of spinning forever.

export class TimeoutError extends Error {
  constructor(step: string, ms: number) {
    super(`${step} timed out after ${Math.round(ms / 1000)}s. Please retry.`)
    this.name = 'TimeoutError'
  }
}

// ── Race a promise against a timeout ──────────────────────────────────────────
export function withTimeout<T>(
  promise: Promise<T>,
  ms:      number,
  step:    string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(step, ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

// ── fetch with timeout + AbortController (cancels the actual request) ──────────
export async function fetchWithTimeout(
  url:     string,
  options: RequestInit,
  ms:      number,
  step:    string,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err: any) {
    if (err.name === 'AbortError') throw new TimeoutError(step, ms)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ── Recommended per-step timeouts (ms) ────────────────────────────────────────
export const STEP_TIMEOUTS = {
  fetching:     30_000,    // participant fetch
  uploading:    600_000,   // 10 min — large files over slow connections
  transcribing: 300_000,   // 5 min — long audio
  processing:   120_000,   // 2 min — AI notes
  saving:       30_000,    // DB insert
  extracting:   120_000,   // 2 min — AI tasks
} as const
