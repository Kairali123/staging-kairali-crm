// Doctor Consultation Report — email digest builder.
// Visual system deliberately mirrors lib/daily-sales-report.ts's exportSalesHTML so this
// report reads as "the same professional format" across the CRM's scheduled email family.

export type DoctorConsultSourceRow = {
  source: string
  totalConsults: number
  done: number
  cancelled: number
  pending: number
  converted: number
  conversionRate: number
  revenue: number
}

export type DoctorConsultDoctorRow = {
  doctorName: string
  specialization: string
  totalConsults: number
  done: number
  converted: number
  conversionRate: number
  avgSlaMinutes: number
  revenue: number
}

type TotalsLike = { totalConsults: number; done: number; cancelled: number; pending: number; converted?: number; conversionRate: number; revenue: number }
type SourceRowLike = { source: string; totalConsults: number; done: number; cancelled: number; pending: number; converted: number; conversionRate: number; revenue: number }

export type DoctorConsultDigest = {
  periodLabel: string
  company: string
  generatedAt: string
  kpis: { totalConsults: number; done: number; cancelled: number; pending: number; conversionRate: number; revenue: number }
  /** Weekly Doctor Consultation Report — same aggregation the page's Weekly section uses
   *  (sample records over the selected week), not the GAS feed. Optional: omitted entirely
   *  when not supplied, same as the Doctors Performance section. */
  weekly?: { label: string; rows: DoctorConsultSourceRow[]; totals: TotalsLike }
  sourceRows: DoctorConsultSourceRow[]
  doctorRows: DoctorConsultDoctorRow[]
}

const toSourceRow = (r: SourceRowLike): DoctorConsultSourceRow => ({ source: r.source, totalConsults: r.totalConsults, done: r.done, cancelled: r.cancelled, pending: r.pending, converted: r.converted, conversionRate: r.conversionRate, revenue: r.revenue })

/** All-zero / empty digest — used until the report's underlying data source is real
 *  (see app/api/doctor/report/route.ts, which currently returns hardcoded sample data
 *  for everything except the Overall Cumulative section). Never send fabricated numbers. */
export function blankDoctorConsultDigest(periodLabel: string, company: string): DoctorConsultDigest {
  return {
    periodLabel,
    company,
    generatedAt: new Date().toISOString(),
    kpis: { totalConsults: 0, done: 0, cancelled: 0, pending: 0, conversionRate: 0, revenue: 0 },
    sourceRows: [],
    doctorRows: [],
  }
}

/** Built from app/api/doctor/report/route.ts's fetchLiveDoctorReport() — the one section of
 *  that page backed by a real, manually verified Google Apps Script feed (Overall Cumulative,
 *  all-time). Doctors Performance still has no live source, so it's never populated here.
 *  `weekly`, if supplied, is the same sample-data aggregation the page's Weekly section uses
 *  (aggregateConsultationsBySource over SAMPLE_CONSULTATION_RECORDS) — not GAS-sourced. */
export function liveDoctorConsultDigest(
  sourceRows: SourceRowLike[],
  totals: TotalsLike,
  periodLabel: string,
  company: string,
  weekly?: { label: string; rows: SourceRowLike[]; totals: TotalsLike },
): DoctorConsultDigest {
  return {
    periodLabel,
    company,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalConsults: totals.totalConsults,
      done: totals.done,
      cancelled: totals.cancelled,
      pending: totals.pending,
      conversionRate: totals.conversionRate,
      revenue: totals.revenue,
    },
    weekly: weekly ? { label: weekly.label, rows: weekly.rows.map(toSourceRow), totals: weekly.totals } : undefined,
    sourceRows: sourceRows.map(toSourceRow),
    doctorRows: [],
  }
}

export const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
export const pct = (value: number) => `${value.toFixed(1)}%`

