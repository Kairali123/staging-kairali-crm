import { randomUUID } from 'node:crypto'
import { emailReportTemplates } from '../email-report-template'
import type { State } from './store'

export function seedTriggerHealthDraft(state: State, now = new Date()) {
  const reportId = 'trigger-health-digest'
  if (state.triggers.some(t => t.reportId === reportId) || state.seedSuppressed?.includes(reportId) || state.triggers.length >= 100) return false
  const name = emailReportTemplates[reportId].name
  state.triggers.push({
    id: randomUUID(), revision: 1, name, reportId, source: name, template: name,
    department: 'IT', company: 'All companies', to: '', cc: '', bcc: '',
    subject: '[Trigger Health] Daily failures and status — {{report_date}}',
    body: '', bodyType: 'Full report in email body', intro: '', closing: '',
    period: 'Today', reportDetail: 'Full report', status: 'Draft',
    frequency: 'Daily', time: '09:00', custom: '09:00', interval: '6',
    weekday: 'Monday', monthday: '1', timezone: 'Asia/Kolkata',
    start: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), end: '',
    attachment: 'None', mode: 'Same email to all recipients', condition: 'Always send',
    retry: 'No retries', missed: 'Skip missed run', replyTo: '', owner: 'system',
    updatedAt: now.toISOString(), nextRun: null, lastResult: '—',
  })
  return true
}
