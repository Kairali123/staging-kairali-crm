import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper: Ensure required database tables exist
async function ensureTables() {
  const pool = await getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_pi_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_date DATE NOT NULL,
      reservation_id VARCHAR(100) NOT NULL,
      pi_number VARCHAR(100) NOT NULL,
      guest VARCHAR(255) NOT NULL,
      booking_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
      check_in_date DATE NULL,
      check_out_date DATE NULL,
      sales_doer VARCHAR(150) NOT NULL DEFAULT 'Unassigned',
      invoice_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      original_invoice_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      fx_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
      previous_invoice_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      previous_currency VARCHAR(10) NULL,
      previous_original_amount DECIMAL(12,2) NULL,
      previous_fx_rate DECIMAL(10,4) NULL,
      amount_change DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      amendment_reason TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Current',
      cancellation_reason TEXT NULL,
      event_context VARCHAR(255) NULL,
      is_older_booking TINYINT(1) NOT NULL DEFAULT 0,
      pi_link VARCHAR(500) NULL,
      pi_history_link VARCHAR(500) NULL,
      generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_booking_date (booking_date),
      INDEX idx_reservation_id (reservation_id),
      INDEX idx_sales_doer (sales_doer)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_pi_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reservation_id VARCHAR(100) NOT NULL,
      pi_number VARCHAR(100) NOT NULL,
      reviewed TINYINT(1) NOT NULL DEFAULT 0,
      review_status VARCHAR(20) NOT NULL DEFAULT 'No',
      reviewed_by VARCHAR(150) NOT NULL DEFAULT 'Accounts',
      reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      guest VARCHAR(255) NULL,
      invoice_amount DECIMAL(12,2) NULL,
      check_in_date DATE NULL,
      check_out_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_reservation_pi (reservation_id, pi_number),
      INDEX idx_reservation (reservation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatDateStr(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = new Date(val)
  if (isNaN(d.getTime())) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables()
    const pool = await getPool()

    const { searchParams } = new URL(req.url)
    let date = searchParams.get('date') || getTodayIST()

    // 1. Fetch records from booking_pi_records for the selected date
    let [rows]: any = await pool.query(
      `SELECT * FROM booking_pi_records WHERE booking_date = ? ORDER BY generated_at DESC, id DESC`,
      [date]
    )

    // 2. If no records exist in booking_pi_records for this date, seed/import from ktahv_bookings_fms_v3_part1
    if (!rows || rows.length === 0) {
      const [sourceRows]: any = await pool.query(
        `SELECT
          nb.reservation_id,
          nb.client_name,
          nb.booking_datetime,
          nb.arrival_date,
          nb.departure_date,
          nb.invoice_amount,
          nb.currency,
          nb.booking_taken_by,
          nb.booking_status,
          nbs.nb_bvs_pi_number,
          nbs.nb_bvs_pi_link,
          nbs.nb_bvs_action_status,
          nbs.nb_bvs_doer_remarks,
          nbs.nb_bvs_reason_of_cancellation,
          inv.invoice_url_new
        FROM ktahv_bookings_fms_v3_part1 nb
        LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs ON nb.reservation_id = nbs.reservation_id
        LEFT JOIN ktahv_invoicing_format inv ON nb.reservation_id = inv.booking_id
        WHERE DATE(nb.booking_datetime) = ?
        ORDER BY nb.timestamp DESC`,
        [date]
      )

      if (Array.isArray(sourceRows) && sourceRows.length > 0) {
        for (const sr of sourceRows) {
          const resId = sr.reservation_id || `RES-${Math.floor(Math.random() * 10000)}`
          const piNum = sr.nb_bvs_pi_number || `PI-${resId}`
          const guest = sr.client_name || 'Guest'
          const bStatus = sr.booking_status || 'Confirmed'
          const checkIn = formatDateStr(sr.arrival_date)
          const checkOut = formatDateStr(sr.departure_date)
          const salesDoer = sr.booking_taken_by || 'Unassigned'
          const invAmt = parseFloat(sr.invoice_amount) || 0
          const curr = (sr.currency || 'INR').trim().toUpperCase()
          const fxRate = curr === 'EUR' ? 89.26 : curr === 'USD' ? 85.74 : 1.0
          const origAmt = curr !== 'INR' ? Math.round(invAmt / fxRate) : invAmt
          const piLink = sr.invoice_url_new || sr.nb_bvs_pi_link || ''

          let statusStr = 'Current'
          if (/cancel/i.test(bStatus) || /cancel/i.test(sr.nb_bvs_action_status || '')) {
            statusStr = 'Cancelled'
          } else if (/amend/i.test(bStatus) || /edit/i.test(sr.nb_bvs_action_status || '')) {
            statusStr = 'Amended'
          }

          const cancelReason = sr.nb_bvs_reason_of_cancellation || null
          const amendReason = sr.nb_bvs_doer_remarks || null
          const eventContext = statusStr === 'Cancelled' ? 'Cancelled Booking' : statusStr === 'Amended' ? 'Amended Booking' : 'New Booking'

          await pool.query(
            `INSERT INTO booking_pi_records (
              booking_date, reservation_id, pi_number, guest, booking_status,
              check_in_date, check_out_date, sales_doer, invoice_amount, currency,
              original_invoice_amount, fx_rate, previous_invoice_amount, status,
              cancellation_reason, amendment_reason, event_context, pi_link, generated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, NOW())`,
            [
              date, resId, piNum, guest, bStatus,
              checkIn, checkOut, salesDoer, invAmt, curr,
              origAmt, fxRate, statusStr,
              cancelReason, amendReason, eventContext, piLink
            ]
          )
        }

        // Re-query after insertion
        const [insertedRows]: any = await pool.query(
          `SELECT * FROM booking_pi_records WHERE booking_date = ? ORDER BY generated_at DESC, id DESC`,
          [date]
        )
        rows = insertedRows
      }
    }

    // 3. Fetch all review statuses from booking_pi_reviews
    const [reviews]: any = await pool.query(`SELECT * FROM booking_pi_reviews`)
    const reviewMap: Record<string, any> = {}
    if (Array.isArray(reviews)) {
      for (const rev of reviews) {
        const key = `${rev.reservation_id}_${rev.pi_number}`
        reviewMap[key] = rev
      }
    }

    // 4. Map records into expected frontend format
    const items: any[] = []
    const salesBreakdownMap: Record<string, any> = {}

    let total = 0
    let current = 0
    let amended = 0
    let cancelled = 0
    let reviewedCount = 0
    let todaySalesCount = 0
    let todaySalesAmount = 0
    let newPi = 0

    if (Array.isArray(rows)) {
      for (const r of rows) {
        total++
        const status = r.status || 'Current'
        if (status === 'Current') current++
        else if (status === 'Amended') amended++
        else if (status === 'Cancelled') cancelled++

        const invAmount = Number(r.invoice_amount) || 0
        const salesDoer = r.sales_doer || 'Unassigned'

        if (status === 'Current') {
          todaySalesCount++
          todaySalesAmount += invAmount
          newPi++
        }

        // Aggregate by Sales Person
        if (!salesBreakdownMap[salesDoer]) {
          salesBreakdownMap[salesDoer] = {
            name: salesDoer,
            todaySalesCount: 0,
            todaySalesAmount: 0,
            newPi: 0,
            amended: 0,
            cancelled: 0,
          }
        }
        const sb = salesBreakdownMap[salesDoer]
        if (status === 'Current') {
          sb.todaySalesCount++
          sb.todaySalesAmount += invAmount
          sb.newPi++
        } else if (status === 'Amended') {
          sb.amended++
        } else if (status === 'Cancelled') {
          sb.cancelled++
        }

        const revKey = `${r.reservation_id}_${r.pi_number}`
        const revData = reviewMap[revKey]
        const isReviewed = revData ? Boolean(revData.reviewed) : false
        if (isReviewed) reviewedCount++

        items.push({
          id: String(r.id),
          generatedAt: r.generated_at ? new Date(r.generated_at).toISOString() : new Date().toISOString(),
          eventContext: r.event_context || (status === 'Cancelled' ? 'Cancelled Booking' : status === 'Amended' ? 'Amended Booking' : 'New Booking'),
          isOlderBooking: Boolean(r.is_older_booking),
          reservationId: r.reservation_id,
          piNumber: r.pi_number,
          guest: r.guest,
          bookingStatus: r.booking_status || 'Confirmed',
          checkInDate: formatDateStr(r.check_in_date),
          checkOutDate: formatDateStr(r.check_out_date),
          salesDoer,
          invoiceAmount: invAmount,
          currency: r.currency || 'INR',
          originalInvoiceAmount: Number(r.original_invoice_amount) || invAmount,
          fxRate: Number(r.fx_rate) || 1.0,
          previousInvoiceAmount: Number(r.previous_invoice_amount) || 0,
          previousCurrency: r.previous_currency || null,
          previousOriginalAmount: r.previous_original_amount ? Number(r.previous_original_amount) : null,
          previousFxRate: r.previous_fx_rate ? Number(r.previous_fx_rate) : null,
          amountChange: Number(r.amount_change) || 0,
          amendmentReason: r.amendment_reason || '',
          status,
          cancellationReason: r.cancellation_reason || '',
          piLink: r.pi_link || '',
          piHistoryLink: r.pi_history_link || '',
          reviewed: isReviewed,
          reviewLocked: isReviewed,
          reviewStatus: revData ? revData.review_status : 'Pending',
          reviewedBy: revData ? revData.reviewed_by : 'Accounts',
          reviewedAt: revData && revData.reviewed_at ? new Date(revData.reviewed_at).toISOString() : null,
        })
      }
    }

    const salesBreakdown = Object.values(salesBreakdownMap)
    const summary = {
      total,
      current,
      amended,
      cancelled,
      reviewed: reviewedCount,
      todaySalesCount,
      todaySalesAmount,
      newPi,
    }

    return NextResponse.json({
      ok: true,
      items,
      summary,
      salesBreakdown,
      generatedAt: new Date().toISOString(),
      reviewSheetUrl: 'https://docs.google.com/spreadsheets/d/1eTEsMwgIWqSGJ2FOiyQ42AegJ81dywaiwHo7ynVbJXE/edit#gid=1445771307',
    })
  } catch (error: any) {
    console.error('[API booking-pi-review-tracker] GET error:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch PI tracker data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables()
    const pool = await getPool()

    const body = await req.json()
    const {
      reservationId,
      piNumber,
      reviewed,
      reviewedBy = 'Accounts',
      guest,
      invoiceAmount,
      checkInDate,
      checkOutDate,
    } = body

    if (!reservationId || !piNumber) {
      return NextResponse.json({ ok: false, error: 'Missing reservationId or piNumber' }, { status: 400 })
    }

    const reviewedVal = reviewed ? 1 : 0
    const reviewStatusStr = reviewed ? 'Yes' : 'No'

    await pool.query(
      `INSERT INTO booking_pi_reviews (
        reservation_id, pi_number, reviewed, review_status, reviewed_by, reviewed_at,
        guest, invoice_amount, check_in_date, check_out_date
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        reviewed = VALUES(reviewed),
        review_status = VALUES(review_status),
        reviewed_by = VALUES(reviewed_by),
        reviewed_at = NOW(),
        guest = VALUES(guest),
        invoice_amount = VALUES(invoice_amount),
        check_in_date = VALUES(check_in_date),
        check_out_date = VALUES(check_out_date)`,
      [
        reservationId,
        piNumber,
        reviewedVal,
        reviewStatusStr,
        reviewedBy,
        guest || null,
        invoiceAmount || null,
        formatDateStr(checkInDate),
        formatDateStr(checkOutDate),
      ]
    )

    return NextResponse.json({
      ok: true,
      reviewed: Boolean(reviewedVal),
      reviewStatus: reviewStatusStr,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API booking-pi-review-tracker] POST error:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Failed to save review status' }, { status: 500 })
  }
}
