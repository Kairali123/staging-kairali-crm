import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
        return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const pool = await getPool();
    const conn = await pool.getConnection();

    try {
        const [rows] = await conn.query(
            `SELECT
        timestamp,
        booking_id,
        collection_id,
        name,
        mobile_no,
        payment_received_date,
        received_amount,
        currency,
        receipt_number,
        payment_collected_by,
        uploaded_screenshot,
        payment_location,
        payment_mode,
        pending_amount,
        remarks
       FROM payment_collection
       WHERE booking_id = ? AND update_status IS NOT NULL
       ORDER BY timestamp ASC`,
            [bookingId]
        );

        return NextResponse.json({ success: true, data: rows });
    } catch (err: any) {
        console.error("[ktahv-payment-history] DB error:", err);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    } finally {
        conn.release();
    }
}