/**
 * Morning allocation snapshot email — template + dispatch.
 * Sent daily at 11:00 IST via the cron at /api/cron/morning-allocation-snapshot.
 *
 * Env vars used (shared with the sales-call-audit mailer):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   MORNING_ALLOCATION_TO  — comma-separated primary recipients (all owners + manager)
 *   MORNING_ALLOCATION_CC  — comma-separated CC
 */

import nodemailer from 'nodemailer'
import type { AssignmentSummary } from '@/lib/morning-lead-allocation'

function fmt(n: number): string {
  return n.toLocaleString('en-IN')
}

function overdueBar(pct: number): string {
  const w = Math.min(100, Math.round(pct))
  return `<div style="background:#f3f4f6;border-radius:4px;height:8px;width:160px;display:inline-block;vertical-align:middle">
    <div style="background:#dc2626;border-radius:4px;height:8px;width:${w}%"></div>
  </div>`
}

export function renderAllocationSnapshotEmail(summary: AssignmentSummary): { subject: string; html: string } {
  const dateLabel = new Date(summary.date + 'T00:00:00+05:30').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
  const overduePct = summary.totalLeads > 0 ? (summary.overdueLeads / summary.totalLeads) * 100 : 0

  const byOwnerRows = summary.byOwner.length > 0
    ? summary.byOwner.map((o) => `
        <tr>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb">${o.owner}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:center"><b>${fmt(o.assigned)}</b></td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${fmt(o.received)}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:10px;color:#6b7280;text-align:center">No assignments recorded today</td></tr>`

  const changeRows = summary.changes.length > 0
    ? summary.changes.map((c) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${c.time}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${c.leadId}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${c.leadName}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${c.fromOwner}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#15803d"><b>${c.toOwner}</b></td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280">${c.actor}</td>
        </tr>`).join('')
    : `<tr><td colspan="6" style="padding:10px;color:#6b7280;text-align:center">No owner transfers today</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;color:#111827">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0">
<tr><td>
  <table width="620" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 12px #0000001a;overflow:hidden;max-width:100%">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f4c35,#1a7a58);padding:28px 32px;color:#fff">
      <div style="font-size:11px;letter-spacing:2px;opacity:.75;margin-bottom:6px">KAIRALI CRM · DAILY OPERATIONS</div>
      <h1 style="margin:0;font-size:22px;font-weight:700">Morning Lead Allocation Snapshot</h1>
      <div style="margin-top:6px;font-size:13px;opacity:.85">${dateLabel} · Generated at 11:00 IST</div>
    </td></tr>

    <!-- Summary cards -->
    <tr><td style="padding:24px 32px 16px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="25%" style="padding-right:8px">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:#15803d">${fmt(summary.assignedLeads)}</div>
              <div style="font-size:11px;color:#166534;margin-top:2px">Assigned</div>
            </div>
          </td>
          <td width="25%" style="padding-right:8px">
            <div style="background:${summary.unassignedLeads > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${summary.unassignedLeads > 0 ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:${summary.unassignedLeads > 0 ? '#dc2626' : '#15803d'}">${fmt(summary.unassignedLeads)}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px">Unassigned</div>
            </div>
          </td>
          <td width="25%" style="padding-right:8px">
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:#c2410c">${fmt(summary.overdueLeads)}</div>
              <div style="font-size:11px;color:#9a3412;margin-top:2px">Overdue</div>
            </div>
          </td>
          <td width="25%">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:#334155">${fmt(summary.changes.length)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px">Transfers</div>
            </div>
          </td>
        </tr>
      </table>
      ${summary.overdueLeads > 0 ? `<div style="margin-top:12px;font-size:12px;color:#9a3412">
        Overdue rate: <b>${Math.round(overduePct)}%</b>&nbsp; ${overdueBar(overduePct)}
      </div>` : ''}
    </td></tr>

    <!-- Per-owner breakdown -->
    <tr><td style="padding:0 32px 20px">
      <h2 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 10px">Per-owner breakdown</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#6b7280">Owner</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#6b7280">Assigned</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#6b7280">Received Today</th>
          </tr>
        </thead>
        <tbody>${byOwnerRows}</tbody>
      </table>
    </td></tr>

    <!-- Transfer log -->
    <tr><td style="padding:0 32px 24px">
      <h2 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 10px">Today's owner transfers</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280">Time</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280">Lead ID</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280">Lead name</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280">From</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280">To</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280">By</th>
          </tr>
        </thead>
        <tbody>${changeRows}</tbody>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af">
      Kairali CRM · Morning Allocation Snapshot · ${dateLabel}<br>
      <a href="https://staging-kairali-crm.vercel.app/morning-lead-allocation" style="color:#15803d">Open allocation page</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`

  return {
    subject: `[Kairali CRM] Morning Allocation Snapshot — ${dateLabel} (${fmt(summary.assignedLeads)} assigned, ${fmt(summary.overdueLeads)} overdue)`,
    html,
  }
}

export interface AllocationEmailResult {
  smtpConfigured: boolean
  smtpDispatched: boolean
  smtpError?: string
  to: string[]
  cc: string[]
  messageId?: string
}

export async function dispatchAllocationSnapshotEmail(params: {
  subject: string
  html: string
  to?: string[]
  cc?: string[]
}): Promise<AllocationEmailResult> {
  const defaultTo =
    process.env.MORNING_ALLOCATION_TO ||
    process.env.AUDIT_REPORT_TO ||
    ''
  const defaultCc =
    process.env.MORNING_ALLOCATION_CC ||
    process.env.AUDIT_REPORT_CC ||
    ''

  const toList = params.to?.length
    ? params.to
    : defaultTo.split(',').map((e) => e.trim()).filter(Boolean)
  const ccList = params.cc?.length
    ? params.cc
    : defaultCc.split(',').map((e) => e.trim()).filter(Boolean)

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const smtpPort = parseInt(process.env.SMTP_PORT || '587')
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS

  if (!smtpUser || !smtpPass) {
    console.warn('[morning-allocation-email] SMTP credentials missing, failing closed')
    return { smtpConfigured: false, smtpDispatched: false, smtpError: 'SMTP credentials not configured', to: toList, cc: ccList }
  }

  if (toList.length === 0) {
    console.warn('[morning-allocation-email] No recipients configured (MORNING_ALLOCATION_TO is empty)')
    return { smtpConfigured: true, smtpDispatched: false, smtpError: 'No recipients configured', to: [], cc: ccList }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
    const info = await transporter.sendMail({
      from: `"Kairali CRM Allocations" <${smtpUser}>`,
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      subject: params.subject,
      html: params.html,
    })
    console.log('[morning-allocation-email] Dispatched:', info.messageId)
    return { smtpConfigured: true, smtpDispatched: true, messageId: info.messageId, to: toList, cc: ccList }
  } catch (err) {
    const smtpError = err instanceof Error ? err.message : String(err)
    console.error('[morning-allocation-email] SMTP error:', smtpError)
    return { smtpConfigured: true, smtpDispatched: false, smtpError, to: toList, cc: ccList }
  }
}
