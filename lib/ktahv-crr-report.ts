import type { CrrReportData } from "@/lib/email-triggers/load-crr-report";

const esc = (value: unknown) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const CRR_EMAIL_CSS = `*{box-sizing:border-box}
body{margin:0;padding:0;background:#f4f6fc;color:#24324b;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
h1,h2,h3,h4,p{margin:0}
img{display:block;border:0;outline:0;max-width:100%;height:auto}
.wrap{padding:12px 8px}
.hero{background:linear-gradient(115deg, #14213d, #303f78);color:#fff;border-radius:14px;padding:22px 18px}
.brand{font-size:11px;letter-spacing:2px;color:#93c5fd;font-weight:700;text-transform:uppercase;margin-bottom:6px}
.hero h1{font:700 24px/1.2 Georgia,'Times New Roman',serif;margin-bottom:6px;color:#fff}
.hero-sub{color:#cbd5e1;font-size:13px;line-height:1.5;margin-bottom:14px}
.grid{font-size:0;margin:0 -4px}
.g4{display:inline-block;width:50%;vertical-align:top;padding:4px;font-size:14px}
.kpi{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 12px}
.kpi-l{display:block;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:#bcd0f5;font-weight:700}
.kpi-v{display:block;font-size:22px;line-height:1.2;font-weight:800;margin-top:4px}
.card{background:#fff;border:1px solid #e0e5f1;border-radius:12px;padding:18px;margin-top:14px}
.eyebrow{display:block;font-size:10px;letter-spacing:1.6px;color:#4338ca;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.card h2{font-size:18px;line-height:1.3;color:#1e305b;margin-bottom:4px}
.card h3{font-size:15px;line-height:1.3;color:#1e305b;margin:18px 0 8px}
.sub{color:#64748b;font-size:12px;line-height:1.5;margin-bottom:12px}
.split{width:100%}
.split>tbody>tr>td{display:block;width:100%}
.chart{text-align:center;padding:8px 0 16px}
.role-row{margin-bottom:12px}
.role-header{display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#334155;margin-bottom:4px}
.bar-track{background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden}
.bar-fill{height:8px;border-radius:4px}
.stage-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px}
.stage-card{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0}
.stage-badge{width:24px;height:24px;border-radius:50%;background:#1e293b;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stage-meta{flex:1;min-width:0}
.stage-title-row{display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#1e293b;margin-bottom:3px}
.rt{width:100%;border-collapse:collapse;font-size:12px}
.rt th{background:#f1f5f9;color:#334155;font-weight:700;padding:8px 6px;text-align:center;border:1px solid #e2e8f0}
.rt th:first-child{text-align:left;min-width:140px;background:#eef2ff;color:#1e305b}
.rt td{padding:8px 6px;text-align:center;border:1px solid #e2e8f0;font-size:12px}
.rt td:first-child{text-align:left;font-weight:600;color:#1e293b;background:#fff}
.rt tfoot td{font-weight:700;background:#f8fafc;border-top:2px solid #cbd5e1}
.rt tfoot td:first-child{background:#f1f5f9;color:#0f172a}
.badge-pending{display:inline-block;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:700;font-size:11px}
.badge-done{display:inline-block;padding:2px 6px;border-radius:4px;background:#d1fae5;color:#065f46;font-weight:700;font-size:11px}
.badge-total-pending{display:inline-block;padding:3px 8px;border-radius:6px;background:#4338ca;color:#fff;font-weight:800;font-size:12px}
.badge-total-done{display:inline-block;padding:3px 8px;border-radius:6px;background:#059669;color:#fff;font-weight:800;font-size:12px}
.foot{font-size:11px;line-height:1.8;color:#64748b;padding:16px 4px 4px;text-align:center}
@media (min-width:621px){
.wrap{padding:24px 16px}
.hero{padding:28px 30px}
.hero h1{font-size:30px}
.g4{width:25%}
.split>tbody>tr>td{display:table-cell;width:auto;vertical-align:middle}
.split .chart{width:240px;padding:0 24px 0 0}
.stage-grid{grid-template-columns:1fr 1fr}
}
@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}body{background:#fff}.wrap{padding:0}.card,.hero{break-inside:avoid}}`;

export function buildCrrJourneyDonutSvg(active: number, complete: number): string {
    const total = active + complete;
    if (total <= 0) return "";
    const cx = 95, cy = 95, r = 62, sw = 22, circ = 2 * Math.PI * r;
    const activeLen = (active / total) * circ;
    const completeLen = circ - activeLen;
    const off1 = circ / 4;
    const off2 = off1 - activeLen;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 190" width="190" height="190" style="display:block;margin:0 auto" role="img" aria-label="Journey Status Donut Chart"><title>Total Journeys</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f59e0b" stroke-width="${sw}" stroke-dasharray="${activeLen.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${off1.toFixed(2)}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#10b981" stroke-width="${sw}" stroke-dasharray="${completeLen.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${off2.toFixed(2)}"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" fill="#0f172a" font-weight="800" font-family="Arial,sans-serif">${total}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="700" font-family="Arial,sans-serif" letter-spacing="1">GUESTS</text></svg>`;
}