// Same mobile-first responsive system as SALES_EMAIL_CSS (daily-sales-report.ts): stacked
// cards below 621px, real tables and multi-column KPI grid above it.
const DOCTOR_CONSULT_EMAIL_CSS = `*{box-sizing:border-box}
body{margin:0;padding:0;background:#f4f6fc;color:#24324b;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
h1,h2,h3,p{margin:0}
img{display:block;border:0;outline:0;max-width:100%;height:auto}
.wrap{padding:12px 8px}
.hero{background:#1e305b;color:#fff;border-radius:14px;padding:20px 16px}
.brand{font-size:11px;letter-spacing:1.6px;color:#93c5fd;font-weight:700;text-transform:uppercase;margin-bottom:6px}
.hero h1{font:400 26px/1.2 Georgia,'Times New Roman',serif;margin-bottom:8px}
.hero-sub{color:#cbd5e1;font-size:13px;line-height:1.6;margin-bottom:12px}
.hero-note{color:#cbd5e1;font-size:12px;margin-top:8px}
.grid{font-size:0;margin:0 -4px}
.g3,.g6{display:inline-block;width:50%;vertical-align:top;padding:4px;font-size:14px}
.kpi{background:#2c4174;border-radius:10px;padding:10px 12px}
.kpi-l{display:block;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:#bcd0f5}
.kpi-v{display:block;font-size:16px;line-height:1.3;font-weight:700;color:#fff;margin-top:4px;overflow-wrap:anywhere}
.card{background:#fff;border:1px solid #e0e5f1;border-radius:12px;padding:16px;margin-top:12px}
.eyebrow{display:block;font-size:10px;letter-spacing:1.6px;color:#4338ca;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.card h2{font-size:18px;line-height:1.3;color:#1e305b;margin-bottom:4px}
.sub{color:#64748b;font-size:12px;line-height:1.5;margin-bottom:12px}
.stack{width:100%;margin-bottom:8px}
.stack>tbody>tr>td{display:block;width:100%}
.meta{font-size:11px;line-height:1.7;color:#64748b;padding-top:4px}
.rt{width:100%}
.rt thead{display:none}
.rt tbody,.rt tfoot,.rt tr,.rt td{display:block;width:100%}
.rt tr{border:1px solid #e5eaf4;border-radius:10px;margin:0 0 10px;overflow:hidden;background:#fff}
.rt td{padding:7px 12px;border-bottom:1px solid #eef1f8;text-align:right;font-size:13px;overflow:hidden}
.rt td:first-child{background:#eef2ff;text-align:left;font-weight:700;font-size:15px;color:#1e305b}
.rt td:last-child{border-bottom:0}
.rt td.empty{background:none;text-align:center;font-weight:400;font-size:13px;color:#64748b}
.rt tfoot tr{background:#eef2ff;border-color:#c7d2fe}
.rt tfoot td{background:none;border-bottom-color:#dde3f6}
.rt tfoot td:first-child{color:#1e305b}
.lbl{float:left;padding-right:12px;text-align:left;color:#64748b;font-weight:600;font-size:12px}
.foot{font-size:12px;line-height:1.8;color:#64748b;padding:16px 4px 4px}
@media (min-width:621px){
.wrap{padding:24px 16px}
.hero{padding:28px 30px}
.hero h1{font-size:32px}
.g3{width:16.666%}
.g6{width:33.333%}
.kpi-v{font-size:20px}
.card{padding:24px}
.card h2{font-size:20px}
.meta{text-align:right;padding-top:0}
.rt thead{display:table-header-group}
.rt tbody{display:table-row-group}
.rt tfoot{display:table-footer-group}
.rt tr{display:table-row;border:0;border-radius:0;margin:0;overflow:visible;background:none}
.rt td,.rt th{display:table-cell;width:auto;padding:11px 9px;border-bottom:1px solid #e5eaf4;text-align:right;font-size:13px;overflow:visible}
.rt th{background:#eef2ff;color:#24324b;font-size:12px;font-weight:700}
.rt td:first-child,.rt th:first-child{text-align:left;background:none;font-size:13px;font-weight:600;color:inherit}
.rt th:first-child{background:#eef2ff}
.rt td:last-child{border-bottom:1px solid #e5eaf4}
.rt td.empty{text-align:center}
.rt tfoot tr{background:none}
.rt tfoot td,.rt tfoot td:first-child{background:#eef2ff;font-weight:700;border-bottom:0}
.lbl{display:none}
}
@page{size:A4;margin:10mm}
@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}body{background:#fff}.wrap{padding:0}.rt tr{break-inside:avoid}.card,.hero{break-inside:avoid}}`

