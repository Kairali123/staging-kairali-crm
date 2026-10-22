// lib/ktahv-daily-sales-report.ts
// Comprehensive KTAHV Daily Sales Report Generator & HTML Email Builder

export interface PlannedVsActualMetric {
  category: string
  actualVerified: number
  target: number
  shortfallPct: number
  note?: string
}

export interface QuantityMetric {
  category: string
  actual: number
  target: number
  shortfallPct: number
}

export interface OperationalMetric {
  metric: string
  actual: number | string
  target: number | string
  shortfallPct: number
}

export interface WeeklyRunRate {
  week: string
  calls: number
  upload: number
  convertedQty: number
  verifiedSaleAmt: number
}

export interface SalespersonPerformance {
  rank: number
  salesPerson: string
  // Orders
  plannedTotalOrders: number
  actualUnverifiedOrders: number
  actualVerifiedOrders: number
  orderTargetAchievedPct: number
  plannedNBDOrders: number
  actualVerifiedNBDOrders: number
  nbdOrderAchievedPct: number
  plannedCRROrders: number
  actualVerifiedCRROrders: number
  crrOrderAchievedPct: number
  // Values
  plannedTotalSaleValue: number
  unverifiedActualSaleAmount: number
  verifiedActualSaleAmount: number
  saleValueAchievedPct: number
  plannedNBDSaleValue: number
  actualNBDSaleAmount: number
  nbdSaleAchievedPct: number
  plannedCRRSaleValue: number
  actualCRRSaleAmount: number
  crrSaleAchievedPct: number
  // Calling Activity
  totalCallsUploaded: number
  callsFromAppsheet: number
  callsFromDialer: number
  totalLeadsDoneAppsheet: number
  newLeadsDoneAppsheet: number
  followupLeadsDoneAppsheet: number
  totalLeadsDoneDialer: number
  newLeadsDoneDialer: number
  followupLeadsDoneDialer: number
  // Appsheet Pending
  pendingTotalTillDate: number
  pendingFreshTillDate: number
  pendingFollowupTillDate: number
  // Collections
  collectionAmount: number
  collectionPct: number
  pendingPayments: number
  pendingPaymentsPct: number
}

export interface CancelledBooking {
  bookingDateTime: string
  reservationId: string
  guestId?: string
  clientName: string
  mobile?: string
  email?: string
  billingAddress?: string
  country?: string
  arrivalDate: string
  departureDate: string
  daysOfStay: number
  packageName: string
  roomCategory: string
  invoiceAmount: number
  bookingTakenBy: string
  bookingType: string
  dataSource?: string
  piNumber?: string
  piLink?: string
  actionStatus?: string
  doerRemarks?: string
  pmsStatus?: string
  accountsStatus?: string
  accountsRemarks?: string
  foStatus?: string
  foRemarks?: string
  cancelledDate: string
}

export interface ComplimentaryBooking {
  bookingDateTime: string       // Date & time booking was made
  reservationId: string
  clientName: string
  mobile?: string
  arrivalDate: string
  departureDate: string
  daysOfStay: number
  packageName: string
  roomCategory: string
  bookingTakenBy: string
  remarks?: string
  pmsStatus?: string
}

export interface DiscountItem {
  rank: number
  salesPerson: string
  totalBookingAmountBeforeDiscount: number
  avgDiscountPct: number
  totalDiscountAmount: number
  totalInvoiceAmount: number
}

export interface MarketingLeadDaily {
  date: string
  targetLead: number
  freshLead: number
  crrLead: number
  actualLead: number
  targetAchievedPct: number
}

export interface KtahvDailySalesReportData {
  reportDate: string
  dateRange: { from: string; to: string }
  generatedAt: string
  company: 'KTAHV'
  
  // High-level Financial Badges
  financialBadges: {
    bookingsVerifiedPending: number
    collectionAmountPending: number
    collectionAmountDone: number
    bookingCancelledAmount: number
  }

  // Planned vs Actual
  amountMetrics: PlannedVsActualMetric[]
  quantityMetrics: QuantityMetric[]
  operationalMetrics: OperationalMetric[]
  weeklyBreakdown: WeeklyRunRate[]

