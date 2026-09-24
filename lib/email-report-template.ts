/** Only known report identifiers can select a renderer; URLs/HTML are never accepted as templates. */
export const emailReportTemplates = {
  'daily-sales-report': { name: 'Daily Sales Report Alert', path: '/sales/reports/daily-alert' },
  'marketing-daily-report': { name: 'Marketing Daily Report', path: '/marketing-daily-report' },
  'sales-call-audit': { name: 'Daily Call Audit Pass/Fail Report Email Template', path: '/sales-call-audit/email-template' },
  'ktahv-crr-process-report-alert': { name: 'KTAHV CRR Process Report Alert', path: '/ktahv-crr-process-report-alert' },
  'kserve-lead-lost-alert': { name: 'KServe Lead Lost Alert', path: '/voicecall/kserve-lead-lost' },
} as const
export type EmailReportId = keyof typeof emailReportTemplates
/** Names this report was saved under before it was renamed; still accepted and shown under the current name. */
export const legacyTemplateNames: Record<string, EmailReportId> = { 'Daily HR Email Template': 'sales-call-audit', 'Sales Call Audit Report': 'sales-call-audit' }
export function canonicalTemplateName(name: string) {
  const id = Object.hasOwn(legacyTemplateNames, name) ? legacyTemplateNames[name] : undefined
  return id ? emailReportTemplates[id].name : name
}
export function emailConfigHref(id: EmailReportId, scope: string, date: string) {
  return '/settings/automation/email-triggers?' + new URLSearchParams({ report: id, scope, date })
}
