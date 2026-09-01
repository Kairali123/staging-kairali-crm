import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

// Always hit the DB fresh — bookings change often and the old GAS endpoint
// was always live, so don't let Next.js statically cache this route.
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  let connection
  try {
    const pool = await getPool()
    connection = await pool.getConnection()

    const [rows] = await connection.execute(
      `SELECT * FROM villa_raag_client_booking_fms ORDER BY booking_date_time DESC`
    )

    return NextResponse.json(rows)
  } catch (error: any) {
    console.error("[villa-bookings API] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch villa bookings" },
      { status: 500 }
    )
  } finally {
    if (connection) connection.release()
  }
}
