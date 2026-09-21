import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSessionUser } from '@/lib/authz'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import { triggerSchema } from '@/lib/email-triggers/schema'
import { readState, transaction } from '@/lib/email-triggers/store'
import { removeTrigger, auditSeedSuppressed, TriggerDeleteError } from '@/lib/email-triggers/delete'
import { nextRun } from '@/lib/email-triggers/schedule'
import { emailReportTemplates, canonicalTemplateName } from '@/lib/email-report-template'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'private, no-store' }

function authorized(req: NextRequest) {
  const u = getSessionUser(req)
  if (!u) return null
  const r = String(u.role || '').trim().toLowerCase()
  return (r === 'super_admin' || r === 'super admin') ? u : null
}

function isWorkerReady(heartbeat?: string): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  if (process.env.VERCEL) {
    // In hosted environment, Vercel Cron is configured via CRON_SECRET.
    // Or if a heartbeat occurred within the past 24 hours.
    if (process.env.CRON_SECRET) return true
    return Boolean(heartbeat && Date.now() - Date.parse(heartbeat) < 24 * 60 * 60 * 1000)
  }
  // Local/server environment: if heartbeat ticked within 24 hours or worker is running
  return Boolean(heartbeat && Date.now() - Date.parse(heartbeat) < 24 * 60 * 60 * 1000)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Administrator access required' }, { status: 403, headers })
  try {
    let state = await readState()
    if (!state.triggers.some(t => t.reportId === 'sales-call-audit') && !auditSeedSuppressed(state)) {
      try {
        state = await transaction(s => {
          if (!s.triggers.some(t => t.reportId === 'sales-call-audit')) {
            const now = Date.now()
            s.triggers.push({
              id: randomUUID(),
              revision: 1,
              name: emailReportTemplates['sales-call-audit'].name,
              reportId: 'sales-call-audit',
              source: emailReportTemplates['sales-call-audit'].name,
              template: emailReportTemplates['sales-call-audit'].name,
              department: 'HR',
              company: 'All companies',
              to: 'ho.hr@kairali.com',
              cc: '',
              bcc: '',
              subject: '[Daily HR Quality Audit Report] - Agent-wise Call Audit ({{report_date}})',
              body: 'Hi HR Team,\n\nPlease find below the daily call audit outcome. Employees marked FAIL require a half-day attendance adjustment for the audit date ({{report_date}}), subject to final HR verification.\n\nRegards,\nIT Audit Team',
              bodyType: 'Full report in email body',
              intro: '',
              closing: '',
              period: 'Yesterday',
              reportDetail: 'Full report',
              status: 'Active',
              frequency: 'Daily',
              time: '09:00',
              custom: '09:00, 13:30, 18:00',
              interval: '6',
              weekday: 'Monday',
              monthday: '1',
              timezone: 'Asia/Kolkata',
              start: new Date(now).toISOString().slice(0, 10),
              end: '',
              attachment: 'None',
              mode: 'Same email to all recipients',
              condition: 'Only when data is available',
              retry: 'No retries',
              missed: 'Skip missed run',
              replyTo: '',
              owner: 'system',
              updatedAt: new Date(now).toISOString(),
              nextRun: nextRun({
                frequency: 'Daily',
                time: '09:00',
                custom: '09:00, 13:30, 18:00',
                interval: '6',
                weekday: 'Monday',
                monthday: '1',
                timezone: 'Asia/Kolkata',
                start: new Date(now).toISOString().slice(0, 10),
                end: '',
              } as any, now),
              lastResult: '—',
            })
          }
          return s
        })
      } catch (err) {
        console.warn('[email-trigger-config] Auto-seed sales-call-audit skipped:', err)
      }
    }
    if (!process.env.VERCEL) {
      try {
        const { ensureEmailSchedulerRunning } = await import('@/lib/email-triggers/scheduler-service')
        ensureEmailSchedulerRunning()
      } catch (err) {
        console.warn('[email-trigger-config] Scheduler service start skipped:', err)
      }
    }
    // Triggers saved under a previous template name are shown under the current one.
    const triggers = state.triggers.map(t => ({ ...t, source: canonicalTemplateName(t.source) as typeof t.source, template: canonicalTemplateName(t.template) }))
    return NextResponse.json({
      ...state,
      triggers,
      smtpReady: marketingMailConfig().configured,
      workerReady: isWorkerReady(state.heartbeat),
      sender: marketingMailConfig().user || '',
    }, { headers })
  } catch {
    return NextResponse.json({ error: 'Persistent storage unavailable on this server' }, { status: 503, headers })
  }
}

export async function POST(req: NextRequest) {
  const user = authorized(req)
  if (!user) return NextResponse.json({ error: 'Administrator access required' }, { status: 403, headers })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403, headers })

  try {
    const raw = await req.text()
    if (raw.length > 35000) return NextResponse.json({ error: 'Configuration too large' }, { status: 413, headers })
    const parsed = triggerSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(x => x.message).join('; ') }, { status: 400, headers })
    const input = parsed.data

    const saved = await transaction(s => {
      const previous = input.id ? s.triggers.find(x => x.id === input.id) : undefined
      if (input.id && (!previous || (input.revision !== undefined && input.revision !== previous.revision))) {
        throw Error('Configuration changed. Reload before saving.')
      }
      if (input.status === 'Active' && (!marketingMailConfig().configured || !isWorkerReady(s.heartbeat))) {
        throw Error('SMTP and background worker must be ready before activating')
      }
      if (s.triggers.length >= 100 && !previous) throw Error('Maximum 100 triggers')
      const item = {
        ...input,
        id: previous?.id || randomUUID(),
        revision: (previous?.revision || 0) + 1,
        owner: String(user.id),
        updatedAt: new Date().toISOString(),
        nextRun: input.status === 'Active' ? nextRun(input, Date.now()) : null,
        lastResult: previous?.lastResult || '—',
      }
      s.triggers = previous ? s.triggers.map(x => x.id === item.id ? item : x) : [...s.triggers, item]
      return item
    })

    if (saved.status === 'Active' && !process.env.VERCEL) {
      try {
        const { ensureEmailSchedulerRunning, runEmailSchedulerTick } = await import('@/lib/email-triggers/scheduler-service')
        ensureEmailSchedulerRunning()
        setTimeout(() => { runEmailSchedulerTick().catch(() => {}) }, 500)
      } catch (err) {
        console.warn('[email-trigger-config] Post-save scheduler trigger skipped:', err)
      }
    }

    return NextResponse.json({ trigger: saved }, { headers })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to save configuration' }, { status: 400, headers })
  }
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Administrator access required' }, { status: 403, headers })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403, headers })

  const id = req.nextUrl.searchParams.get('id') || ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid trigger id' }, { status: 400, headers })
  const rev = req.nextUrl.searchParams.get('revision')
  const revision = rev !== null && /^\d+$/.test(rev) ? Number(rev) : undefined

  try {
    const removed = await transaction(s => removeTrigger(s, id, revision))
    return NextResponse.json({ deleted: removed.id, name: removed.name }, { headers })
  } catch (e) {
    const status = e instanceof TriggerDeleteError ? e.status : 400
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to delete trigger' }, { status, headers })
  }
}
