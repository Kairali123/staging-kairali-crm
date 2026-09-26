import type { BookingPiReviewData } from "@/lib/booking-pi-review-data"

const esc = (value: unknown) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))

function fmtInr(n: number): string {
    return "₹" + Math.round(n || 0).toLocaleString("en-IN")
}

function fmtDate(ymd: string | null): string {
    if (!ymd) return "—"
    const d = new Date(`${ymd}T00:00:00Z`)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; border: string }> = {
    Current: { bg: "#dcfce7", fg: "#14532d", border: "#22c55e" },
    Amended: { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" },
    Cancelled: { bg: "#fee2e2", fg: "#991b1b", border: "#ef4444" },
}

/** `/api/pi-document` proxies the raw PMS document link the same way the live tracker page does. */
function piDocumentUrl(appUrl: string, rawLink: string, reservationId: string): string {
    const params = new URLSearchParams({ url: rawLink.trim(), bookingId: reservationId })
    return `${appUrl}/api/pi-document?${params.toString()}`
}

export function exportBookingPiReviewHTML(data: BookingPiReviewData, appUrl: string): string {
    const { date, items, summary, salesBreakdown, generatedAt, reviewSheetUrl } = data
    const displayDate = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    })
    const reviewPct = summary.total ? Math.round((summary.reviewed / summary.total) * 100) : 0
    const isAllReviewed = summary.total > 0 && summary.reviewed >= summary.total
    const pendingCount = Math.max(0, summary.total - summary.reviewed)
    const trackerUrl = `${appUrl}/fms/booking-pi-review-tracker?date=${encodeURIComponent(date)}`

    const salesBreakdownRows = salesBreakdown
        .slice()
        .sort((a, b) => b.todaySalesAmount - a.todaySalesAmount)
        .map(
            (s) => `<tr>
                <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(s.name)}</td>
                <td style="padding:10px 14px;text-align:right;font-size:12px;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9;">${fmtInr(s.todaySalesAmount)}</td>
                <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9;">${s.todaySalesCount}</td>
                <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#15803d;border-bottom:1px solid #f1f5f9;">${s.newPi}</td>
                <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#b45309;border-bottom:1px solid #f1f5f9;">${s.amended || "-"}</td>
                <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#b91c1c;border-bottom:1px solid #f1f5f9;">${s.cancelled || "-"}</td>
            </tr>`
        )
        .join("")

    const itemRows = items
        .map((item) => {
            const st = STATUS_STYLE[item.status] || STATUS_STYLE.Current
            const statusBadge = `<span style="display:inline-block;padding:5px 12px;border-radius:6px;background:${st.bg};color:${st.fg};border:1.5px solid ${st.border};font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 1px 2px rgba(0,0,0,0.06);">${esc(item.status)}</span>`

            const piCell = item.piLink && /^https?:\/\//i.test(item.piLink.trim())
                ? `<a href="${esc(piDocumentUrl(appUrl, item.piLink, item.reservationId))}" style="color:#285d45;font-weight:700;text-decoration:none;">View PI ↗</a>`
                : `<span style="color:#94a3b8;">Not created</span>`
            const historyCell = item.piHistoryLink
                ? `<a href="${esc(item.piHistoryLink)}" style="color:#625c88;font-weight:700;text-decoration:none;">History ↗</a>`
                : `<span style="color:#94a3b8;">—</span>`

            const isReviewed = Boolean(item.reviewed || item.reviewLocked || (item.reviewStatus && item.reviewStatus.toLowerCase() !== "pending"))
            const revStatusNormalized = (item.reviewStatus || "").toLowerCase().trim()

            let reviewBadge: string
            if (isReviewed && (revStatusNormalized === "yes" || revStatusNormalized === "reviewed" || revStatusNormalized === "approved" || !revStatusNormalized)) {
                const reviewerText = item.reviewedBy && item.reviewedBy !== "Accounts" ? `<div style="font-size:9px;color:#166534;font-weight:700;margin-top:2px;">by ${esc(item.reviewedBy)}</div>` : ""
                reviewBadge = `<span style="display:inline-block;padding:5px 12px;border-radius:6px;background:#dcfce7;color:#14532d;border:1.5px solid #22c55e;font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 1px 2px rgba(34,197,94,0.15);">✓ REVIEWED</span>${reviewerText}`
            } else if (isReviewed && (revStatusNormalized === "no" || revStatusNormalized === "rejected")) {
                reviewBadge = `<span style="display:inline-block;padding:5px 12px;border-radius:6px;background:#fee2e2;color:#991b1b;border:1.5px solid #ef4444;font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 1px 2px rgba(239,68,68,0.15);">✗ REJECTED</span>`
            } else {
                reviewBadge = `<span style="display:inline-block;padding:5px 12px;border-radius:6px;background:#fff7ed;color:#c2410c;border:1.5px solid #ea580c;font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 1px 2px rgba(234,88,12,0.15);">⏳ PENDING</span>`
            }

            const amountBlock = item.status === "Amended" && item.previousInvoiceAmount > 0
                ? `<br/><span style="font-size:10px;color:#756e68;">Prev ${fmtInr(item.previousInvoiceAmount)} · <strong style="color:#c94c47;">${item.amountChange >= 0 ? "+" : "−"}${fmtInr(Math.abs(item.amountChange))}</strong></span>`
                : ""

            return `<tr>
                <td style="padding:10px 14px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">
                    <strong>${esc(item.reservationId)}</strong><br/><span style="font-size:10px;color:#849087;">${esc(item.piNumber)}</span>
                </td>
                <td style="padding:10px 14px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${esc(item.guest)}</td>
                <td style="padding:10px 14px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${fmtDate(item.checkInDate)}</td>
                <td style="padding:10px 14px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${fmtDate(item.checkOutDate)}</td>
                <td style="padding:10px 14px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${esc(item.salesDoer)}</td>
                <td style="padding:10px 14px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">${fmtInr(item.invoiceAmount)}${amountBlock}</td>
                <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #f1f5f9;text-align:center;white-space:nowrap;">
                    ${statusBadge}
                </td>
                <td style="padding:10px 14px;font-size:11px;border-bottom:1px solid #f1f5f9;text-align:center;">${piCell}</td>
                <td style="padding:10px 14px;font-size:11px;border-bottom:1px solid #f1f5f9;text-align:center;">${historyCell}</td>
                <td style="padding:10px 14px;font-size:11px;border-bottom:1px solid #f1f5f9;text-align:center;white-space:nowrap;">
                    ${reviewBadge}
                </td>
            </tr>`
        })
        .join("")

    const preheader = `Booking PI Review Alert · ${fmtInr(summary.todaySalesAmount)} today's sales · ${summary.newPi} new PI · ${summary.amended} amended · ${summary.cancelled} cancelled · ${displayDate}`

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Booking PI Review Alert · ${esc(date)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:0;background:#f4f6fc;color:#24324b;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
h1,h2,h3,h4,p{margin:0}
img{display:block;border:0;outline:0;max-width:100%;height:auto}
@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}body{background:#fff}}
</style>
</head>
<body style="margin:0;padding:24px 12px;background:#f4f6fc;color:#24324b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f6fc">${esc(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f6fc">
<tr>
<td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:1240px;text-align:left">
<tr>
<td>

<!--email-intro-->

<!-- HERO HEADER -->
<header style="background:linear-gradient(115deg, #14251d, #2f4d3d);border-radius:20px;padding:30px 32px;color:#ffffff;box-shadow:0 14px 36px rgba(20,37,29,0.18);">
  <div style="font-size:11px;font-weight:700;letter-spacing:3px;opacity:0.65;text-transform:uppercase;margin-bottom:18px;color:#ffffff;">
    KAIRALI GROUP &nbsp;/&nbsp; ACCOUNTS PI REVIEW
  </div>
  <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
    Booking PI Review Alert
  </h1>
  <p style="margin:8px 0 0;font-size:14px;font-weight:500;color:rgba(255,255,255,0.75);">
    ${esc(displayDate)} &nbsp;<small style="opacity:0.8;">IST</small>
  </p>
  <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.55);">
    Daily sales &amp; PI movement · New bookings, amendments and cancellations for accounts review
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr>
      <td width="20%" valign="top" style="padding-right:6px;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:14px 16px;min-height:92px;box-sizing:border-box;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:6px;">TODAY'S SALES</div>
          <div style="font-size:22px;font-weight:900;color:#ffffff;line-height:1.15;">${fmtInr(summary.todaySalesAmount)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:6px;font-weight:600;">${summary.todaySalesCount} booking${summary.todaySalesCount === 1 ? "" : "s"}</div>
        </div>
      </td>
      <td width="20%" valign="top" style="padding:0 3px;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:14px 16px;min-height:92px;box-sizing:border-box;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:6px;">NEW PIS</div>
          <div style="font-size:26px;font-weight:900;color:#86efac;line-height:1.1;">${summary.newPi}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:6px;font-weight:600;">Created today</div>
        </div>
      </td>
      <td width="20%" valign="top" style="padding:0 3px;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:14px 16px;min-height:92px;box-sizing:border-box;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:6px;">AMENDED</div>
          <div style="font-size:26px;font-weight:900;color:#fde047;line-height:1.1;">${summary.amended}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:6px;font-weight:600;">Modified PIs</div>
        </div>
      </td>
      <td width="20%" valign="top" style="padding:0 3px;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:14px 16px;min-height:92px;box-sizing:border-box;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:6px;">CANCELLED</div>
          <div style="font-size:26px;font-weight:900;color:#fca5a5;line-height:1.1;">${summary.cancelled}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:6px;font-weight:600;">Cancelled PIs</div>
        </div>
      </td>
      <td width="20%" valign="top" style="padding-left:6px;">
        <div style="background:${isAllReviewed ? 'rgba(34,197,94,0.22)' : 'rgba(245,158,11,0.22)'};border:2px solid ${isAllReviewed ? '#4ade80' : '#f59e0b'};border-radius:12px;padding:12px 14px;min-height:92px;box-sizing:border-box;box-shadow:0 4px 16px ${isAllReviewed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.3)'};">
          <div style="font-size:10px;font-weight:900;letter-spacing:1px;color:${isAllReviewed ? '#86efac' : '#fde047'};text-transform:uppercase;margin-bottom:4px;">REVIEWED STATUS</div>
          <div style="font-size:24px;font-weight:900;color:#ffffff;line-height:1.1;">${summary.reviewed}/${summary.total}</div>
          <div style="margin-top:6px;">
            <span style="display:inline-block;padding:3px 9px;border-radius:10px;font-size:10px;font-weight:900;letter-spacing:0.4px;background:${isAllReviewed ? '#22c55e' : '#f59e0b'};color:${isAllReviewed ? '#ffffff' : '#14251d'};text-transform:uppercase;">
              ${isAllReviewed ? '✓ All Reviewed (100%)' : `⏳ ${pendingCount} Pending (${reviewPct}%)`}
            </span>
          </div>
        </div>
      </td>
    </tr>
  </table>
</header>

${salesBreakdown.length > 0 ? `
<!-- SALES BREAKDOWN -->
<section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-top:24px;overflow:hidden;">
  <div style="background:#f8fafc;border-bottom:1px solid #f1f5f9;padding:14px 20px;">
    <span style="font-size:16px;font-weight:700;color:#1e293b;">Sales breakdown</span>
  </div>
  <div style="overflow-x:auto;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:12px;text-align:left;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:left;">Sales person</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:right;">Today's sales</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:center;">Bookings</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:center;">New PI</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:center;">Amended</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:center;">Cancelled</th>
        </tr>
      </thead>
      <tbody>${salesBreakdownRows}</tbody>
    </table>
  </div>
</section>` : ""}

<!-- PI QUEUE TABLE -->
<section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-top:28px;overflow:hidden;">
  <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 20px;">
    <div style="font-size:18px;font-weight:700;color:#1e293b;">Daily PI tracker</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px;">Bookings, amendments and cancellations recorded for ${esc(displayDate)}</div>
  </div>
  <div style="overflow-x:auto;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;min-width:900px;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:left;white-space:nowrap;">Booking / PI</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:left;">Guest</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:left;white-space:nowrap;">Check-in</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:left;white-space:nowrap;">Check-out</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:left;">Sales person</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:right;">Amount</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:900;color:#0f172a;text-align:center;">Status</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:center;">PI</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#334155;text-align:center;">History</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:900;color:#0f172a;text-align:center;">Reviewed</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="10" style="text-align:center;padding:24px;color:#64748b;">No PI records for this date.</td></tr>`}
      </tbody>
    </table>
  </div>
</section>

<!--email-closing-->

<div style="font-size:11px;line-height:1.8;color:#64748b;padding:24px 4px 8px;text-align:center;">
  <a href="${esc(trackerUrl)}" style="color:#285d45;font-weight:700;text-decoration:none;">Open the full Daily PI tracker ↗</a>
  &nbsp;·&nbsp;
  <a href="${esc(reviewSheetUrl)}" style="color:#625c88;font-weight:700;text-decoration:none;">Open PI review log Sheet ↗</a>
  <br/>
  Kairali Group · Booking PI Review Alert · Generated ${esc(generatedAt)} · Asia/Kolkata
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