  // Main Leaderboard
  salespeople: SalespersonPerformance[]
  salespeopleTotal: SalespersonPerformance

  // Cancellations
  cancelledBookings: CancelledBooking[]

  // Complimentary Bookings
  complimentaryBookings: ComplimentaryBooking[]

  // Discount Governance
  discountReport: DiscountItem[]
  discountTotal: {
    totalBookingAmountBeforeDiscount: number
    avgDiscountPct: number
    totalDiscountAmount: number
    totalInvoiceAmount: number
  }

  // Marketing Lead Summary
  marketingLeads: MarketingLeadDaily[]
}

export const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

export const formatNum = (val: number): string => {
  return new Intl.NumberFormat('en-IN').format(val)
}

export const formatPct = (val: number): string => {
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(2)}%`
}

// Full styled HTML email generator for KTAHV Daily Sales Report
export function exportKtahvDailySalesHTML(data: KtahvDailySalesReportData): string {
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

  const totalAmountActual = data.amountMetrics.find(m => m.category === 'TOTAL')?.actualVerified || 0
  const totalAmountTarget = data.amountMetrics.find(m => m.category === 'TOTAL')?.target || 0
  const totalAmountShortfall = data.amountMetrics.find(m => m.category === 'TOTAL')?.shortfallPct || 0

  const totalQtyActual = data.quantityMetrics.find(m => m.category === 'TOTAL')?.actual || 0
  const totalQtyTarget = data.quantityMetrics.find(m => m.category === 'TOTAL')?.target || 0
  const totalQtyShortfall = data.quantityMetrics.find(m => m.category === 'TOTAL')?.shortfallPct || 0

  const badgeColor = (val: number) => val >= 0 ? '#10b981' : '#ef4444'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KTAHV Daily Sales Report · ${esc(data.reportDate)}</title>
  <style>
    body { margin:0; padding:0; background:#0b1329; color:#1e293b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    table { border-collapse:collapse; }
    .wrap { max-width:1100px; margin:0 auto; padding:20px 12px; }
    .hero { background:linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d9488 100%); color:#ffffff; border-radius:16px; padding:32px 28px; box-shadow:0 12px 36px rgba(0,0,0,0.25); }
    .brand { font-size:11px; letter-spacing:2px; font-weight:700; color:#5eead4; text-transform:uppercase; margin-bottom:8px; }
    .hero h1 { margin:0 0 8px; font-size:30px; font-weight:800; letter-spacing:-0.5px; }
    .hero-sub { color:#94a3b8; font-size:14px; margin:0 0 24px; }
    .stat-row { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:8px; }
    .stat-card { flex:1; min-width:180px; background:rgba(255,255,255,0.08); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:16px; }
    .stat-card .label { font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#cbd5e1; display:block; margin-bottom:6px; }
    .stat-card .value { font-size:22px; font-weight:800; color:#ffffff; display:block; }
    .stat-card .subtext { font-size:12px; margin-top:4px; display:block; }
    .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:24px; margin-top:20px; box-shadow:0 4px 16px rgba(15,23,42,0.04); }
    .card-title { font-size:18px; font-weight:700; color:#0f172a; margin:0 0 4px; }
    .card-subtitle { font-size:12px; color:#64748b; margin:0 0 16px; }
    .rt { width:100%; font-size:12px; text-align:left; border-collapse:collapse; }
    .rt th { background:#f1f5f9; color:#475569; font-size:11px; font-weight:700; text-transform:uppercase; padding:10px 12px; border-bottom:2px solid #cbd5e1; }
    .rt td { padding:10px 12px; border-bottom:1px solid #f1f5f9; color:#334155; }
    .rt tr:hover { background:#f8fafc; }
    .rt tfoot td { background:#f8fafc; font-weight:700; border-top:2px solid #cbd5e1; color:#0f172a; }
    .text-right { text-align:right; }
    .text-center { text-align:center; }
    .badge { display:inline-block; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; }
    .badge-green { background:#d1fae5; color:#065f46; }
    .badge-red { background:#fee2e2; color:#991b1b; }
    .badge-amber { background:#fef3c7; color:#92400e; }
    .badge-blue { background:#dbeafe; color:#1e40af; }
    .cta-btn { display:inline-block; background:#0d9488; color:#ffffff !important; text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:700; font-size:14px; box-shadow:0 4px 14px rgba(13,148,136,0.35); }
    .footer { text-align:center; padding:28px 12px; font-size:12px; color:#64748b; }
  </style>
</head>
<body style="margin:0;padding:24px 8px;background:#f8fafc;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div class="wrap">
    
    <!-- Hero Header -->
    <div class="hero">
      <div class="brand">KAIRALI GROUP · KTAHV SALES AUTOMATION</div>
      <h1>KTAHV SALES DAILY REPORT</h1>
      <p class="hero-sub">From ${esc(data.dateRange.from)} to ${esc(data.dateRange.to)} · Report Generated at ${esc(data.generatedAt)}</p>
      
      <div class="stat-row">
        <div class="stat-card">
          <span class="label">Total Verified Sales</span>
          <span class="value">${formatINR(totalAmountActual)}</span>
          <span class="subtext" style="color:#5eead4;">Target: ${formatINR(totalAmountTarget)} (${formatPct(totalAmountShortfall)})</span>
        </div>
        <div class="stat-card">
          <span class="label">Bookings Quantity</span>
          <span class="value">${formatNum(totalQtyActual)} Orders</span>
          <span class="subtext" style="color:#cbd5e1;">Target: ${formatNum(totalQtyTarget)} (${formatPct(totalQtyShortfall)})</span>
        </div>
        <div class="stat-card">
          <span class="label">Collections Done</span>
          <span class="value">${formatINR(data.financialBadges.collectionAmountDone)}</span>
          <span class="subtext" style="color:#fde047;">Pending: ${formatINR(data.financialBadges.collectionAmountPending)}</span>
        </div>
        <div class="stat-card">
          <span class="label">Verified Pending</span>
          <span class="value">${formatINR(data.financialBadges.bookingsVerifiedPending)}</span>
          <span class="subtext" style="color:#fca5a5;">Cancelled: ${formatINR(data.financialBadges.bookingCancelledAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Section 1: Planned vs Actual Overview -->
    <div class="card">
      <h2 class="card-title">1. Planned vs Actual Metrics Overview</h2>
      <p class="card-subtitle">Channel breakdown & operational efficiency for KTAHV</p>
      
      <table class="rt">
        <thead>
          <tr>
            <th>Channel / Source</th>
            <th class="text-right">Actual Verified</th>
            <th class="text-right">Target</th>
            <th class="text-right">Shortfall %</th>
          </tr>
        </thead>
        <tbody>
          ${data.amountMetrics.map(m => `
            <tr ${m.category === 'TOTAL' ? 'style="font-weight:700;background:#f8fafc;"' : ''}>
              <td><strong>${esc(m.category)}</strong></td>
              <td class="text-right">${formatINR(m.actualVerified)}</td>
              <td class="text-right">${formatINR(m.target)}</td>
              <td class="text-right">
                <span class="badge ${m.shortfallPct >= 0 ? 'badge-green' : 'badge-red'}">
                  ${formatPct(m.shortfallPct)}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 2: Weekly Run-Rate Breakdown -->
    <div class="card">
      <h2 class="card-title">2. Weekly Run-Rate of This Month (Mon–Sun)</h2>
      <p class="card-subtitle">Weekly calls, uploads, conversions & verified sales progress</p>
      
      <table class="rt">
        <thead>
          <tr>
            <th>Week</th>
            <th class="text-right">Calls Uploaded</th>
            <th class="text-right">Converted Qty</th>
            <th class="text-right">Verified Sale Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.weeklyBreakdown.map(w => `
            <tr>
              <td><strong>${esc(w.week)}</strong></td>
              <td class="text-right">${formatNum(w.calls)}</td>
              <td class="text-right">${formatNum(w.convertedQty)}</td>
              <td class="text-right"><strong>${formatINR(w.verifiedSaleAmt)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 3: Employee-wise Sales Performance Table -->
    <div class="card">
      <h2 class="card-title">3. KTAHV Sales of the Month — Performance Leaderboard</h2>
      <p class="card-subtitle">Detailed employee orders, sales value, calling activity and collection performance</p>
      
      <div style="overflow-x:auto;">
        <table class="rt">
          <thead>
            <tr>
              <th>Rank & Agent</th>
              <th class="text-right">Orders (Ver/Plan)</th>
              <th class="text-right">% Orders</th>
              <th class="text-right">Sales Verified</th>
              <th class="text-right">Planned Value</th>
              <th class="text-right">% Target</th>
              <th class="text-right">Calls (Done)</th>
              <th class="text-right">Collections</th>
              <th class="text-right">Pending Balance</th>
            </tr>
          </thead>
          <tbody>
            ${data.salespeople.map(p => `
              <tr>
                <td><strong>${p.rank}. ${esc(p.salesPerson)}</strong></td>
                <td class="text-right">${p.actualVerifiedOrders} / ${p.plannedTotalOrders}</td>
                <td class="text-right">
                  <span class="badge ${p.orderTargetAchievedPct >= 0 ? 'badge-green' : 'badge-red'}">
                    ${formatPct(p.orderTargetAchievedPct)}
                  </span>
                </td>
                <td class="text-right"><strong>${formatINR(p.verifiedActualSaleAmount)}</strong></td>
                <td class="text-right">${formatINR(p.plannedTotalSaleValue)}</td>
                <td class="text-right">
                  <span class="badge ${p.saleValueAchievedPct >= 0 ? 'badge-green' : 'badge-red'}">
                    ${formatPct(p.saleValueAchievedPct)}
                  </span>
                </td>
                <td class="text-right">${formatNum(p.totalCallsUploaded)}</td>
                <td class="text-right" style="color:#059669;font-weight:700;">${formatINR(p.collectionAmount)}</td>
                <td class="text-right" style="color:#dc2626;">${formatINR(p.pendingPayments)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td>Grand Total</td>
              <td class="text-right">${data.salespeopleTotal.actualVerifiedOrders} / ${data.salespeopleTotal.plannedTotalOrders}</td>
              <td class="text-right">${formatPct(data.salespeopleTotal.orderTargetAchievedPct)}</td>
              <td class="text-right">${formatINR(data.salespeopleTotal.verifiedActualSaleAmount)}</td>
              <td class="text-right">${formatINR(data.salespeopleTotal.plannedTotalSaleValue)}</td>
              <td class="text-right">${formatPct(data.salespeopleTotal.saleValueAchievedPct)}</td>
              <td class="text-right">${formatNum(data.salespeopleTotal.totalCallsUploaded)}</td>
              <td class="text-right">${formatINR(data.salespeopleTotal.collectionAmount)}</td>
              <td class="text-right">${formatINR(data.salespeopleTotal.pendingPayments)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Section 4: Discount Governance Summary -->
    <div class="card">
      <h2 class="card-title">4. Discount Governance Summary</h2>
      <p class="card-subtitle">Pre-discount booking volume vs authorized discount amount</p>
      
      <table class="rt">
        <thead>
          <tr>
            <th>Salesperson</th>
            <th class="text-right">Pre-Discount Amount</th>
            <th class="text-right">Avg Discount %</th>
            <th class="text-right">Discount Given</th>
            <th class="text-right">Final Invoice Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.discountReport.slice(0, 6).map(d => `
            <tr>
              <td><strong>${esc(d.salesPerson)}</strong></td>
              <td class="text-right">${formatINR(d.totalBookingAmountBeforeDiscount)}</td>
              <td class="text-right"><span class="badge badge-amber">${d.avgDiscountPct.toFixed(1)}%</span></td>
              <td class="text-right" style="color:#dc2626;">${formatINR(d.totalDiscountAmount)}</td>
              <td class="text-right"><strong>${formatINR(d.totalInvoiceAmount)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>Grand Total</td>
            <td class="text-right">${formatINR(data.discountTotal.totalBookingAmountBeforeDiscount)}</td>
            <td class="text-right">${data.discountTotal.avgDiscountPct.toFixed(1)}%</td>
            <td class="text-right" style="color:#dc2626;">${formatINR(data.discountTotal.totalDiscountAmount)}</td>
            <td class="text-right">${formatINR(data.discountTotal.totalInvoiceAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Section 5: Cancellations Summary -->
    <div class="card">
      <h2 class="card-title">5. Recent Cancellations (MTD)</h2>
      <p class="card-subtitle">Total cancelled amount: ${formatINR(data.financialBadges.bookingCancelledAmount)} (${data.cancelledBookings.length} records)</p>
      
      <table class="rt">
        <thead>
          <tr>
            <th>Reservation ID</th>
            <th>Client Name</th>
            <th>Booking Date/Time</th>
            <th style="color:#dc2626;">🕐 Cancelled At</th>
            <th>Package / Program</th>
            <th class="text-right">Amount</th>
            <th>Booking By</th>
            <th>Remarks / Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.cancelledBookings.slice(0, 5).map(c => `
            <tr>
              <td><strong>${esc(c.reservationId)}</strong></td>
              <td>${esc(c.clientName)}</td>
              <td style="font-size:11px;color:#64748b;">${esc(c.bookingDateTime || '—')}</td>
              <td>
                <span style="font-weight:bold;color:#dc2626;">${esc(c.cancelledDate ? c.cancelledDate.split(' ')[0] : '—')}</span>
                ${c.cancelledDate && c.cancelledDate.split(' ')[1] ? `<br/><span style="font-size:10px;color:#ef4444;">${esc(c.cancelledDate.split(' ')[1])}</span>` : ''}
              </td>
              <td>${esc(c.packageName || 'Standard Package')}</td>
              <td class="text-right"><strong>${formatINR(c.invoiceAmount)}</strong></td>
              <td>${esc(c.bookingTakenBy)}</td>
              <td><span class="badge badge-red">${esc(c.accountsStatus || c.actionStatus || 'Cancelled')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 6: Complimentary Bookings -->
    ${data.complimentaryBookings && data.complimentaryBookings.length > 0 ? `
    <div class="card">
      <h2 class="card-title">6. Complimentary Bookings (MTD)</h2>
      <p class="card-subtitle">GM/Director authorised complimentary stays — ${data.complimentaryBookings.length} record(s) this period</p>
      
      <table class="rt">
        <thead>
          <tr>
            <th>Reservation ID</th>
            <th>Client Name</th>
            <th style="color:#7c3aed;">🕐 Booking Date/Time</th>
            <th>Package / Room</th>
            <th>Stay Dates</th>
            <th>Agent</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${data.complimentaryBookings.map(c => `
            <tr>
              <td><strong style="color:#7c3aed;">${esc(c.reservationId)}</strong></td>
              <td>${esc(c.clientName)}</td>
              <td>
                <span style="font-weight:bold;color:#7c3aed;">${esc(c.bookingDateTime ? c.bookingDateTime.split(' ')[0] : '—')}</span>
                ${c.bookingDateTime && c.bookingDateTime.split(' ')[1] ? `<br/><span style="font-size:10px;color:#8b5cf6;">${esc(c.bookingDateTime.split(' ')[1])}</span>` : ''}
              </td>
              <td>${esc(c.packageName)}<br/><span style="font-size:10px;color:#94a3b8;">${esc(c.roomCategory)}</span></td>
              <td style="font-size:11px;color:#64748b;">${esc(c.arrivalDate)} → ${esc(c.departureDate)} (${c.daysOfStay}d)</td>
              <td>${esc(c.bookingTakenBy)}</td>
              <td style="color:#64748b;">${esc(c.remarks || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Interactive CRM Access CTA -->
    <div style="text-align:center; padding:32px 16px;">
      <a href="https://crm.kairali.com/sales/reports/ktahv-daily-sales" class="cta-btn">
        Open Full Interactive Dashboard in CRM &rarr;
      </a>
      <p style="margin-top:10px; font-size:12px; color:#64748b;">
        Includes full drilldown, checkout/checkin forecasts, search, and instant PDF download.
      </p>
    </div>

    <div class="footer">
      Kairali Ayurvedic Health Village · Automated Daily Sales Report · Prepared for Management &amp; Sales HO
    </div>
  </div>
</body>
</html>`
}
