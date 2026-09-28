/**
 * Per-owner assignment notification email.
 *
 * Sent to each owner individually when ALL leads for the day have been assigned.
 * Also sent at 11:00 IST if the daily cron runs before everyone is done.
 *
 * Env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   MORNING_OWNER_NOTIFY_EMAILS  — JSON map of owner name → email address
 *     e.g. {"Riya Sharma":"riya@kairali.com","Sam K":"sam@kairali.com"}
 *   MORNING_ALLOCATION_CC        — optional CC for all owner emails
 */

import nodemailer from 'nodemailer'

export interface OwnerAssignmentNotification {
  ownerName: string
  ownerEmail: string
  leads: { id: string; name: string; mobile?: string; source?: string; status?: string }[]
  date: string // YYYY-MM-DD IST
  totalAssigned: number
  sentAt: string // ISO
}

export function renderOwnerNotifyEmail(data: OwnerAssignmentNotification): { subject: string; html: string } {
  const dateLabel = new Date(data.date + 'T00:00:00+05:30').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })

  const leadRows = data.leads.length > 0
    ? data.leads.map((l, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151">${l.id || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600">${l.name || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">${l.mobile || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">${l.source || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">
            <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${l.status === 'Overdue' ? '#fee2e2' : '#d1fae5'};color:${l.status === 'Overdue' ? '#b91c1c' : '#065f46'}">
              ${l.status || 'Pending'}
            </span>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="padding:14px;color:#9ca3af;text-align:center;font-size:13px">No leads found.</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;color:#111827">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0">
<tr><td>
  <table width="620" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 12px #0000001a;overflow:hidden;max-width:100%">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f4c35,#1a7a58);padding:28px 32px;color:#fff">
      <div style="font-size:11px;letter-spacing:2px;opacity:.75;margin-bottom:6px">KAIRALI CRM · DAILY ALLOCATION</div>
      <h1 style="margin:0;font-size:22px;font-weight:700">Your Leads for Today</h1>
      <div style="margin-top:6px;font-size:13px;opacity:.85">${dateLabel} · Morning Allocation</div>
    </td></tr>

    <!-- Greeting -->
    <tr><td style="padding:24px 32px 12px">
      <p style="margin:0;font-size:15px;color:#374151">
        Hi <strong>${data.ownerName}</strong>,
      </p>
      <p style="margin:10px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
        You have been assigned <strong style="color:#0f4c35">${data.totalAssigned} lead${data.totalAssigned !== 1 ? 's' : ''}</strong> for today's morning allocation.
        Please review and follow up as soon as possible.
      </p>
    </td></tr>

    <!-- Leads table -->
    <tr><td style="padding:0 32px 24px">
      <h2 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 10px">Your assigned leads</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">ID</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Name</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Mobile</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Source</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Status</th>
          </tr>
        </thead>
        <tbody>${leadRows}</tbody>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:0 32px 24px;text-align:center">
      <a href="https://staging-kairali-crm.vercel.app/morning-lead-allocation"
         style="display:inline-block;background:#0f4c35;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700">
        Open Allocation Page →
      </a>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af">
      Kairali CRM · Morning Allocation · ${dateLabel}<br>
      This email was sent automatically when your leads were assigned.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`

  return {
    subject: `[Kairali CRM] ${data.totalAssigned} lead${data.totalAssigned !== 1 ? 's' : ''} assigned to you — ${dateLabel}`,
    html,
  }
}

export interface OwnerNotifyResult {
  owner: string
  email: string
  sent: boolean
  error?: string
  messageId?: string
}

export async function dispatchOwnerNotifyEmails(
  owners: { name: string; leads: OwnerAssignmentNotification['leads'] }[],
  date: string,
): Promise<OwnerNotifyResult[]> {
  const emailMapRaw = process.env.MORNING_OWNER_NOTIFY_EMAILS || '{}'
  let emailMap: Record<string, string> = {}
  try { emailMap = JSON.parse(emailMapRaw) } catch { emailMap = {} }

  const ccRaw = process.env.MORNING_ALLOCATION_CC || ''
  const ccList = ccRaw.split(',').map(e => e.trim()).filter(Boolean)

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const smtpPort = parseInt(process.env.SMTP_PORT || '587')
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || ''
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || ''

  if (!smtpUser || !smtpPass) {
    return owners.map(o => ({ owner: o.name, email: emailMap[o.name] || '', sent: false, error: 'SMTP credentials not configured' }))
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  })

  const results: OwnerNotifyResult[] = []

  for (const o of owners) {
    const ownerEmail = emailMap[o.name] || ''
    if (!ownerEmail) {
      results.push({ owner: o.name, email: '', sent: false, error: 'No email configured for this owner' })
      continue
    }

    const notification: OwnerAssignmentNotification = {
      ownerName: o.name,
      ownerEmail,
      leads: o.leads,
      date,
      totalAssigned: o.leads.length,
      sentAt: new Date().toISOString(),
    }

    const { subject, html } = renderOwnerNotifyEmail(notification)

    try {
      const info = await transporter.sendMail({
        from: `"Kairali CRM Allocations" <${smtpUser}>`,
        to: ownerEmail,
        cc: ccList.length > 0 ? ccList.join(', ') : undefined,
        subject,
        html,
      })
      results.push({ owner: o.name, email: ownerEmail, sent: true, messageId: info.messageId })
    } catch (err) {
      results.push({ owner: o.name, email: ownerEmail, sent: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return results
}
