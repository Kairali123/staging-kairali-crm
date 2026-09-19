import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (secret && safeCompare(header, `Bearer ${secret}`)) return true
  try {
    const root = path.join(process.cwd(), '.local/email-triggers')
    const localKey = (await readFile(path.join(root, 'worker.key'), 'utf8')).trim()
    if (localKey.length >= 32 && safeCompare(header, `Bearer ${localKey}`)) return true
  } catch {}
  return false
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const employees: unknown[] = body?.employees
    if (!Array.isArray(employees)) {
      return NextResponse.json({ error: 'employees array required' }, { status: 400 })
    }
    const pool = await getPool()
    // Auto-create table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calling_employee_snapshot (
        id INT NOT NULL DEFAULT 1 PRIMARY KEY,
        captured_at DATETIME NOT NULL,
        employees JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    await pool.query(
      `INSERT INTO calling_employee_snapshot (id, captured_at, employees)
       VALUES (1, NOW(), ?)
       ON DUPLICATE KEY UPDATE captured_at = NOW(), employees = VALUES(employees)`,
      [JSON.stringify(employees)]
    )
    return NextResponse.json({ ok: true, count: employees.length })
  } catch (err) {
    console.error('[calling-snapshot] error:', err)
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 })
  }
}
