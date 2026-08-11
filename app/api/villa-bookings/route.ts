import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSessionUser } from "@/lib/authz"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Helper to format Date for MySQL DATETIME
function formatMysqlDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export async function GET(request: NextRequest) {
  let connection
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get("action") === "collection") {
      const bookingId = searchParams.get("bookingId")
      if (!bookingId) {
        return NextResponse.json({ success: false, error: "Missing bookingId" }, { status: 400 })
      }
      const pool = await getPool()
      connection = await pool.getConnection()
      const [rows] = await connection.execute(
        `SELECT * FROM payment_collection WHERE booking_id = ? ORDER BY id ASC`,
        [bookingId]
      )
      return NextResponse.json(rows)
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"

    const pool = await getPool()
    connection = await pool.getConnection()

    // Build the query and count query dynamically
    let whereClause = "1=1"
    const params: any[] = []

    if (search) {
      whereClause += ` AND (
        name_of_client LIKE ? OR 
        name_of_the_booker LIKE ? OR 
        booking_id LIKE ? OR 
        reservation_number LIKE ? OR 
        guest_email LIKE ? OR 
        mobile LIKE ?
      )`
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (status && status !== "all") {
      if (status === "cancelled" || status === "canceled") {
        whereClause += ` AND (LOWER(booking_status) LIKE '%cancel%' OR LOWER(accounts_verify_status) LIKE '%cancel%' OR LOWER(front_office_status) LIKE '%cancel%' OR LOWER(payment_settlement_status) LIKE '%cancel%')`
      } else if (status === "hold") {
        whereClause += ` AND (LOWER(booking_status) LIKE '%hold%' OR LOWER(sales_team_status) LIKE '%hold%')`
      } else if (status === "no show") {
        whereClause += ` AND LOWER(booking_status) = 'no show'`
      } else if (status === "confirmed") {
        whereClause += ` AND LOWER(booking_status) = 'confirmed'`
      } else if (status === "pending") {
        whereClause += ` AND LOWER(booking_status) = 'pending'`
      }
    }

    // Get total count
    const [countResult]: any = await connection.execute(
      `SELECT COUNT(*) as total FROM villa_raag_client_booking_fms WHERE ${whereClause}`,
      params
    )
    const totalCount = countResult[0]?.total || 0

    // Fetch paginated rows
    const dataParams = [...params, limit, offset]
    const [rows] = await connection.execute(
      `SELECT * FROM villa_raag_client_booking_fms WHERE ${whereClause} ORDER BY booking_date_time DESC LIMIT ? OFFSET ?`,
      dataParams
    )

    return NextResponse.json({
      success: true,
      bookings: rows,
      totalCount
    })
  } catch (error: any) {
    console.error("[villa-bookings] GET lookup failed", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch villa bookings" },
      { status: 500 }
    )
  } finally {
    if (connection) connection.release()
  }
}

export async function POST(request: NextRequest) {
  let connection
  try {
    // 1. Authenticate user
    const user = getSessionUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { action, bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Booking ID is required" }, { status: 400 })
    }

    const pool = await getPool()
    connection = await pool.getConnection()

    // 3. Verify booking exists
    const [existingBookings]: any = await connection.execute(
      "SELECT * FROM villa_raag_client_booking_fms WHERE booking_id = ?",
      [bookingId]
    )

    if (!existingBookings || existingBookings.length === 0) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }

    const currentBooking = existingBookings[0]
    const modifier = user.email || user.name || "System"

    // 4. Handle mutations
    if (action === "cancel") {
      const { cancelReason, cancellationRemarks } = body
      if (!cancelReason) {
        return NextResponse.json({ success: false, error: "Cancellation reason is required" }, { status: 400 })
      }

      const remarks = cancellationRemarks 
        ? `[Reason: ${cancelReason}] ${cancellationRemarks}` 
        : `[Reason: ${cancelReason}]`

      await connection.execute(
        `UPDATE villa_raag_client_booking_fms 
         SET booking_status = 'Cancelled', 
             cancellation_remarks = ?, 
             last_edit_date = ?, 
             last_modified_by = ? 
         WHERE booking_id = ?`,
        [remarks, formatMysqlDateTime(new Date()), modifier, bookingId]
      )

      return NextResponse.json({ success: true, message: "Booking cancelled successfully" })
    } else if (action === "payment") {
      const { receivedAmount, paymentMode, receivedDate, receiptNumber, paymentCollectedBy } = body

      // Validate inputs
      const amount = parseFloat(receivedAmount)
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ success: false, error: "Received amount must be a positive number" }, { status: 400 })
      }
      if (!paymentMode) {
        return NextResponse.json({ success: false, error: "Payment mode is required" }, { status: 400 })
      }
      if (!receivedDate) {
        return NextResponse.json({ success: false, error: "Received date is required" }, { status: 400 })
      }
      if (!receiptNumber) {
        return NextResponse.json({ success: false, error: "Receipt number is required" }, { status: 400 })
      }

      // Check current financial state
      const currentTotalReceived = parseFloat(currentBooking.total_received_amount || "0")
      const invoiceAmount = parseFloat(currentBooking.invoice_amount || "0")
      
      const newTotalReceived = currentTotalReceived + amount

      // Overpayment check (business rule check)
      if (newTotalReceived > invoiceAmount) {
        return NextResponse.json({ success: false, error: "Payment exceeds the total payable invoice amount" }, { status: 400 })
      }

      // Determine statuses
      const percentReceived = invoiceAmount > 0 ? Math.round((newTotalReceived / invoiceAmount) * 100) : 0
      const paymentStatus = percentReceived >= 100 ? "paid" : percentReceived > 0 ? "partial" : "pending"

      const accountsVerifyStatus = paymentStatus === "paid" ? "payment_verified" : "pending"
      const paymentSettlementStatus = paymentStatus === "paid" ? "full_payment_received" : "partial_payment"

      await connection.execute(
        `UPDATE villa_raag_client_booking_fms 
         SET total_received_amount = ?, 
             received_amount = ?, 
             payment_mode = ?, 
             payment_received_datetime = ?, 
             receipt_transaction_number = ?, 
             payment_collection_by = ?, 
             last_edit_date = ?, 
             last_modified_by = ?,
             accounts_verify_status = ?,
             payment_settlement_status = ?
         WHERE booking_id = ?`,
        [
          newTotalReceived,
          amount,
          paymentMode,
          receivedDate,
          receiptNumber,
          paymentCollectedBy || modifier,
          formatMysqlDateTime(new Date()),
          modifier,
          accountsVerifyStatus,
          paymentSettlementStatus,
          bookingId
        ]
      )

      return NextResponse.json({ success: true, message: "Payment registered successfully" })
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[villa-bookings] POST mutation failed", error)
    return NextResponse.json(
      { success: false, error: "Failed to persist booking mutation" },
      { status: 500 }
    )
  } finally {
    if (connection) connection.release()
  }
}
