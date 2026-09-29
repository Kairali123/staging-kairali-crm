/**
 * KServe Lead Lost Alert Email Template
 * Sent when leads remain unreturned from KServe beyond the configured threshold (6th day, 10th day, etc.)
 * Responsive for both Desktop and Mobile email clients.
 */
import type { ReconciledLostLead, KserveReconciliationStats } from '@/lib/kserve-reconciliation'

export function buildKserveLostAlertEmail(
  leads: ReconciledLostLead[],
  stats: KserveReconciliationStats,
  appUrl: string,
  maxDisplay: number = 10
): string {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const count = leads.length
  const displayedLeads = leads.slice(0, maxDisplay)
  const hiddenCount = count > maxDisplay ? count - maxDisplay : 0

  // Desktop table rows
  const desktopRows = displayedLeads
    .map((l, i) => {
      const sentDate = l.sent_date
        ? new Date(l.sent_date).toLocaleDateString('en-IN')
        : '—'
      const urgencyColor =
        l.days_pending >= 10
          ? '#dc2626'
          : l.days_pending >= 6
          ? '#d97706'
          : '#374151'
      const statusBadge =
        l.received_count === 0
          ? '<span style="color:#dc2626;font-size:11px;font-weight:700;">No Log</span>'
          : `<span style="color:#d97706;font-size:11px;font-weight:600;">Pending (${l.received_count} call${l.received_count > 1 ? 's' : ''})</span>`

      return `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8faff'};">
                <td style="padding:10px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${i + 1}</td>
                <td style="padding:10px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
                    <strong>${escHtml(l.name_of_client || '—')}</strong><br>
                    <span style="color:#64748b;font-size:11px;">${escHtml(l.mobile || '—')}</span><br>
                    <span style="color:#64748b;font-size:11px;">${escHtml(l.email_id || '—')}</span>
                </td>
                <td style="padding:10px 12px;font-size:11px;color:#374151;border-bottom:1px solid #e5e7eb;font-family:monospace;word-break:break-all;">${escHtml(l.enquiry_id)}</td>
                <td style="padding:10px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${escHtml(l.company || '—')}</td>
                <td style="padding:10px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${escHtml(l.data_source || '—')}</td>
                <td style="padding:10px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${sentDate}</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:700;color:${urgencyColor};border-bottom:1px solid #e5e7eb;white-space:nowrap;">
                    ${l.days_pending} days<br>${statusBadge}
                </td>
            </tr>
        `
    })
    .join('')

  // Mobile card view rows
  const mobileCards = displayedLeads
    .map((l, i) => {
      const sentDate = l.sent_date
        ? new Date(l.sent_date).toLocaleDateString('en-IN')
        : '—'
      const urgencyBorder =
        l.days_pending >= 10
          ? '#ef4444'
          : l.days_pending >= 6
          ? '#f59e0b'
          : '#94a3b8'
      const urgencyBadgeBg =
        l.days_pending >= 10
          ? '#fee2e2'
          : l.days_pending >= 6
          ? '#fef3c7'
          : '#f1f5f9'
      const urgencyBadgeColor =
        l.days_pending >= 10
          ? '#991b1b'
          : l.days_pending >= 6
          ? '#92400e'
          : '#334155'
      const logText =
        l.received_count === 0
          ? '0 calls (No Log)'
          : `${l.received_count} call attempt${l.received_count > 1 ? 's' : ''}`

      return `
        <div class="lead-card" style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${urgencyBorder};border-radius:8px;padding:12px;margin-bottom:10px;text-align:left;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:#64748b;">#${i + 1} &bull; <code style="font-size:11px;color:#1e293b;word-break:break-all;">${escHtml(l.enquiry_id)}</code></span>
                <span style="background:${urgencyBadgeBg};color:${urgencyBadgeColor};font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;white-space:nowrap;">
                    ${l.days_pending}d pending
                </span>
            </div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:3px;">
                ${escHtml(l.name_of_client || 'Unknown Client')}
            </div>
            <div style="font-size:12px;color:#475569;margin-bottom:6px;line-height:1.5;">
                📞 ${escHtml(l.mobile || '—')} &nbsp;|&nbsp; ✉️ ${escHtml(l.email_id || '—')}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11px;color:#64748b;border-top:1px dashed #e2e8f0;padding-top:6px;">
                <span>🏢 <strong>${escHtml(l.company || '—')}</strong></span>
                <span>📡 <strong>${escHtml(l.data_source || '—')}</strong></span>
                <span>📅 Sent: <strong>${sentDate}</strong></span>
                <span>📞 Calls: <strong style="color:${l.received_count === 0 ? '#dc2626' : '#d97706'};">${logText}</strong></span>
            </div>
        </div>
      `
    })
    .join('')

  const downloadUrl = `${appUrl}/api/voicecall/kserve-lead-lost/export`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KServe Lead Lost Alert</title>
    <style>
        /* Base styles */
        body { margin:0; padding:0; background:#f0f4ff; font-family:Arial,Helvetica,sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
        
        /* Responsive adjustments */
        @media only screen and (max-width: 620px) {
            .container-table { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
            .outer-wrapper { padding: 8px 4px !important; }
            .content-padding { padding-left: 14px !important; padding-right: 14px !important; }
            .header-padding { padding: 20px 14px !important; }
            .kpi-row { display: block !important; width: 100% !important; }
            .kpi-box { display: block !important; width: 100% !important; box-sizing: border-box !important; margin-bottom: 8px !important; }
            .kpi-spacer { display: none !important; width: 0 !important; height: 0 !important; }
            .desktop-table-wrap { display: none !important; }
            .mobile-cards-wrap { display: block !important; }
            .download-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 14px 16px !important; text-align: center !important; }
        }
        @media only screen and (min-width: 621px) {
            .mobile-cards-wrap { display: none !important; }
            .desktop-table-wrap { display: block !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" class="outer-wrapper" style="background:#f0f4ff;padding:24px 8px;">
        <tr><td align="center">
            <table width="680" cellpadding="0" cellspacing="0" class="container-table" style="max-width:680px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,0.06);border-radius:16px;overflow:hidden;">

                <!-- Header -->
                <tr><td class="header-padding" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:24px 28px;text-align:center;">
                    <div style="font-size:26px;margin-bottom:6px;">🚨</div>
                    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.4px;">KServe Lead Lost Alert</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px;">Generated: ${now} IST</div>
                </td></tr>

                <!-- Alert Banner -->
                <tr><td class="content-padding" style="background:#fef2f2;border-left:4px solid #ef4444;border-right:4px solid #ef4444;padding:14px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="font-size:13px;line-height:1.5;color:#991b1b;font-weight:700;">
                                ⚠️ ${count} lead${count !== 1 ? 's' : ''} sent to KServe ${count !== 1 ? 'have' : 'has'} not reached a Qualified or Non-Qualified conclusion (>5 days pending).
                            </td>
                        </tr>
                    </table>
                </td></tr>

                <!-- KPI Summary -->
                <tr><td class="content-padding" style="background:#fff;padding:16px 24px;border-left:4px solid #ef4444;border-right:4px solid #ef4444;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr class="kpi-row">
                            <td class="kpi-box" width="33%" style="text-align:center;padding:12px 8px;background:#fef2f2;border-radius:8px;">
                                <div style="font-size:28px;font-weight:800;color:#dc2626;line-height:1.1;">${count}</div>
                                <div style="font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Total Lost Leads</div>
                            </td>
                            <td class="kpi-spacer" width="8px"></td>
                            <td class="kpi-box" width="33%" style="text-align:center;padding:12px 8px;background:#fef3c7;border-radius:8px;">
                                <div style="font-size:28px;font-weight:800;color:#d97706;line-height:1.1;">${stats.tier6to9Days}</div>
                                <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">6–9 Days (Overdue)</div>
                            </td>
                            <td class="kpi-spacer" width="8px"></td>
                            <td class="kpi-box" width="33%" style="text-align:center;padding:12px 8px;background:#fee2e2;border-radius:8px;">
                                <div style="font-size:28px;font-weight:800;color:#991b1b;line-height:1.1;">${stats.tier10PlusDays}</div>
                                <div style="font-size:11px;font-weight:700;color:#7f1d1d;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">10+ Days (Critical)</div>
                            </td>
                        </tr>
                    </table>
                </td></tr>

                <!-- Table & Mobile Cards -->
                <tr><td class="content-padding" style="background:#fff;padding:0 24px 20px;border-left:4px solid #ef4444;border-right:4px solid #ef4444;">
                    <div style="font-size:13px;font-weight:700;color:#1e293b;padding:12px 0 10px;border-bottom:2px solid #e5e7eb;margin-bottom:12px;">📋 Lost Lead Details (Previewing Top ${displayedLeads.length})</div>
                    
                    <!-- Desktop Table view -->
                    <div class="desktop-table-wrap" style="overflow-x:auto;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:540px;">
                            <thead>
                                <tr style="background:#1e2a4a;">
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">#</th>
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Client Details</th>
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Enquiry ID</th>
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Company</th>
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Source</th>
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Sent Date</th>
                                    <th style="padding:9px 12px;font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Days Pending</th>
                                </tr>
                            </thead>
                            <tbody>${desktopRows}</tbody>
                        </table>
                    </div>

                    <!-- Mobile Cards view -->
                    <div class="mobile-cards-wrap">
                        ${mobileCards}
                    </div>

                    ${
                      hiddenCount > 0
                        ? `
                        <div style="margin-top:10px;padding:10px 12px;background:#f1f5f9;border-radius:6px;font-size:12px;line-height:1.4;color:#475569;text-align:center;font-weight:600;">
                            ... and <strong>${hiddenCount}</strong> more lost leads. Click below to download the complete Excel file with all ${count} records.
                        </div>
                    `
                        : ''
                    }
                </td></tr>

                <!-- Action Required & Download Button -->
                <tr><td class="content-padding" style="background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #ef4444;border-right:4px solid #ef4444;padding:18px 24px 24px;">
                    <div style="font-size:13px;font-weight:700;color:#92400e;">🎯 Action Required</div>
                    <ul style="font-size:12px;color:#78350f;margin:8px 0 18px;padding-left:18px;line-height:1.7;">
                        <li>Download the full Excel report to review all lost leads and their call attempt history.</li>
                        <li>Follow up with KServe team for all leads pending for 6 days or 10+ days.</li>
                        <li>If leads are not recoverable, update their status accordingly in the CRM.</li>
                    </ul>
                    
                    <div style="text-align:center;">
                        <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" download="KServe_Lost_Leads_Report.xlsx" class="download-btn" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:13px 24px;border-radius:8px;text-transform:uppercase;letter-spacing:0.8px;box-shadow:0 4px 10px rgba(30,58,138,0.25);">
                            📥 Download Excel Report (All Data) &rarr;
                        </a>
                    </div>
                </td></tr>

                <!-- Footer -->
                <tr><td class="content-padding" style="background:#1e2a4a;padding:18px 24px;text-align:center;">
                    <div style="font-size:11px;color:rgba(255,255,255,0.65);">This is an automated alert from the Kairali CRM system.</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;">Reconciled against KServe call logs based on calculated qualification status.</div>
                </td></tr>

            </table>
        </td></tr>
    </table>
</body>
</html>
  `.trim()
}

function escHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c]!)
  )
}
