import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { dispatchDue } from '@/lib/email-triggers/dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

async function isAuthorizedCron(req: NextRequest): Promise<boolean> {
  const header = req.headers.get('authorization') || ''

  // 1. Primary: Standard Vercel CRON_SECRET authorization header
  const secret = process.env.CRON_SECRET
  if (secret && safeCompare(header, `Bearer ${secret}`)) {
    return true
  }

  // 2. Secondary: Local worker bearer key (for running scripts/email-trigger-worker.mjs locally)
  try {
    const root = path.join(process.cwd(), '.local/email-triggers')
    const localKey = (await readFile(path.join(root, 'worker.key'), 'utf8')).trim()
    if (localKey.length >= 32 && safeCompare(header, `Bearer ${localKey}`)) {
      return true
    }
  } catch {
    // Local key not present
  }

  return false
}

async function handleRequest(req: NextRequest) {
  const authorized = await isAuthorizedCron(req)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await dispatchDue()
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Worker could not obtain durable state; no unreserved sends allowed' },
      { status: 503 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req)
}

export async function POST(req: NextRequest) {
  return handleRequest(req)
}
