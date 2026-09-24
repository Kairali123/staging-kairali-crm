import { mkdir, readFile, rename, open, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Config } from './schema'

export type Run = {
  id: string
  triggerId: string
  triggerName?: string
  startedAt: string
  status: 'Preparing' | 'Sending' | 'Accepted' | 'Failed' | 'Unknown' | 'Skipped' | 'Partial'
  messageId?: string
  scheduledAt?: string
  detail?: string
  templateName?: string
  templateLink?: string
  recipients?: {
    to: string
    status: 'Pending' | 'Sending' | 'Accepted' | 'Unknown' | 'Skipped'
    messageId?: string
  }[]
}

export type State = {
  version: 1
  triggers: Config[]
  runs: Run[]
  heartbeat?: string
  rendererReady?: boolean
}

function hasDbConfig(): boolean {
  return Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)
}

export function stateRoot() {
  if (process.env.VERCEL && !hasDbConfig()) {
    throw Error('Persistent WhatsApp storage is not configured for this deployment')
  }
  return path.join(process.cwd(), '.local/whatsapp-triggers')
}

export async function readState(): Promise<State> {
  if (hasDbConfig()) {
    try {
      const { getPool } = await import('../db')
      const pool = await getPool()
      const [rows] = await pool.query<any[]>(
        'SELECT state_json FROM whatsapp_trigger_state WHERE id = 1'
      )
      if (rows && rows.length > 0 && rows[0].state_json) {
        const val = rows[0].state_json
        const parsed: State = typeof val === 'string' ? JSON.parse(val) : val
        for (const t of parsed.triggers || []) {
          if (!t.period) (t as any).period = 'Today'
        }
        return parsed
      }
      return { version: 1, triggers: [], runs: [] }
    } catch (e: any) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        try {
          const { getPool } = await import('../db')
          const pool = await getPool()
          await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_trigger_state (
              id INT PRIMARY KEY,
              state_json LONGTEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `)
        } catch {}
        return { version: 1, triggers: [], runs: [] }
      }
      throw e
    }
  }

  try {
    const raw = JSON.parse(await readFile(path.join(stateRoot(), 'state.json'), 'utf8'))
    for (const t of raw.triggers || []) {
      if (!t.period) (t as any).period = 'Today'
    }
    return raw
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, triggers: [], runs: [] }
    throw e
  }
}

export async function transaction<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
  if (hasDbConfig()) {
    const { getPool } = await import('../db')
    const pool = await getPool()
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_trigger_state (
          id INT PRIMARY KEY,
          state_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `)
      const [rows] = await conn.query<any[]>(
        'SELECT state_json FROM whatsapp_trigger_state WHERE id = 1 FOR UPDATE'
      )
      let state: State = { version: 1, triggers: [], runs: [] }
      if (rows && rows.length > 0 && rows[0].state_json) {
        const val = rows[0].state_json
        state = typeof val === 'string' ? JSON.parse(val) : val
      } else {
        try {
          const localData = JSON.parse(await readFile(path.join(process.cwd(), '.local/whatsapp-triggers/state.json'), 'utf8'))
          if (localData && Array.isArray(localData.triggers) && localData.triggers.length > 0) {
            state = localData
          }
        } catch {}
      }
      for (const t of state.triggers || []) {
        if (!t.period) (t as any).period = 'Today'
      }
      const result = await fn(state)
      state.runs = (state.runs || []).slice(-2000)
      const serialized = JSON.stringify(state)
      await conn.query(
        'INSERT INTO whatsapp_trigger_state (id, state_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)',
        [serialized]
      )
      await conn.commit()
      return result
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }

  const dir = stateRoot()
  await mkdir(dir, { recursive: true, mode: 0o700 })
  const lock = path.join(dir, 'lock')
  try {
    await mkdir(lock, { mode: 0o700 })
  } catch {
    throw Error('Configuration busy. Retry after the current operation finishes.')
  }
  try {
    const state = await readState()
    const result = await fn(state)
    const temp = path.join(dir, randomUUID() + '.tmp')
    const file = await open(temp, 'wx', 0o600)
    try {
      await file.writeFile(JSON.stringify(state))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path.join(dir, 'state.json'))
    return result
  } finally {
    await rmdir(lock)
  }
}
