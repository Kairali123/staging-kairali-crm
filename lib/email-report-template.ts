/** Only known report identifiers can select a renderer; URLs/HTML are never accepted as templates. */
export const emailReportTemplates = {
  'daily-sales-report': { name: 'Daily Sales Report Alert', path: '/sales/reports/daily-alert' },
  'marketing-daily-report': { name: 'Marketing Daily Report', path: '/marketing-daily-report' },
} as const
export type EmailReportId = keyof typeof emailReportTemplates
export function emailConfigHref(id: EmailReportId, scope: string, date: string) {
  return '/settings/automation/email-triggers?' + new URLSearchParams({ report: id, scope, date })
}