export function exportCrrReportHTML(data: CrrReportData, scope: string = "KTAHV"): string {
    const { reportDate, displayDate, generatedAt, pendingReport, dailyDoneReport, chartData, stages } = data;

    const totalPending = pendingReport.totals.reduce((a, b) => a + b, 0);
    const totalDone = dailyDoneReport.totals.reduce((a, b) => a + b, 0);

    const kpis: [string, string, string][] = [
        ["ACTIVE GUESTS", String(chartData.totalActive), "#dbe7ff"],
        ["COMPLETED JOURNEYS", String(chartData.totalComplete), "#86efac"],
        ["TOTAL PENDING TASKS", String(totalPending), "#f6d99f"],
        ["DONE ON DATE", String(totalDone), "#ffc9cf"],
    ];

    const donutSvg = buildCrrJourneyDonutSvg(chartData.totalActive, chartData.totalComplete);

    // Role breakdown bars
    const roleColors: Record<string, string> = {
        GRE: "#0284c7",
        Doctor: "#0d9488",
        FO: "#9333ea",
        GM: "#d97706",
    };
    const roleLabels: Record<string, string> = {
        GRE: "Guest Relations Executive (GRE)",
        Doctor: "Doctor",
        FO: "Front Office (FO)",
        GM: "General Manager (GM)",
    };

    const roleBreakdownHTML = Object.entries(roleColors)
        .map(([key, color]) => {
            const stats = chartData.roleStats[key] || { tasks: 0, guests: 0 };
            const pct = chartData.totalRoleWorkload > 0 ? (stats.tasks / chartData.totalRoleWorkload) * 100 : 0;
            return `<div class="role-row">
                <div class="role-header">
                    <span>${esc(roleLabels[key] || key)}</span>
                    <span>${stats.guests} guests · <strong>${stats.tasks} tasks</strong></span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="background:${color};width:${Math.max(pct, stats.tasks > 0 ? 3 : 0)}%"></div>
                </div>
            </div>`;
        })
        .join("");

    // Stage pending bars
    const stageBarsHTML = stages
        .map((s, idx) => {
            const value = chartData.stagePending[idx] ?? 0;
            const pct = (value / chartData.maxStagePending) * 100;
            return `<div class="stage-card">
                <div class="stage-badge">${s.no}</div>
                <div class="stage-meta">
                    <div class="stage-title-row">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">${esc(s.name)}</span>
                        <span>${value} pending</span>
                    </div>
                    <div class="bar-track" style="height:6px;">
                        <div class="bar-fill" style="background:#6366f1;height:6px;width:${Math.max(pct, value > 0 ? 3 : 0)}%"></div>
                    </div>
                </div>
            </div>`;
        })
        .join("");

    // Stage-wise pending table rows
    const pendingTableRows = pendingReport.table
        .map((row) => {
            const rowTotal = row.counts.reduce((a, b) => a + b, 0);
            const cells = row.counts
                .map((c) =>
                    c > 0
                        ? `<td><span class="badge-pending">${c}</span></td>`
                        : `<td style="color:#cbd5e1;">-</td>`
                )
                .join("");
            return `<tr><td>${esc(row.emp)}</td>${cells}<td style="font-weight:700;background:#eef2ff;"><span class="badge-total-pending">${rowTotal}</span></td></tr>`;
        })
        .join("");

    // Daily completed tasks table rows
    const doneTableRows = dailyDoneReport.table
        .map((row) => {
            const rowTotal = row.counts.reduce((a, b) => a + b, 0);
            const cells = row.counts
                .map((c) =>
                    c > 0
                        ? `<td><span class="badge-done">${c}</span></td>`
                        : `<td style="color:#cbd5e1;">-</td>`
                )
                .join("");
            return `<tr><td>${esc(row.emp)}</td>${cells}<td style="font-weight:700;background:#ecfdf5;"><span class="badge-total-done">${rowTotal}</span></td></tr>`;
        })
        .join("");

    const preheader = `CRR Process Alert · Active: ${chartData.totalActive} · Pending: ${totalPending} · Done: ${totalDone} · ${displayDate}`;

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
<style>${CRR_EMAIL_CSS}</style>
</head>
<body style="margin:0;padding:0;background:#f4f6fc;color:#24324b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f6fc">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f6fc">
<tr>
<td align="center" class="wrap" style="padding:12px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:860px;text-align:left">
<tr>
<td>
<!--email-intro-->
<header class="hero" style="background:linear-gradient(115deg, #14213d, #303f78);color:#ffffff;border-radius:14px;padding:22px 18px">
  <div class="brand">KAIRALI GROUP · CRR PROCESS MANAGEMENT</div>
  <h1 style="color:#ffffff;">KTAHV CRR Process Report Alert</h1>
  <p class="hero-sub">${esc(displayDate)} · IST<br>Kairali – The Ayurvedic Healing Village</p>
  <div class="grid">
    ${kpis
        .map(
            ([k, v, col]) => `<div class="g4">
      <div class="kpi">
        <span class="kpi-l">${esc(k)}</span>
        <strong class="kpi-v" style="color:${col}">${esc(v)}</strong>
      </div>
    </div>`
        )
        .join("")}
  </div>
</header>

<!-- PROCESS OVERVIEW SECTION -->
<section class="card">
  <span class="eyebrow">PROCESS SNAPSHOT</span>
  <h2>Journey &amp; Workload Overview</h2>
  <p class="sub">Live status distribution of guests across CRR stages and roles</p>
  
  <table role="presentation" class="split" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="chart" align="center" valign="middle">
        ${donutSvg}
        <div style="margin-top:10px;font-size:12px;font-weight:700;color:#475569;">
          <span style="color:#f59e0b;">●</span> Active (${chartData.totalActive}) &nbsp;&nbsp;
          <span style="color:#10b981;">●</span> Completed (${chartData.totalComplete})
        </div>
      </td>
      <td valign="top">
        <div style="padding:4px 0 8px;">
          <strong style="display:block;font-size:13px;color:#1e305b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Workload by Role</strong>
          ${roleBreakdownHTML}
        </div>
      </td>
    </tr>
  </table>

  <h3 style="margin-top:20px;">Pending Actions by Stage</h3>
  <div class="stage-grid">
    ${stageBarsHTML}
  </div>
</section>

<!-- STAGE WISE PENDING REPORT TABLE -->
<section class="card" style="overflow-x:auto;">
  <span class="eyebrow">PENDING WORKLOAD</span>
  <h2>Stage Wise Pending Report</h2>
  <p class="sub">Detailed break-up of current pending tasks assigned to each team member</p>
  
  <table class="rt" cellpadding="0" cellspacing="0" border="0">
    <thead>
      <tr>
        <th>Employee</th>
        ${stages.map((s) => `<th title="${esc(s.name)}">S${s.no}</th>`).join("")}
        <th style="background:#e0e7ff;color:#3730a3;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${pendingTableRows || `<tr><td colspan="${stages.length + 2}" style="text-align:center;padding:16px;color:#64748b;">No pending tasks.</td></tr>`}
    </tbody>
    <tfoot>
      <tr>
        <td>Grand Total</td>
        ${pendingReport.totals.map((tot) => `<td><strong>${tot}</strong></td>`).join("")}
        <td style="background:#e0e7ff;"><span class="badge-total-pending">${totalPending}</span></td>
      </tr>
    </tfoot>
  </table>
</section>

<!-- DAILY COMPLETED REPORT TABLE -->
<section class="card" style="overflow-x:auto;">
  <span class="eyebrow" style="color:#059669;">COMPLETIONS FOR ${esc(reportDate)}</span>
  <h2>Daily Completed Tasks</h2>
  <p class="sub">Tasks successfully recorded and completed on ${esc(displayDate)}</p>
  
  <table class="rt" cellpadding="0" cellspacing="0" border="0">
    <thead>
      <tr style="background:#ecfdf5;">
        <th style="background:#d1fae5;color:#065f46;">Employee</th>
        ${stages.map((s) => `<th title="${esc(s.name)}">S${s.no}</th>`).join("")}
        <th style="background:#d1fae5;color:#065f46;">Total Done</th>
      </tr>
    </thead>
    <tbody>
      ${doneTableRows || `<tr><td colspan="${stages.length + 2}" style="text-align:center;padding:16px;color:#64748b;">No completed tasks recorded for this date.</td></tr>`}
    </tbody>
    <tfoot>
      <tr style="background:#ecfdf5;">
        <td style="color:#065f46;">Grand Total</td>
        ${dailyDoneReport.totals.map((tot) => `<td><strong>${tot}</strong></td>`).join("")}
        <td style="background:#a7f3d0;"><span class="badge-total-done">${totalDone}</span></td>
      </tr>
    </tfoot>
  </table>
</section>
<!--email-closing-->

<div class="foot">
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
