import { randomUUID } from 'node:crypto'
import { emailReportTemplates } from '../email-report-template'
import type { State } from './store'
import { localDay, nextRun } from './schedule'

export const AI_CHAT_WEEKLY_REPORT_ID = 'ai-chat-weekly-report' as const

export function seedAiChatWeeklyTrigger(state: State, now = new Date()): boolean {
  if (
    state.triggers.some((t) => t.reportId === AI_CHAT_WEEKLY_REPORT_ID) ||
    state.seedSuppressed?.includes(AI_CHAT_WEEKLY_REPORT_ID) ||
    state.triggers.length >= 100
  ) {
    return false
  }

  const templateName = emailReportTemplates[AI_CHAT_WEEKLY_REPORT_ID].name
  const startDay = localDay(now.getTime(), 'Asia/Kolkata')
  const scheduleCfg = {
    frequency: 'Weekly' as const,
    time: '09:00',
    custom: '09:00',
    interval: '6',
    weekday: 'Monday' as const,
    monthday: '1' as const,
    timezone: 'Asia/Kolkata' as const,
    start: startDay,
    end: '',
  }

  state.triggers.push({
    id: randomUUID(),
    revision: 1,
    name: `${templateName} · Scheduled email`,
    reportId: AI_CHAT_WEEKLY_REPORT_ID,
    source: templateName,
    template: templateName,
    department: 'Marketing',
    company: 'All companies',
    to: 'director@kairali.com',
    cc: 'seo@ktahv.com, mkt@ktahv.com, ho.mkt@kairaliproducts.com, digital@kairali.com, sysadmin@kairali.com',
    bcc: '',
    subject:
      'AI Chat Weekly Consolidated Report — Chats, Enquiries & Conversions | {{report_date}} | {{company_name}}',
    body: '',
    bodyType: 'Full report in email body',
    intro:
      'Dear Management & Team,\n\nPlease find below the consolidated Weekly AI Chat Performance Report across all companies (KTAHV, KAPPL, Villa Raag, KATC) and all 5 AI chat assistants (Priya Sharma Chat, Product Priya Sharma, VillaRaag Anjali Menon, Dr. Aarika, and Riya Sharma).',
    closing: 'Regards,\nKairali CRM Automation',
    period: 'Yesterday',
    reportDetail: 'Full report',
    status: 'Active',
    ...scheduleCfg,
    attachment: 'None',
    mode: 'Same email to all recipients',
    condition: 'Always send',
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
