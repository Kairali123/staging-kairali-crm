export interface AgingEmailData {
  reportDate: string
  generatedAt: string
  appUrl: string
  summary: { total: number; critical: number; risky: number; normal: number }
  employees: AgingEmailEmployee[]
}

export interface AgingEmailEmployee {
  employee: string
  totalPending: number
  totalCritical: number
  totalRisky: number
  sheets: {
    sheetName: string
    total: number
    normal: number
    risky: number
    critical: number
    bookings: {
      bookingId: string
      guestName: string
      plannedDate: string
      agingDays: number
      actionStatus: string
      doerRemarks: string
      cancelReason: string
    }[]
  }[]
}

const esc = (s: any) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

function agingTagHTML(days: number) {
  if (days >= 6) return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:11px;font-weight:bold;white-space:nowrap;">🚨 ${days}d</span>`
  if (days >= 3) return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#ffedd5;color:#9a3412;border:1px solid #fdba74;font-size:11px;font-weight:bold;white-space:nowrap;">⚠️ ${days}d</span>`
  return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:11px;font-weight:bold;white-space:nowrap;">✅ ${days}d</span>`
}

export function buildPendingAgingAlertEmail(data: AgingEmailData): string {
  const { reportDate, generatedAt, appUrl, summary, employees } = data
  const isClear = summary.total === 0

  let headline = isClear ? "All Clear! 🎉" : `${summary.total} Pending Item${summary.total === 1 ? "" : "s"}`
  const hasCritical = summary.critical > 0
  const hasRisky = summary.risky > 0

  let statusBg = isClear ? "#f0fdf4" : hasCritical ? "#fef2f2" : hasRisky ? "#fff7ed" : "#f8fafc"
  let statusBorder = isClear ? "#bbf7d0" : hasCritical ? "#fecaca" : hasRisky ? "#fed7aa" : "#e2e8f0"
  let statusColor = isClear ? "#166534" : hasCritical ? "#991b1b" : hasRisky ? "#9a3412" : "#334155"

  let employeeSections = ""
  for (const emp of employees) {
    if (emp.totalPending === 0) continue

    let sheetsHTML = ""
    for (const sheet of emp.sheets) {
      if (sheet.total === 0) continue

      let rowsHTML = ""
      sheet.bookings.forEach((b, idx) => {
        const isCancelled = (b.actionStatus || "").toLowerCase().includes("cancel")
        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc"
        
        // Status pill
        let statusPill = b.actionStatus ? `<span style="display:inline-block;padding:2px 6px;border-radius:10px;background:${isCancelled ? '#fef2f2' : '#fef3c7'};color:${isCancelled ? '#b91c1c' : '#b45309'};border:1px solid ${isCancelled ? '#fecaca' : '#fde68a'};font-size:10px;font-weight:600;white-space:nowrap;">${esc(b.actionStatus)}</span>` : `<span style="color:#cbd5e1;">—</span>`
        
        let remarksHTML = ""
        if (b.doerRemarks) remarksHTML += `<div style="font-size:11px;color:#475569;margin-top:2px;">💬 ${esc(b.doerRemarks)}</div>`
        if (b.cancelReason) remarksHTML += `<div style="font-size:11px;color:#dc2626;margin-top:2px;font-weight:600;">❌ ${esc(b.cancelReason)}</div>`

        rowsHTML += `
          <tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px;font-family:monospace;font-size:12px;color:#4338ca;font-weight:bold;">${esc(b.bookingId)}</td>
            <td style="padding:10px;font-size:12px;color:#1e293b;font-weight:600;">${esc(b.guestName)}</td>
            <td style="padding:10px;font-size:11px;color:#64748b;white-space:nowrap;">📅 ${esc(b.plannedDate)}</td>
            <td style="padding:10px;white-space:nowrap;">${agingTagHTML(b.agingDays)}</td>
            <td style="padding:10px;">${statusPill}</td>
            <td style="padding:10px;">${remarksHTML || '<span style="color:#cbd5e1;">—</span>'}</td>
          </tr>`
      })

      sheetsHTML += `
        <div style="margin-bottom:16px;">
          <div style="background:#f1f5f9;border-top:2px solid #cbd5e1;padding:8px 12px;font-size:13px;font-weight:bold;color:#334155;">
            📄 ${esc(sheet.sheetName)} — <span style="color:#6366f1;">${sheet.total} Total</span>
            <span style="font-size:11px;font-weight:normal;color:#64748b;margin-left:12px;">(🚨 ${sheet.critical} | ⚠️ ${sheet.risky} | ✅ ${sheet.normal})</span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-top:none;">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;">ID</th>
                <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;">Guest Name</th>
                <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;">Planned</th>
                <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;">Aging</th>
                <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;">Status</th>
                <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;">Remarks / Cancel</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>`
    }

    employeeSections += `
      <div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div style="background:linear-gradient(to right, #1e293b, #334155);padding:14px 18px;color:#ffffff;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:16px;font-weight:800;">${esc(emp.employee)}</span>
            <span style="font-size:13px;color:#94a3b8;margin-left:8px;">· ${emp.totalPending} pending items</span>
          </div>
        </div>
        <div style="padding:16px;background:#ffffff;">
          ${sheetsHTML}
        </div>
      </div>`
  }

  const trackerUrl = `${appUrl}/fms/bookings/pending-aging`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:850px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">
                Kairali CRM · KTAHV FMS · Daily Alert
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">
                🕐 KTAHV Bookings Pending Stage Aging Tracker
              </h1>
              <div style="margin-top:8px;font-size:12px;color:#cbd5e1;">${esc(reportDate)} · Generated at ${esc(generatedAt)}</div>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="background:${statusBg};border:1px solid ${statusBorder};border-radius:10px;padding:14px 20px;text-align:center;">
                <div style="font-size:16px;font-weight:700;color:${statusColor};">${headline}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                  This is an automated daily morning alert. Please clear your pending items before EOD.
                </div>
              </div>
            </td>
          </tr>

          <!-- KPI Summary -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="25%" style="padding:0 5px 0 0;">
                    <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:30px;font-weight:800;color:#1e3a5f;">${summary.total}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:bold;">TOTAL PENDING</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 5px;">
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:30px;font-weight:800;color:#16a34a;">${summary.normal}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:bold;">✅ NORMAL (1-2d)</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 5px;">
                    <div style="background:${summary.risky > 0 ? "#fff7ed" : "#f8faff"};border:1px solid ${summary.risky > 0 ? "#fdba74" : "#dbeafe"};border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:30px;font-weight:800;color:${summary.risky > 0 ? "#ea580c" : "#94a3b8"};">${summary.risky}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:bold;">⚠️ RISKY (3-5d)</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 0 0 5px;">
                    <div style="background:${summary.critical > 0 ? "#fef2f2" : "#f8faff"};border:1px solid ${summary.critical > 0 ? "#fca5a5" : "#dbeafe"};border-radius:10px;padding:14px;text-align:center;">
                      <div style="font-size:30px;font-weight:800;color:${summary.critical > 0 ? "#dc2626" : "#94a3b8"};">${summary.critical}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:bold;">🚨 CRITICAL (6+ d)</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Employee Breakdown -->
          <tr>
            <td style="padding:24px 32px 8px;">
              ${employeeSections || '<p style="color:#64748b;font-size:13px;text-align:center;padding:20px 0;">🎉 No pending items found. All clear!</p>'}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <a href="${trackerUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);
                         color:#fff;font-size:13px;font-weight:700;padding:13px 32px;
                         border-radius:10px;text-decoration:none;letter-spacing:0.5px;
                         box-shadow:0 4px 12px rgba(99,102,241,0.35);">
                Open Pending Aging Tracker →
              </a>
              <div style="font-size:11px;color:#94a3b8;margin-top:10px;">
                Click to view full details, filter by employee and clear your pending stages.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
              <div style="font-size:10px;color:#9ca3af;line-height:1.6;">
                Kairali CRM · KTAHV Bookings Pending Stage Aging Tracker · Auto-generated at ${esc(generatedAt)}<br>
                This is an automated daily morning notification. Do not reply to this email.
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

export async function loadPendingAgingEmailData(appUrl: string, cookieStr: string = ""): Promise<AgingEmailData> {
  const headers: Record<string, string> = { "x-internal-call": "1" }
  if (cookieStr) headers["cookie"] = cookieStr

  const res = await fetch(`${appUrl}/api/ktahv-bookings/pending-aging`, {
    cache: "no-store",
    headers,
  })
  if (!res.ok) throw new Error(`Aging API returned ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || "Aging API error")

  const now = new Date()
  const reportDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now)
  const generatedAt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now)

  const employees: AgingEmailEmployee[] = (json.data ?? []).map((emp: any) => ({
    employee: emp.employee,
    totalPending: emp.totalPending,
    totalCritical: emp.totalCritical,
    totalRisky: emp.totalRisky,
    sheets: (emp.sheets ?? []).map((s: any) => ({
      sheetName: s.sheetName,
      total: s.total,
      normal: s.normal,
      risky: s.risky,
      critical: s.critical,
      bookings: (s.bookings ?? []).map((b: any) => ({
        bookingId: b.bookingId,
        guestName: b.guestName,
        plannedDate: b.plannedDate,
        agingDays: b.agingDays,
        actionStatus: b.actionStatus || "",
        doerRemarks: b.doerRemarks || "",
        cancelReason: b.cancelReason || "",
      })),
    })),
  }))

  return {
    reportDate,
    generatedAt: `${generatedAt} IST`,
    appUrl,
    summary: json.summary ?? { total: 0, critical: 0, risky: 0, normal: 0 },
    employees,
  }
}
