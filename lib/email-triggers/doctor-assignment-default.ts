import { randomUUID } from 'node:crypto'
import { emailReportTemplates } from '../email-report-template'
import { DOCTOR_REPORT_ID } from './doctor-assignment'
import type { State } from './store'
import { localDay } from './schedule'

export function seedDoctorAssignmentDraft(state: State, now = new Date()) {
  if (state.triggers.some(t => t.reportId === DOCTOR_REPORT_ID) || state.seedSuppressed?.includes(DOCTOR_REPORT_ID) || state.triggers.length >= 100) return false
  const name = emailReportTemplates[DOCTOR_REPORT_ID].name
  state.triggers.push({
    id: randomUUID(), revision: 1, name, reportId: DOCTOR_REPORT_ID, source: name, template: name,
    department: 'Doctor', company: 'KTAHV', to: 'doctor@ktahv.com',
    cc: 'dme@kairali.com, gm.hv@kairali.com, sysadmin@kairali.com', bcc: '',
    subject: 'Client Assigned to Doctor Reports | {{report_date}}',
    body: '', bodyType: 'Full report in email body', intro: '', closing: '',
    period: 'Today', reportDetail: 'Full report', status: 'Paused',
    frequency: 'Daily', time: '09:30', custom: '09:30', interval: '6',
    weekday: 'Monday', monthday: '1', timezone: 'Asia/Kolkata', start: localDay(now.getTime(), 'Asia/Kolkata'), end: '',
    attachment: 'None', mode: 'Same email to all recipients', condition: 'Only when data is available',
    retry: 'No retries', missed: 'Skip missed run', replyTo: '', owner: 'system',
    updatedAt: now.toISOString(), nextRun: null, lastResult: 'Cutover pending: disable legacy sender before activating CRM',
  })
  return true
}
