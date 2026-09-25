import type { CrrReportData } from "@/lib/email-triggers/load-crr-report";

const esc = (value: unknown) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const SVG_ICONS = {
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    barChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    checkCircle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    award: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    briefcase: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    clipboardCheck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`,
};

export function buildCrrJourneyDonutSvg(active: number, complete: number): string {
    const total = active + complete;
    if (total <= 0) return "";
    const cx = 80, cy = 80, r = 58, sw = 18, circ = 2 * Math.PI * r;
    const activeLen = (active / total) * circ;
    const completeLen = circ - activeLen;
    const off1 = circ / 4;
    const off2 = off1 - activeLen;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160" style="display:block;margin:0 auto" role="img" aria-label="Journey Status Donut Chart"><title>Total Journeys</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f59e0b" stroke-width="${sw}" stroke-dasharray="${activeLen.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${off1.toFixed(2)}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#10b981" stroke-width="${sw}" stroke-dasharray="${completeLen.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${off2.toFixed(2)}"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="28" fill="#0f172a" font-weight="800" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">${total}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" letter-spacing="1">GUESTS</text></svg>`;
}

export function exportCrrReportHTML(data: CrrReportData, scope: string = "KTAHV"): string {
    const { reportDate, displayDate, generatedAt, pendingReport, dailyDoneReport, chartData, stages } = data;

    const totalPending = pendingReport.totals.reduce((a, b) => a + b, 0);
    const totalDone = dailyDoneReport.totals.reduce((a, b) => a + b, 0);

    const donutSvg = buildCrrJourneyDonutSvg(chartData.totalActive, chartData.totalComplete);

    // Roles configuration matching page.tsx exactly
    const roleConfig = [
        { key: "GRE", label: "Guest Relations Executive", icon: SVG_ICONS.phone, color: "#0ea5e9" },
        { key: "Doctor", label: "Doctor", icon: SVG_ICONS.award, color: "#14b8a6" },
        { key: "FO", label: "Front Office", icon: SVG_ICONS.briefcase, color: "#a855f7" },
        { key: "GM", label: "General Manager", icon: SVG_ICONS.clipboardCheck, color: "#f59e0b" },
    ] as const;

    const roleBreakdownHTML = roleConfig
        .map((r) => {
            const stats = chartData.roleStats[r.key] || { tasks: 0, guests: 0 };
            const pct = chartData.totalRoleWorkload > 0 ? (stats.tasks / chartData.totalRoleWorkload) * 100 : 0;
            const barWidth = stats.tasks === 0 ? 0 : Math.max(pct, 2);
            return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                <tr>
                    <td width="40" valign="middle" align="center" style="width:40px;height:40px;border-radius:8px;background:${r.color};text-align:center;vertical-align:middle;box-shadow:0 1px 2px rgba(0,0,0,0.1);">
                        ${r.icon}
                    </td>
                    <td valign="middle" style="padding-left:14px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
                            <tr>
                                <td align="left" style="font-size:13px;font-weight:700;color:#334155;">
                                    ${esc(r.label)}
                                </td>
                                <td align="right" style="font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;">
                                    ${stats.guests.toLocaleString()} <span style="font-size:11px;font-weight:500;color:#64748b;">guests</span>
                                </td>
                            </tr>
                        </table>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td valign="middle">
                                    <div style="background:#f1f5f9;height:8px;border-radius:9999px;overflow:hidden;">
                                        <div style="background:${r.color};height:8px;border-radius:9999px;width:${barWidth}%;"></div>
                                    </div>
                                </td>
                                <td width="70" align="right" valign="middle" style="padding-left:12px;font-size:12px;font-weight:600;color:#64748b;white-space:nowrap;">
                                    ${stats.tasks} tasks
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>`;
        })
        .join("");

    // Split stages into 2 balanced columns matching Image 1 layout (Odd numbers left: 1, 3, 5, 7, 9, 11; Even right: 2, 4, 6, 8, 10)
    const leftStages = stages.filter((_, idx) => idx % 2 === 0);
    const rightStages = stages.filter((_, idx) => idx % 2 === 1);

    const renderStageCard = (s: (typeof stages)[number]) => {
        const idx = s.no - 1;
        const value = chartData.stagePending[idx] ?? 0;
        const pct = (value / chartData.maxStagePending) * 100;
        const barWidth = value === 0 ? 0 : Math.max(pct, 3);
        return `<div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:10px 14px;margin-bottom:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td width="30" valign="middle" align="center" style="width:30px;">
                        <div style="width:26px;height:26px;border-radius:50%;background:#1e293b;color:#ffffff;font-size:11px;font-weight:700;text-align:center;line-height:26px;">
                            ${s.no}
                        </div>
                    </td>
                    <td valign="middle" style="padding-left:10px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:5px;">
                            <tr>
                                <td align="left" style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;">
                                    ${esc(s.name)}
                                </td>
                                <td align="right" style="font-size:12px;font-weight:800;color:#0f172a;padding-left:8px;white-space:nowrap;">
                                    ${value}
                                </td>
                            </tr>
                        </table>
                        <div style="background:#e2e8f0;height:6px;border-radius:9999px;overflow:hidden;">
                            <div style="background:#6366f1;height:6px;border-radius:9999px;width:${barWidth}%;"></div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>`;
    };

    // Stage-wise pending table rows
    const pendingTableRows = pendingReport.table
        .map((row) => {
            const rowTotal = row.counts.reduce((a, b) => a + b, 0);
            const cells = row.counts
                .map((c) =>
                    c > 0
                        ? `<td style="padding:10px 4px;text-align:center;border-bottom:1px solid #f1f5f9;"><span style="display:inline-block;min-width:26px;padding:3px 6px;border-radius:4px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;text-align:center;">${c}</span></td>`
                        : `<td style="padding:10px 4px;text-align:center;border-bottom:1px solid #f1f5f9;color:#cbd5e1;font-weight:500;">-</td>`
                )
                .join("");
            return `<tr>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(row.emp)}</td>
                ${cells}
                <td style="padding:12px 14px;text-align:center;background:rgba(238,242,255,0.4);border-left:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
                    <span style="display:inline-block;min-width:28px;padding:3px 8px;border-radius:4px;background:#e0e7ff;color:#3730a3;font-size:12px;font-weight:700;text-align:center;">${rowTotal}</span>
                </td>
            </tr>`;
        })
        .join("");

    // Daily completed tasks table rows
    const doneTableRows = dailyDoneReport.table
        .map((row) => {
            const rowTotal = row.counts.reduce((a, b) => a + b, 0);
            const cells = row.counts
                .map((c) =>
                    c > 0
                        ? `<td style="padding:10px 4px;text-align:center;border-bottom:1px solid #ecfdf5;"><span style="display:inline-block;min-width:26px;padding:3px 6px;border-radius:4px;background:#d1fae5;color:#065f46;font-size:12px;font-weight:700;text-align:center;">${c}</span></td>`
                        : `<td style="padding:10px 4px;text-align:center;border-bottom:1px solid #ecfdf5;color:#cbd5e1;font-weight:500;">-</td>`
                )
                .join("");
            return `<tr>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #ecfdf5;white-space:nowrap;">${esc(row.emp)}</td>
                ${cells}
                <td style="padding:12px 14px;text-align:center;background:rgba(236,253,245,0.4);border-left:1px solid #ecfdf5;border-bottom:1px solid #ecfdf5;">
                    <span style="display:inline-block;min-width:28px;padding:3px 8px;border-radius:4px;background:#d1fae5;color:#065f46;font-size:12px;font-weight:700;text-align:center;">${rowTotal}</span>
                </td>
            </tr>`;
        })
        .join("");

    const preheader = `KTAHV CRR Process Report Alert · Active: ${chartData.totalActive} · Completed: ${chartData.totalComplete} · Pending: ${totalPending} · Done: ${totalDone} · ${displayDate}`;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>KTAHV CRR Process Report Alert · ${esc(reportDate)}</title>
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
<header style="background:linear-gradient(115deg, #14213d, #303f78);border-radius:20px;padding:30px 32px;color:#ffffff;box-shadow:0 14px 36px rgba(30,48,91,0.18);">
  <div style="font-size:11px;font-weight:700;letter-spacing:3px;opacity:0.55;text-transform:uppercase;margin-bottom:18px;color:#ffffff;">
    KAIRALI GROUP &nbsp;/&nbsp; CRR PROCESS MANAGEMENT
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td valign="top">
        <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
          KTAHV CRR Process Report Alert
        </h1>
        <p style="margin:8px 0 0;font-size:14px;font-weight:500;color:rgba(255,255,255,0.65);">
          ${SVG_ICONS.calendar}
          <span style="vertical-align:middle;margin-left:6px;">${esc(displayDate)} &nbsp;<small style="opacity:0.7;">IST</small></span>
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">
          Daily report snapshot · Stage-wise pendings · Completed tasks for management
        </p>
      </td>
    </tr>
  </table>

  <!-- Stat bar (4 KPIs matching page.tsx) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
    <tr>
      <td width="25%" valign="top">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:0.55;text-transform:uppercase;margin-bottom:4px;color:#ffffff;">
          ACTIVE GUESTS
        </div>
        <div style="font-size:28px;font-weight:800;color:#dbe7ff;line-height:1.1;">
          ${chartData.totalActive}
        </div>
      </td>
      <td width="25%" valign="top">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:0.55;text-transform:uppercase;margin-bottom:4px;color:#ffffff;">
          COMPLETED JOURNEYS
        </div>
        <div style="font-size:28px;font-weight:800;color:#86efac;line-height:1.1;">
          ${chartData.totalComplete}
        </div>
      </td>
      <td width="25%" valign="top">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:0.55;text-transform:uppercase;margin-bottom:4px;color:#ffffff;">
          TOTAL PENDING TASKS
        </div>
        <div style="font-size:28px;font-weight:800;color:#f6d99f;line-height:1.1;">
          ${totalPending}
        </div>
      </td>
      <td width="25%" valign="top">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:0.55;text-transform:uppercase;margin-bottom:4px;color:#ffffff;">
          DONE TODAY
        </div>
        <div style="font-size:28px;font-weight:800;color:#ffc9cf;line-height:1.1;">
          ${totalDone}
        </div>
      </td>
    </tr>
  </table>
</header>

<!-- PROCESS OVERVIEW SECTION -->
<section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-top:24px;overflow:hidden;">
  <!-- Section Header matching page.tsx -->
  <div style="background:#f8fafc;border-bottom:1px solid #f1f5f9;padding:14px 20px;">
    ${SVG_ICONS.barChart}
    <span style="font-size:18px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:8px;">Process Overview</span>
  </div>

  <div style="padding:24px;">
    <!-- Top 2 Cards: Total Journeys (Donut) & Workload by Role -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <!-- Left: Total Journeys Card -->
        <td width="38%" valign="top" style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:24px;text-align:center;">
          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px;">
            TOTAL JOURNEYS
          </div>
          ${donutSvg}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
            <tr>
              <td width="50%" align="center">
                <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:6px;vertical-align:middle;"></span>Active
                </div>
                <div style="font-size:18px;font-weight:700;color:#0f172a;">${chartData.totalActive}</div>
              </td>
              <td width="50%" align="center">
                <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;vertical-align:middle;"></span>Completed
                </div>
                <div style="font-size:18px;font-weight:700;color:#0f172a;">${chartData.totalComplete}</div>
              </td>
            </tr>
          </table>
        </td>

        <!-- Gap -->
        <td width="3%"></td>

        <!-- Right: Workload by Role Card -->
        <td width="59%" valign="top" style="background:#ffffff;border:1px solid #f1f5f9;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:20px;">
            WORKLOAD BY ROLE
          </div>
          ${roleBreakdownHTML}
        </td>
      </tr>
    </table>

    <!-- Bottom: Pending Actions by Stage (2 columns) -->
    <div style="margin-top:32px;">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;">
        PENDING ACTIONS BY STAGE
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- Left Column (Stages 1, 3, 5, 7, 9, 11) -->
          <td width="49%" valign="top">
            ${leftStages.map(renderStageCard).join("")}
          </td>
          <!-- Gap -->
          <td width="2%"></td>
          <!-- Right Column (Stages 2, 4, 6, 8, 10) -->
          <td width="49%" valign="top">
            ${rightStages.map(renderStageCard).join("")}
          </td>
        </tr>
      </table>
    </div>
  </div>
</section>

<!-- STAGE WISE PENDING REPORT TABLE -->
<section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-top:28px;overflow:hidden;">
  <!-- Section Header -->
  <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle">${SVG_ICONS.users}</td>
        <td valign="middle" style="padding-left:12px;">
          <div style="font-size:18px;font-weight:700;color:#1e293b;">Stage Wise Pending Report</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Detailed break-up of pending tasks per employee</div>
        </td>
      </tr>
    </table>
  </div>

  <div style="overflow-x:auto;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#334155;text-align:left;width:180px;white-space:nowrap;">Employee / Stage</th>
          ${stages
              .map(
                  (s) => `<th style="padding:8px 4px;text-align:center;font-weight:500;color:#475569;width:72px;">
              <div style="width:20px;height:20px;border-radius:50%;background:#ffffff;border:1px solid #cbd5e1;color:#475569;font-size:10px;font-weight:700;text-align:center;line-height:20px;margin:0 auto 3px;">${s.no}</div>
              <div style="font-size:10px;font-weight:500;color:#64748b;line-height:1.2;max-width:70px;margin:0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.name)}">${esc(s.name)}</div>
          </th>`
              )
              .join("")}
          <th style="padding:12px 14px;font-size:13px;font-weight:800;color:#0f172a;text-align:center;background:rgba(238,242,255,0.6);border-left:1px solid #e2e8f0;width:75px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${pendingTableRows || `<tr><td colspan="${stages.length + 2}" style="text-align:center;padding:24px;color:#64748b;">No pending tasks.</td></tr>`}
      </tbody>
      <tfoot>
        <tr style="background:#f8fafc;border-top:2px solid #cbd5e1;">
          <td style="padding:14px 14px;font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;">Grand Total</td>
          ${pendingReport.totals
              .map(
                  (tot) => `<td style="padding:10px 4px;text-align:center;">
              ${
                  tot > 0
                      ? `<span style="display:inline-block;min-width:28px;padding:4px 6px;border-radius:6px;background:#1e293b;color:#ffffff;font-size:11px;font-weight:700;text-align:center;">${tot}</span>`
                      : `<span style="color:#94a3b8;font-weight:500;font-size:11px;">0</span>`
              }
          </td>`
              )
              .join("")}
          <td style="padding:12px 14px;text-align:center;background:rgba(224,231,255,0.7);border-left:1px solid #cbd5e1;">
            <span style="display:inline-block;min-width:38px;padding:6px 12px;border-radius:8px;background:#4f46e5;color:#ffffff;font-size:13px;font-weight:800;text-align:center;box-shadow:0 1px 2px rgba(79,70,229,0.3);">${totalPending}</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>

<!-- DAILY COMPLETED REPORT TABLE -->
<section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-top:28px;overflow:hidden;">
  <!-- Section Header -->
  <div style="background:#ecfdf5;border-bottom:1px solid #d1fae5;padding:16px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle">${SVG_ICONS.checkCircle}</td>
        <td valign="middle" style="padding-left:12px;">
          <div style="font-size:18px;font-weight:700;color:#1e293b;">Daily Completed Tasks</div>
          <div style="font-size:12px;color:#047857;margin-top:2px;">tasks successfully completed by employees today</div>
        </td>
      </tr>
    </table>
  </div>

  <div style="overflow-x:auto;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
      <thead>
        <tr style="background:#f0fdf4;border-bottom:1px solid #d1fae5;">
          <th style="padding:12px 14px;font-size:12px;font-weight:700;color:#065f46;text-align:left;width:180px;background:rgba(236,253,245,0.8);white-space:nowrap;">Employee / Stage</th>
          ${stages
              .map(
                  (s) => `<th style="padding:8px 4px;text-align:center;font-weight:500;color:#065f46;width:72px;">
              <div style="width:20px;height:20px;border-radius:50%;background:#ffffff;border:1px solid #a7f3d0;color:#047857;font-size:10px;font-weight:700;text-align:center;line-height:20px;margin:0 auto 3px;">${s.no}</div>
              <div style="font-size:10px;font-weight:500;color:#047857;line-height:1.2;max-width:70px;margin:0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.name)}">${esc(s.name)}</div>
          </th>`
              )
              .join("")}
          <th style="padding:12px 14px;font-size:13px;font-weight:800;color:#065f46;text-align:center;background:rgba(209,250,229,0.5);border-left:1px solid #d1fae5;width:75px;">Total Done</th>
        </tr>
      </thead>
      <tbody>
        ${doneTableRows || `<tr><td colspan="${stages.length + 2}" style="text-align:center;padding:24px;color:#64748b;">No completed tasks recorded for this date.</td></tr>`}
      </tbody>
      <tfoot>
        <tr style="background:#ecfdf5;border-top:2px solid #a7f3d0;">
          <td style="padding:14px 14px;font-size:13px;font-weight:700;color:#065f46;white-space:nowrap;">Grand Total</td>
          ${dailyDoneReport.totals
              .map(
                  (tot) => `<td style="padding:10px 4px;text-align:center;">
              ${
                  tot > 0
                      ? `<span style="display:inline-block;min-width:28px;padding:4px 6px;border-radius:6px;background:#059669;color:#ffffff;font-size:11px;font-weight:700;text-align:center;">${tot}</span>`
                      : `<span style="color:rgba(4,120,87,0.6);font-weight:500;font-size:11px;">0</span>`
              }
          </td>`
              )
              .join("")}
          <td style="padding:12px 14px;text-align:center;background:#a7f3d0;border-left:1px solid #6ee7b7;">
            <span style="display:inline-block;min-width:38px;padding:6px 12px;border-radius:8px;background:#059669;color:#ffffff;font-size:13px;font-weight:800;text-align:center;box-shadow:0 1px 2px rgba(5,150,105,0.3);">${totalDone}</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>

<!--email-closing-->

<div style="font-size:11px;line-height:1.8;color:#64748b;padding:24px 4px 8px;text-align:center;">
  Kairali Group · CRR Process Report Alert · Generated ${esc(generatedAt)} · Asia/Kolkata
</div>

</td>
</tr>
</table>
</td>
</tr>
</table>

</body>
</html>`;
}
