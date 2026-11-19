/**
 * Kserve Daily call Audit Feedback Alert Email Template
 *
 * Short, compact, easy-view email template for individual call audit feedback
 * submitted from /voicecall/data/received.
 *
 * One feedback = one separate email to the KServe team (no repeat).
 * 100% inline CSS, table-based layout, lightweight, mobile-friendly.
 */

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  )
}

export interface KserveFeedbackItem {
  rowId: number
  leadId: string
  initialId?: string | null
  clientName?: string | null
  mobile?: string | null
  email?: string | null
  company?: string | null
  companyByKserve?: string | null
  websiteName?: string | null
  dataSource?: string | null
  callStatus?: string | null
  finalCallStatus?: string | null
  callOutcome?: string | null
  finalLeadOutcome?: string | null
  callDuration?: string | null
  callStartTime?: string | null
  transcriptionViewUrl?: string | null
  ivrUrl?: string | null
  aiCallSummary?: string | null
  feedbackDate?: string | null
  rating: number
  comment: string
  submittedByName?: string | null
  submittedByEmail?: string | null
  submittedById?: string | null
}

function renderStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

function ratingPalette(rating: number): { bg: string; border: string; text: string; badgeBg: string; label: string } {
  if (rating <= 2) {
    return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badgeBg: '#dc2626', label: 'Needs Attention' }
  }
  if (rating === 3) {
    return { bg: '#fffbeb', border: '#fde68a', text: '#92400e', badgeBg: '#d97706', label: 'Average' }
  }
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badgeBg: '#16a34a', label: 'Good' }
}

function formatDisplayDate(raw?: string | null): string {
  if (!raw) return '—'
  const s = String(raw).trim()
  if (!s) return '—'
  const parsed = Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + '+05:30')
  if (Number.isNaN(parsed)) return s
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(parsed)) + ' IST'
  } catch {
    return s
  }
}

function truncate(text: string | null | undefined, maxLen = 220): string {
  const clean = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  return clean.length > maxLen ? clean.slice(0, maxLen - 1).trimEnd() + '…' : clean
}

export function getSampleKserveFeedback(): KserveFeedbackItem {
  return {
    rowId: 140123,
    leadId: 'FB_AHV-1374404374786286-Tf35870478edb11f19438020017011b17',
    initialId: 'FB_AHV-1374404374786286',
    clientName: 'Goenka Arun',
    mobile: '+91 9830322592',
    email: 'arunggoenka@gmail.com',
    company: 'KTAHV',
    companyByKserve: 'Kairali The Ayurvedic Healing Village',
    websiteName: 'KServe API Outcomes',
    dataSource: 'KTAHV - FB Paid Lead API',
    callStatus: 'completed',
    finalCallStatus: 'Not Interested',
    callOutcome: 'Follow-up Needed',
    finalLeadOutcome: 'Not Interested',
    callDuration: '00:02:03',
    callStartTime: '2026-08-03 10:46:27',
    transcriptionViewUrl: '',
    ivrUrl: '',
    aiCallSummary:
      'Client is looking for weight management and detox programs and is open to teleconsultation.',
    feedbackDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    rating: 1,
    comment: 'Late replies from AI. AI spoke in Hinglish instead of Hindi.',
    submittedByName: 'Rohan Babbar',
    submittedByEmail: 'digital@kairali.com',
    submittedById: '13',
  }
}

export function buildKserveFeedbackSubject(
  subjectTemplate: string,
  item: KserveFeedbackItem,
  reportDate: string,
  fallbackCompany = 'All companies'
): string {
  const company = (item.company || fallbackCompany || 'Kairali').trim()
  const client = (item.clientName || item.mobile || 'Voice Lead').trim()
  const rating = String(item.rating || 0)
  const submittedBy = (item.submittedByName || item.submittedByEmail || 'Audit Team').trim()
  const shortLeadId = item.leadId.length > 36 ? item.leadId.slice(0, 36) : item.leadId

  let rendered = (subjectTemplate || '[Kserve Call Audit Feedback] {{company_name}} · {{client_name}} (Rating: {{rating}}/5) — {{lead_id}}')
    .replaceAll('{{report_date}}', reportDate)
    .replaceAll('{{company_name}}', company)
    .replaceAll('{{client_name}}', client)
    .replaceAll('{{rating}}', rating)
    .replaceAll('{{lead_id}}', shortLeadId)
    .replaceAll('{{submitted_by}}', submittedBy)
    .replaceAll('{{recipient_name}}', 'KServe Team')

  // Ensure each individual feedback email has a distinct subject even if custom subject omitted {{lead_id}}
  if (!subjectTemplate.includes('{{lead_id}}') && !rendered.includes(shortLeadId)) {
    rendered = `${rendered} · ${client} (${rating}/5)`
  }
  return rendered.slice(0, 240)
}

