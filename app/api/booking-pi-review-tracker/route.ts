import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { loadBookingPiReviewData } from '@/lib/booking-pi-review-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDateStr(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  }
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || undefined
    const data = await loadBookingPiReviewData(date)

    return NextResponse.json({
      ok: true,
      date: data.date,
      items: data.items,
      summary: data.summary,
      salesBreakdown: data.salesBreakdown,
      generatedAt: data.generatedAt,
      reviewSheetUrl: data.reviewSheetUrl,
    })
  } catch (error: any) {
    console.error('[API booking-pi-review-tracker] GET error:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch PI tracker data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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
