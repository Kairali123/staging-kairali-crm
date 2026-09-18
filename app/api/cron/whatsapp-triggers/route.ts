import {NextRequest,NextResponse} from 'next/server'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {timingSafeEqual} from 'node:crypto'
import {readState,stateRoot,transaction} from '@/lib/whatsapp-triggers/store'
import {dispatchDue} from '@/lib/whatsapp-triggers/dispatch'
import {buildReportImage,renderJPEG} from '@/lib/whatsapp-triggers/render'
import {sendReport} from '@/lib/whatsapp-triggers/provider'
import {workerReady} from '@/lib/whatsapp-triggers/schedule'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=300
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

  // 2. Secondary: Local worker bearer key (scripts/whatsapp-trigger-worker.mjs)
  try {
    const localKey = (await readFile(path.join(stateRoot(), 'worker.key'), 'utf8')).trim()
    if (localKey.length >= 32 && safeCompare(header, `Bearer ${localKey}`)) {
      return true
    }
  } catch {
    // Local key not present
  }

  return false
}

async function handleCron(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  const authorized = await isAuthorizedCron(req)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  try {
    const state = await readState()
    let rendererOk = true
    if (!workerReady(state)) {
      try {
        await renderJPEG('<!doctype html><html><body style="background:white;padding:24px">WhatsApp renderer health check</body></html>')
      } catch (renderErr) {
        console.warn('WhatsApp renderer check warning:', renderErr instanceof Error ? renderErr.message : renderErr)
        // If Playwright/Edge is not installed in current environment, don't crash
        rendererOk = false
      }
    }
    await transaction(s => {
      s.heartbeat = new Date().toISOString()
      s.rendererReady = rendererOk
    })
    const result = await dispatchDue(Date.now(), { build: buildReportImage, send: sendReport })
    return NextResponse.json(result, { headers })
  } catch (error) {
    await transaction(s => { s.rendererReady = false }).catch(() => {})
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Worker or renderer unavailable. No unreserved sends allowed.' },
      { status: 503, headers }
    )
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req)
}

export async function POST(req: NextRequest) {
  return handleCron(req)
}
