/**
 * Load today's Booking PI Review data for the daily alert (18:30 IST).
 * Queries booking_pi_records and booking_pi_reviews for the given date.
 */
import { getPool } from '@/lib/db'
import type { PIReviewAlertData, PIReviewAlertItem } from './templates/booking-pi-review-alert'

function istDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

function formatDateStr(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    const t = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
    const m = t.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) return m[1]
  }
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

export async function loadBookingPIReviewAlertData(
  date?: string,
  appUrl?: string
): Promise<PIReviewAlertData> {
  const reportDate = date || istDay(new Date())
  const url = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const pool = await getPool()

  // 1. Fetch all PI records for the date
  const [records]: any[] = await pool.query(
    `SELECT id, reservation_id, pi_number, guest, sales_doer, invoice_amount, currency, check_in_date
     FROM booking_pi_records
     WHERE booking_date = ? OR DATE(booking_datetime) = ? OR DATE(actual_datetime) = ?
     ORDER BY generated_at DESC, id DESC`,
    [reportDate, reportDate, reportDate]
  )

  // Deduplicate by reservation_id (keep first/latest)
  const seen = new Map<string, any>()
  for (const r of (Array.isArray(records) ? records : [])) {
    if (!seen.has(r.reservation_id)) seen.set(r.reservation_id, r)
  }
  const deduped = Array.from(seen.values())

  // 2. Fetch all reviews
  const [reviews]: any[] = await pool.query(`SELECT * FROM booking_pi_reviews`)
  const reviewMap: Record<string, any> = {}
  for (const rev of (Array.isArray(reviews) ? reviews : [])) {
    reviewMap[`${rev.reservation_id}_${rev.pi_number}`] = rev
  }

  // 3. Compute summary
  let reviewedYes = 0
  let reviewedNo  = 0
  let pending     = 0
  const pendingItems: PIReviewAlertItem[] = []

  for (const r of deduped) {
    const key = `${r.reservation_id}_${r.pi_number}`
    const rev = reviewMap[key]

    let reviewStatus = 'Pending'
    if (rev) {
      reviewStatus = rev.review_status === 'Yes' ? 'Yes' : 'No'
      if (reviewStatus === 'Yes') reviewedYes++
      else reviewedNo++
    } else {
      pending++
    }

    // Collect items that need attention: Pending or reviewed-No
    if (reviewStatus !== 'Yes') {
      pendingItems.push({
        reservationId: r.reservation_id,
        piNumber:      r.pi_number,
        guest:         r.guest || '—',
        salesDoer:     r.sales_doer || 'Unassigned',
        invoiceAmount: Number(r.invoice_amount) || 0,
        currency:      r.currency || 'INR',
        checkInDate:   formatDateStr(r.check_in_date),
        reviewStatus,
      })
    }
  }

  return {
    reportDate,
    totalPIs: deduped.length,
    reviewedYes,
    reviewedNo,
    pending,
    pendingItems,
    appUrl: url,
  }
}
