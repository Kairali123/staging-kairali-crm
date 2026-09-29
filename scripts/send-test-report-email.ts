// Dev-only: build a report email with the real dispatch code and send it to ONE address.
// Never touches saved triggers, run history or their recipients (unlike saving a trigger locally,
// which dispatches every due trigger). Report data is read from the DB in .env.
//
//   npx tsx --env-file=.env scripts/send-test-report-email.ts <report-id> [you@kairali.com] [YYYY-MM-DD]
//
// report-id: daily-sales-report | ktahv-crr-process-report-alert | booking-pi-review-alert | ...
// No address = dry run: writes the HTML and attachments to ./tmp-email-preview/ without sending.
// Marketing with source-wise tables: prefix REPORT_DETAIL="Include source-wise details"
import { mkdir, writeFile } from 'node:fs/promises'
import nodemailer from 'nodemailer'
import { buildEmail } from '@/lib/email-triggers/dispatch'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import type { Trigger } from '@/lib/email-triggers/schema'

// Make the full-page screenshot fail like it does on Vercel, so the HTML + donut PNG path is exercised.
process.env.WHATSAPP_CHROMIUM_PATH ||= '/nonexistent-browser'

async function main() {
  const [reportId, to, date] = process.argv.slice(2)
  if (!reportId) throw Error('Usage: send-test-report-email.ts <report-id> [email] [YYYY-MM-DD]')
  const t = {
    id: 'local-test', name: 'Local test', reportId, company: 'All companies', to: to || '', cc: '', bcc: '',
    subject: `[TEST] ${reportId} | {{report_date}} | {{company_name}}`, body: '', bodyType: 'Full report in email body',
    intro: '', closing: '', period: date ? 'Selected date' : 'Yesterday', previewDate: date,
    reportDetail: process.env.REPORT_DETAIL || 'Full report',
  } as unknown as Trigger

  const email = await buildEmail(t, Date.now())
  console.log('hasData:', email.hasData, '| attachments:', (email.attachments || []).map((a: any) => a.cid).join(', ') || 'none')

  if (!to) {
    await mkdir('tmp-email-preview', { recursive: true })
    await writeFile('tmp-email-preview/email.html', email.html)
    for (const a of email.attachments || []) await writeFile(`tmp-email-preview/${a.filename}`, a.content)
    return console.log('Dry run: wrote tmp-email-preview/ (open email.html; cid: images only resolve in a mail client)')
  }
  const c = marketingMailConfig()
  if (!c.configured) throw Error('SMTP_USER / SMTP_PASSWORD missing in .env')
  const transport = nodemailer.createTransport({ host: c.host, port: c.port, secure: c.port === 465, auth: { user: c.user!, pass: c.pass! } })
  const r = await transport.sendMail({ from: c.user, to, subject: email.subject, html: email.html, attachments: email.attachments })
  console.log('Sent to', r.accepted.join(', '))
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })
