import { mkdir, readFile, rename, open, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Trigger, Run } from './schema'

export type State = { version: 1; triggers: Trigger[]; runs: Run[]; heartbeat?: string }

function hasDbConfig(): boolean {
  return Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)
}

export function stateRoot() {
  if (process.env.VERCEL && !hasDbConfig()) {
    throw Error('Shared persistent storage must be configured before hosted scheduling')
  }
  return path.join(process.cwd(), '.local/email-triggers')
}

export async function readState(): Promise<State> {
  if (hasDbConfig()) {
    try {
      const { getPool } = await import('../db')
      const pool = await getPool()
      const [rows] = await pool.query<any[]>(
        'SELECT state_json FROM email_trigger_state WHERE id = 1'
      )
      if (rows && rows.length > 0 && rows[0].state_json) {
        const val = rows[0].state_json
        return typeof val === 'string' ? JSON.parse(val) : val
      }
      return { version: 1, triggers: [], runs: [] }
    } catch (e: any) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        return { version: 1, triggers: [], runs: [] }
      }
      throw e
    }
  }

  try {
    return JSON.parse(await readFile(path.join(stateRoot(), 'state.json'), 'utf8'))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, triggers: [], runs: [] }
    throw e
  }
}

async function syncTabular(conn: any, state: State) {
  for (const t of state.triggers) {
    await conn.query(
      `INSERT INTO email_triggers (
        id, revision, name, report_id, source, template, department, company,
        to_recipients, cc_recipients, bcc_recipients, subject, body, body_type,
        intro, closing, period, preview_date, report_detail, status,
        frequency, schedule_time, custom_times, interval_hours, weekday, monthday,
        timezone, start_date, end_date, reply_to, owner, updated_at, next_run, last_result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        revision = VALUES(revision),
        name = VALUES(name),
        report_id = VALUES(report_id),
        source = VALUES(source),
        template = VALUES(template),
        department = VALUES(department),
        company = VALUES(company),
        to_recipients = VALUES(to_recipients),
        cc_recipients = VALUES(cc_recipients),
        bcc_recipients = VALUES(bcc_recipients),
        subject = VALUES(subject),
        body = VALUES(body),
        body_type = VALUES(body_type),
        intro = VALUES(intro),
        closing = VALUES(closing),
        period = VALUES(period),
        preview_date = VALUES(preview_date),
        report_detail = VALUES(report_detail),
        status = VALUES(status),
        frequency = VALUES(frequency),
        schedule_time = VALUES(schedule_time),
        custom_times = VALUES(custom_times),
        interval_hours = VALUES(interval_hours),
        weekday = VALUES(weekday),
        monthday = VALUES(monthday),
        timezone = VALUES(timezone),
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        reply_to = VALUES(reply_to),
        owner = VALUES(owner),
        updated_at = VALUES(updated_at),
        next_run = VALUES(next_run),
        last_result = VALUES(last_result)`,
      [
        t.id,
        t.revision || 1,
        t.name,
        t.reportId,
        t.source,
        t.template,
        t.department,
        t.company,
        t.to,
        t.cc || null,
        t.bcc || null,
        t.subject,
        t.body || null,
        t.bodyType,
        t.intro || null,
        t.closing || null,
        t.period,
        t.previewDate || null,
        t.reportDetail,
        t.status,
        t.frequency,
        t.time,
        t.custom || null,
        t.interval || null,
        t.weekday || null,
        t.monthday || null,
        t.timezone || 'Asia/Kolkata',
        t.start,
        t.end || null,
        t.replyTo || null,
        t.owner || 'system',
        new Date(t.updatedAt || Date.now()),
        t.nextRun || null,
        t.lastResult || '—',
      ]
    )
  }

  const recentRuns = (state.runs || []).slice(-50)
  for (const r of recentRuns) {
    await conn.query(
      `INSERT IGNORE INTO email_trigger_runs (
        id, trigger_id, name, scheduled_at, started_at, finished_at, status, detail, recipient_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.triggerId,
        r.name,
        r.scheduledAt,
        r.startedAt,
        r.finishedAt || null,
        r.status,
        r.detail,
        r.recipientCount || 0,
      ]
    )
  }
}

export async function transaction<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
  if (hasDbConfig()) {
    const { getPool } = await import('../db')
    const pool = await getPool()
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [rows] = await conn.query<any[]>(
        'SELECT state_json FROM email_trigger_state WHERE id = 1 FOR UPDATE'
      )
      let state: State = { version: 1, triggers: [], runs: [] }
      if (rows && rows.length > 0 && rows[0].state_json) {
        const val = rows[0].state_json
        state = typeof val === 'string' ? JSON.parse(val) : val
      }
      const result = await fn(state)
      state.runs = (state.runs || []).slice(-2000)
      const serialized = JSON.stringify(state)
      await conn.query(
        'INSERT INTO email_trigger_state (id, state_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)',
        [serialized]
      )

      try {
        await syncTabular(conn, state)
      } catch {
        // Tabular view synchronization is non-blocking
      }

      await conn.commit()
      return result
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }

  const root = stateRoot()
  await mkdir(root, { recursive: true, mode: 0o700 })
  const lock = path.join(root, 'lock')
  try {
    await mkdir(lock, { mode: 0o700 })
  } catch {
    throw Error('Configuration busy; retry shortly. A persistent lock needs operator review.')
  }
  try {
    const state = await readState()
    const result = await fn(state)
    state.runs = state.runs.slice(-2000)
    const temp = path.join(root, randomUUID() + '.tmp')
    const file = await open(temp, 'wx', 0o600)
    try {
      await file.writeFile(JSON.stringify(state))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path.join(root, 'state.json'))
    return result
  } finally {
    await rmdir(lock)
  }
}
