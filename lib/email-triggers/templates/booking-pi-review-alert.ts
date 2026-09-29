/**
 * Booking PI Review Alert Email Template
 *
 * Sent daily at 18:30 IST (6:30 PM) if any booking PI review is still pending.
 * Shows:
 *   - Total PIs for today
 *   - How many accounts reviewed "Yes" (done)
 *   - How many reviewed "No" (needs attention)
 *   - How many are still Pending (no review action taken)
 *
 * If ALL items are reviewed → summary email only (no help ticket needed)
 * If ANY item is still Pending → email + help ticket is created
 */

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  )
}

export interface PIReviewAlertData {
  reportDate: string          // YYYY-MM-DD
  totalPIs: number
  reviewedYes: number
  reviewedNo: number
  pending: number             // Not yet reviewed at all (status = 'Pending')
  pendingItems: PIReviewAlertItem[]
  appUrl: string
}

export interface PIReviewAlertItem {
  reservationId: string
  piNumber: string
  guest: string
  salesDoer: string
  invoiceAmount: number
  currency: string
  checkInDate: string | null
  reviewStatus: string        // 'Pending' | 'No' | 'Yes'
}

export function buildPIReviewAlertEmail(data: PIReviewAlertData): string {
  const { reportDate, totalPIs, reviewedYes, reviewedNo, pending, pendingItems, appUrl } = data

  const displayDate = new Date(`${reportDate}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  const trackerUrl = `${appUrl}/fms/booking-pi-review-tracker`
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

  const statusColor = pending > 0 ? '#dc2626' : '#16a34a'
  const statusBg    = pending > 0 ? '#fef2f2' : '#f0fdf4'
  const statusBorder = pending > 0 ? '#fca5a5' : '#86efac'
  const headline    = pending > 0
    ? `⚠️ ${pending} Booking PI Review${pending > 1 ? 's' : ''} Pending — Action Required`
    : '✅ All Booking PI Reviews Completed for Today'

  // Pending rows table
  const pendingRows = pendingItems
    .map((item, i) => {
      const amt = `₹${item.invoiceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      const ci = item.checkInDate
        ? new Date(`${item.checkInDate}T00:00:00+05:30`).toLocaleDateString('en-IN')
        : '—'
      const badgeColor = item.reviewStatus === 'No' ? '#d97706' : '#dc2626'
      const badgeBg    = item.reviewStatus === 'No' ? '#fef3c7' : '#fee2e2'
      return `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8faff'};">
          <td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
          <td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
            <strong>${esc(item.reservationId)}</strong><br>
            <span style="color:#6b7280;font-size:11px;">${esc(item.piNumber)}</span>
          </td>
          <td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${esc(item.guest)}</td>
          <td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">${esc(item.salesDoer)}</td>
          <td style="padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${amt}</td>
          <td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${ci}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
            <span style="background:${badgeBg};color:${badgeColor};font-size:11px;font-weight:700;
              padding:2px 8px;border-radius:999px;">${esc(item.reviewStatus)}</span>
          </td>
        </tr>`
    })
    .join('')

  const pendingSection = pendingItems.length > 0 ? `
    <div style="margin-top:28px;">
      <h3 style="font-size:14px;font-weight:700;color:#1e3a5f;margin:0 0 12px;">
        Pending / Unreviewed Bookings (${pendingItems.length})
      </h3>
      <div style="overflow-x:auto;">
        <table cellpadding="0" cellspacing="0" width="100%"
          style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;">
          <thead>
            <tr style="background:#1e3a5f;">
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;">#</th>
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;">Reservation / PI</th>
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;">Guest</th>
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;">Sales Person</th>
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;">Invoice Amt</th>
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;">Check-In</th>
              <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:center;font-weight:700;">Status</th>
            </tr>
          </thead>
          <tbody>${pendingRows}</tbody>
        </table>
      </div>
    </div>` : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking PI Review Alert — ${esc(reportDate)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:680px;background:#ffffff;border-radius:12px;
                 box-shadow:0 2px 16px rgba(30,58,95,0.10);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5f8a 100%);
                        padding:28px 32px;text-align:center;">
              <div style="font-size:11px;color:#93c5fd;font-weight:600;
                           letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">
                Kairali CRM · Accounts Audit
              </div>
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">
                Booking PI Review Alert
              </h1>
              <div style="margin-top:8px;font-size:12px;color:#bfdbfe;">${esc(displayDate)}</div>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="background:${statusBg};border:1px solid ${statusBorder};
                           border-radius:8px;padding:14px 20px;text-align:center;">
                <div style="font-size:15px;font-weight:700;color:${statusColor};">${headline}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                  Report generated at ${esc(now)} IST
                </div>
              </div>
            </td>
          </tr>

          <!-- Summary Scorecards -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Total PIs -->
                  <td width="25%" style="padding:0 6px 0 0;">
                    <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:8px;
                                 padding:16px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:#1e3a5f;">${totalPIs}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Total PIs Today</div>
                    </div>
                  </td>
                  <!-- Reviewed Yes -->
                  <td width="25%" style="padding:0 6px;">
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;
                                 padding:16px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:#16a34a;">${reviewedYes}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Reviewed ✅ Yes</div>
                    </div>
                  </td>
                  <!-- Reviewed No -->
                  <td width="25%" style="padding:0 6px;">
                    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;
                                 padding:16px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:#d97706;">${reviewedNo}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Reviewed ❌ No</div>
                    </div>
                  </td>
                  <!-- Pending -->
                  <td width="25%" style="padding:0 0 0 6px;">
                    <div style="background:${pending > 0 ? '#fef2f2' : '#f8faff'};
                                 border:1px solid ${pending > 0 ? '#fca5a5' : '#dbeafe'};
                                 border-radius:8px;padding:16px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:${pending > 0 ? '#dc2626' : '#64748b'};">${pending}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">⏳ Pending</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pending Items Table -->
          <tr>
            <td style="padding:0 32px;">
              ${pendingSection}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="${esc(trackerUrl)}"
                 style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d5f8a);
                         color:#fff;font-size:13px;font-weight:700;padding:12px 28px;
                         border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Open PI Review Tracker →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;border-top:1px solid #e5e7eb;
                        padding:16px 32px;text-align:center;">
              <div style="font-size:10px;color:#9ca3af;">
                Kairali CRM · Booking PI Review Audit · Auto-generated at ${esc(now)} IST<br>
                This is an automated notification. Do not reply to this email.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