export function buildDoctorConsultDigestHTML(digest: DoctorConsultDigest): string {
  const lbl = (text: string) => `<span class="lbl">${text}</span>`
  const k = digest.kpis

  const kpis: [string, string][] = [
    ['Total Consults', String(k.totalConsults)],
    ['Done', String(k.done)],
    ['Cancelled', String(k.cancelled)],
    ['Pending', String(k.pending)],
    ['Conversion Rate', pct(k.conversionRate)],
    ['Revenue', money(k.revenue)],
  ]

  const sourceHeaders = ['Enquiry Source', 'Total Consults', 'Done', 'Cancelled', 'Pending', 'Converted', 'Conv. %', 'Revenue']
  const sourceBody = digest.sourceRows.map(r =>
    `<tr><td>${esc(r.source)}</td><td>${lbl('Total Consults')}${r.totalConsults}</td><td>${lbl('Done')}${r.done}</td><td>${lbl('Cancelled')}${r.cancelled}</td><td>${lbl('Pending')}${r.pending}</td><td>${lbl('Converted')}${r.converted}</td><td>${lbl('Conv. %')}${pct(r.conversionRate)}</td><td>${lbl('Revenue')}${money(r.revenue)}</td></tr>`
  ).join('')
  const sourceTotals = digest.sourceRows.reduce((a, r) => ({ totalConsults: a.totalConsults + r.totalConsults, done: a.done + r.done, cancelled: a.cancelled + r.cancelled, pending: a.pending + r.pending, converted: a.converted + r.converted, revenue: a.revenue + r.revenue }), { totalConsults: 0, done: 0, cancelled: 0, pending: 0, converted: 0, revenue: 0 })

  const sourceHTML = `<section class="card">
   <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><span class="eyebrow">SOURCE-WISE BREAKDOWN · ALL-TIME</span><h2>Consultations by Source — Over All Total</h2></td><td class="meta">${esc(digest.periodLabel)}</td></tr></table>
   <table class="rt" width="100%" cellpadding="0" cellspacing="0" border="0"><thead><tr>${sourceHeaders.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${sourceBody || '<tr><td class="empty" colspan="8">No consultation records for this period.</td></tr>'}</tbody><tfoot><tr><td>Grand total</td><td>${lbl('Total Consults')}${sourceTotals.totalConsults}</td><td>${lbl('Done')}${sourceTotals.done}</td><td>${lbl('Cancelled')}${sourceTotals.cancelled}</td><td>${lbl('Pending')}${sourceTotals.pending}</td><td>${lbl('Converted')}${sourceTotals.converted}</td><td>${lbl('Conv. %')}—</td><td>${lbl('Revenue')}${money(sourceTotals.revenue)}</td></tr></tfoot></table>
  </section>`

  // Weekly Doctor Consultation Report — omitted entirely when not supplied (same
  // "don't show what has no data behind it" rule as Doctors Performance below).
  const weeklyHTML = !digest.weekly ? '' : (() => {
    const w = digest.weekly!
    const wBody = w.rows.map(r =>
      `<tr><td>${esc(r.source)}</td><td>${lbl('Total Consults')}${r.totalConsults}</td><td>${lbl('Done')}${r.done}</td><td>${lbl('Cancelled')}${r.cancelled}</td><td>${lbl('Pending')}${r.pending}</td><td>${lbl('Converted')}${r.converted}</td><td>${lbl('Conv. %')}${pct(r.conversionRate)}</td><td>${lbl('Revenue')}${money(r.revenue)}</td></tr>`
    ).join('')
    return `<section class="card">
   <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><span class="eyebrow">WEEKLY BREAKDOWN</span><h2>Weekly Doctor Consultation Report</h2></td><td class="meta">${esc(w.label)}</td></tr></table>
   <table class="rt" width="100%" cellpadding="0" cellspacing="0" border="0"><thead><tr>${sourceHeaders.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${wBody || '<tr><td class="empty" colspan="8">No consultation records for this week.</td></tr>'}</tbody><tfoot><tr><td>Grand total</td><td>${lbl('Total Consults')}${w.totals.totalConsults}</td><td>${lbl('Done')}${w.totals.done}</td><td>${lbl('Cancelled')}${w.totals.cancelled}</td><td>${lbl('Pending')}${w.totals.pending}</td><td>${lbl('Converted')}${w.totals.converted ?? 0}</td><td>${lbl('Conv. %')}—</td><td>${lbl('Revenue')}${money(w.totals.revenue)}</td></tr></tfoot></table>
  </section>`
  })()

  const doctorHeaders = ['Doctor', 'Specialization', 'Total Consults', 'Done', 'Converted', 'Conv. %', 'Avg SLA', 'Revenue']
  const doctorBody = digest.doctorRows.map(r =>
    `<tr><td>${esc(r.doctorName)}</td><td>${lbl('Specialization')}${esc(r.specialization)}</td><td>${lbl('Total Consults')}${r.totalConsults}</td><td>${lbl('Done')}${r.done}</td><td>${lbl('Converted')}${r.converted}</td><td>${lbl('Conv. %')}${pct(r.conversionRate)}</td><td>${lbl('Avg SLA')}${r.avgSlaMinutes}m</td><td>${lbl('Revenue')}${money(r.revenue)}</td></tr>`
  ).join('')

  // Omitted entirely (not shown as an empty table) when there are no rows — this section has
  // no live data source yet, so "no records for this period" would be misleading; it isn't
  // that the period is empty, it's that nothing feeds this table at all right now.
  const doctorHTML = digest.doctorRows.length === 0 ? '' : `<section class="card">
   <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><span class="eyebrow">DOCTOR PERFORMANCE</span><h2>Doctors performance</h2></td><td class="meta">${esc(digest.periodLabel)}</td></tr></table>
   <table class="rt" width="100%" cellpadding="0" cellspacing="0" border="0"><thead><tr>${doctorHeaders.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${doctorBody}</tbody></table>
  </section>`

  const preheader = `Doctor Consultation Report · ${digest.periodLabel} · ${k.totalConsults} consults`

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Doctor Consultation Report Alert · ${esc(digest.periodLabel)}</title><style>${DOCTOR_CONSULT_EMAIL_CSS}</style></head><body style="margin:0;padding:0;background:#f4f6fc;color:#24324b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f6fc">${esc(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f6fc"><tr><td align="center" class="wrap" style="padding:12px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:800px;text-align:left"><tr><td><!--email-intro--><header class="hero" style="background:#1e305b;color:#ffffff;border-radius:14px;padding:20px 16px"><div class="brand">KAIRALI GROUP · DOCTOR CONSULTATION REPORT</div><h1>Doctor Consultation Report</h1><p class="hero-sub">${esc(digest.periodLabel)}<br>${esc(digest.company)}</p><div class="grid">${kpis.map(([label, val]) => `<div class="g3"><div class="kpi"><span class="kpi-l">${label}</span><strong class="kpi-v">${val}</strong></div></div>`).join('')}</div></header>${weeklyHTML}${sourceHTML}${doctorHTML}<!--email-closing--><div class="foot">Prepared for Executive &amp; DME &middot; Generated ${esc(digest.generatedAt)} &middot; Amounts in INR</div></td></tr></table></td></tr></table></body></html>`
}
