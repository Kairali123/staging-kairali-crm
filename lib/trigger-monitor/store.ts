import { mkdir, readFile, writeFile, rename, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { emptyState, type MonitorState } from './model'
// A separate row in the existing atomic email state table: no schema migration or mirror writes.
const rowId = 2
const dbReady = () => Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)
function root() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw Error('Shared database storage is required')
  return process.env.TRIGGER_MONITOR_TEST_DIR || path.join(process.cwd(), '.local/trigger-monitor')
}
export async function readMonitor(): Promise<MonitorState> {
  if (dbReady()) {
    const { getPool } = await import('../db')
    const [rows] = await (await getPool()).query<import('mysql2').RowDataPacket[]>('SELECT state_json FROM email_trigger_state WHERE id = ?', [rowId])
    return rows[0] ? (typeof rows[0].state_json === 'string' ? JSON.parse(rows[0].state_json) : rows[0].state_json) : emptyState()
  }
  try { return JSON.parse(await readFile(path.join(root(), 'state.json'), 'utf8')) }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return emptyState(); throw e }
}
function prune(s: MonitorState) {
  s.executions = s.executions.filter(r => Date.parse(r.startedAt) > Date.now() - 30 * 86400000).sort((a,b) => a.startedAt.localeCompare(b.startedAt))
  if (s.executions.length > 50000) { s.truncatedBefore = s.executions[s.executions.length - 50000].startedAt; s.executions = s.executions.slice(-50000) }
}
export async function monitorTransaction<T>(fn: (s: MonitorState) => T): Promise<T> {
  if (dbReady()) {
    const { getPool } = await import('../db')
    const conn = await (await getPool()).getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute('INSERT IGNORE INTO email_trigger_state (id, state_json) VALUES (?, ?)', [rowId, JSON.stringify(emptyState())])
      const [rows] = await conn.query<import('mysql2').RowDataPacket[]>('SELECT state_json FROM email_trigger_state WHERE id = ? FOR UPDATE', [rowId])
      const s: MonitorState = typeof rows[0].state_json === 'string' ? JSON.parse(rows[0].state_json) : rows[0].state_json
      const result = fn(s); prune(s)
      await conn.execute('UPDATE email_trigger_state SET state_json = ? WHERE id = ?', [JSON.stringify(s), rowId])
      await conn.commit(); return result
    } catch (e) { await conn.rollback(); throw e } finally { conn.release() }
  }
  const dir = root(); await mkdir(dir, { recursive:true, mode:0o700 })
  const lock = path.join(dir, 'lock'); await mkdir(lock, { mode:0o700 })
  try {
    const s = await readMonitor(), result = fn(s); prune(s)
    const temp = path.join(dir, randomUUID()+'.tmp')
    await writeFile(temp, JSON.stringify(s), { mode:0o600 }); await rename(temp,path.join(dir,'state.json')); return result
  } finally { await rmdir(lock) }
}