export function buildKserveFeedbackAlertEmail(
  item: KserveFeedbackItem,
  appUrl = 'https://staging-kairali-crm.vercel.app'
): string {
  const cleanAppUrl = appUrl.replace(/\/+$/, '')
  const company = item.company || item.companyByKserve || 'Kairali'
  const clientName = item.clientName || '—'
  const mobile = item.mobile || '—'
  const outcome = item.finalLeadOutcome || item.finalCallStatus || item.callOutcome || item.callStatus || '—'
  const duration = item.callDuration || '—'
  const source = item.dataSource || item.websiteName || 'KServe Voice AI'
  const submittedBy = item.submittedByName
    ? `${item.submittedByName}${item.submittedByEmail ? ` (${item.submittedByEmail})` : ''}`
    : item.submittedByEmail || 'CRM User'
  const feedbackTime = formatDisplayDate(item.feedbackDate)
  const summary = truncate(item.aiCallSummary, 220)
  const palette = ratingPalette(item.rating)
  const stars = renderStars(item.rating)
  const crmUrl = `${cleanAppUrl}/voicecall/data/received?search=${encodeURIComponent(item.leadId)}`
  const hasRecording = Boolean(item.ivrUrl && /^https?:\/\//i.test(item.ivrUrl))
  const hasTranscript = Boolean(item.transcriptionViewUrl && /^https?:\/\//i.test(item.transcriptionViewUrl))

  const preheader = `Rating ${item.rating}/5 · ${company} · ${clientName} (${mobile}) — ${truncate(item.comment, 90)}`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Kserve Daily call Audit Feedback Alert · ${esc(clientName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:#1e293b;line-height:1.45;">

  <!-- Hidden Inbox Preheader -->
  <div style="display:none;font-size:1px;color:#f4f6f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${esc(preheader)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!--email-intro-->

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f6f9;width:100%;margin:0;padding:14px 8px;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:8px;overflow:hidden;margin:0 auto;text-align:left;">
          <tr>
            <td style="padding:16px 20px 14px 20px;">

              <!-- Compact Header -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <span style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.4px;vertical-align:middle;margin-right:6px;">
                      Call Audit Feedback
                    </span>
                    <span style="display:inline-block;background-color:${palette.badgeBg};color:#ffffff;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:4px;vertical-align:middle;">
                      ★ ${item.rating}/5 · ${esc(palette.label)}
                    </span>
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:11px;color:#64748b;white-space:nowrap;padding-left:8px;">
                    ${esc(feedbackTime)}
                  </td>
                </tr>
              </table>

              <div style="font-size:16px;font-weight:bold;color:#0f172a;margin:0 0 12px 0;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
                Kserve Daily call Audit Feedback Alert
              </div>

              <!-- Highlighted Feedback Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${palette.bg};border:1px solid ${palette.border};border-radius:6px;margin-bottom:12px;">
                <tr>
                  <td style="padding:11px 14px;">
                    <div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:${palette.text};margin-bottom:4px;">
                      Auditor Feedback &nbsp;·&nbsp; <span style="font-size:14px;letter-spacing:1px;">${stars}</span> (${item.rating}/5)
                    </div>
                    <div style="font-size:13.5px;color:#0f172a;font-weight:bold;white-space:pre-wrap;word-break:break-word;margin-bottom:6px;">
                      ${esc(item.comment || 'No comment provided')}
                    </div>
                    <div style="font-size:11.5px;color:#475569;">
                      Submitted by: <strong style="color:#0f172a;">${esc(submittedBy)}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Compact Lead & Call Details Table -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;font-size:12.5px;line-height:18px;margin-bottom:12px;">
                <tr>
                  <td style="padding:6px 10px;width:115px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    Client / Mobile
                  </td>
                  <td style="padding:6px 10px;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <strong>${esc(clientName)}</strong> &nbsp;·&nbsp; <span style="font-family:monospace;color:#0f766e;font-weight:bold;">${esc(mobile)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    Company / Source
                  </td>
                  <td style="padding:6px 10px;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <strong>${esc(company)}</strong> &nbsp;·&nbsp; <span style="color:#475569;">${esc(source)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    Call Outcome
                  </td>
                  <td style="padding:6px 10px;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <strong>${esc(outcome)}</strong> &nbsp;·&nbsp; Duration: <span style="color:#475569;">${esc(duration)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 10px;color:#475569;font-weight:bold;background-color:#f8fafc;border-bottom:${summary ? '1px solid #e2e8f0' : 'none'};vertical-align:top;">
                    Lead ID
                  </td>
                  <td style="padding:6px 10px;color:#334155;font-family:monospace;font-size:11px;word-break:break-all;border-bottom:${summary ? '1px solid #e2e8f0' : 'none'};vertical-align:top;">
                    ${esc(item.leadId)}
                  </td>
                </tr>
                ${summary ? `
                <tr>
                  <td style="padding:6px 10px;color:#475569;font-weight:bold;background-color:#f8fafc;vertical-align:top;">
                    AI Summary
                  </td>
                  <td style="padding:6px 10px;color:#334155;font-size:12px;vertical-align:top;">
                    ${esc(summary)}
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Quick Action Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" style="padding:2px 0;">
                    <a href="${esc(crmUrl)}" target="_blank" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:11.5px;font-weight:bold;text-decoration:none;padding:7px 12px;border-radius:5px;margin-right:6px;">
                      Open in CRM ↗
                    </a>
                    ${hasRecording ? `
                    <a href="${esc(item.ivrUrl!)}" target="_blank" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-size:11.5px;font-weight:bold;text-decoration:none;padding:7px 12px;border-radius:5px;margin-right:6px;">
                      Listen Recording ↗
                    </a>
                    ` : ''}
                    ${hasTranscript ? `
                    <a href="${esc(item.transcriptionViewUrl!)}" target="_blank" style="display:inline-block;background-color:#334155;color:#ffffff;font-size:11.5px;font-weight:bold;text-decoration:none;padding:7px 12px;border-radius:5px;">
                      View Transcript ↗
                    </a>
                    ` : ''}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Compact Footer -->
          <tr>
            <td style="padding:9px 20px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
              Kairali CRM · Voice Call Audit Automation · Individual alert sent once per feedback (no repeat).
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!--email-closing-->
</body>
</html>`
}
