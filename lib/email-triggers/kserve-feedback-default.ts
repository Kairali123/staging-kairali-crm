import { randomUUID } from 'node:crypto'
import { emailReportTemplates } from '../email-report-template'
import type { State } from './store'
import { localDay, nextRun } from './schedule'

export const KSERVE_FEEDBACK_REPORT_ID = 'kserve-daily-call-audit-feedback-alert' as const

export function seedKserveFeedbackTrigger(state: State, now = new Date()): boolean {
  if (
    state.triggers.some((t) => t.reportId === KSERVE_FEEDBACK_REPORT_ID) ||
    state.seedSuppressed?.includes(KSERVE_FEEDBACK_REPORT_ID) ||
    state.triggers.length >= 100
  ) {
    return false
  }

  const name = emailReportTemplates[KSERVE_FEEDBACK_REPORT_ID].name
  const startDay = localDay(now.getTime(), 'Asia/Kolkata')
  const scheduleCfg = {
    frequency: 'Hourly' as const,
    time: '09:00',
    custom: '09:00',
    interval: '1',
    weekday: 'Monday' as const,
    monthday: '1' as const,
    timezone: 'Asia/Kolkata' as const,
    start: startDay,
    end: '',
  }

  state.triggers.push({
    id: randomUUID(),
    revision: 1,
    name,
    reportId: KSERVE_FEEDBACK_REPORT_ID,
    source: name,
    template: name,
    department: 'Operations',
    company: 'All companies',
    to: 'shyam@unpod.ai, rakesh.shetty@kserve.co.in, benjamin.mohanty@kserve.co.in, fms.mis@kserve.co.in',
    cc: 'dme@kairali.com, sysadmin@kairali.com, developer4@kairali.com',
    bcc: '',
    subject: '[Kserve Call Audit Feedback] {{company_name}} · {{client_name}} (Rating: {{rating}}/5) — {{lead_id}}',
    body: '',
    bodyType: 'Full report in email body',
    intro: '',
    closing: '',
    period: 'Today',
    reportDetail: 'Full report',
    status: 'Active',
    ...scheduleCfg,
    attachment: 'None',
    mode: 'Same email to all recipients',
    condition: 'Only when data is available',
    retry: 'No retries',
    missed: 'Skip missed run',
    replyTo: 'sysadmin@kairali.com',
    owner: 'system',
    updatedAt: now.toISOString(),
    nextRun: nextRun(scheduleCfg, now.getTime()),
    lastResult: '—',
  })
  return true
}
