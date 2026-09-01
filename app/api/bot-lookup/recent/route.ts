import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'

export async function GET(req: NextRequest) {
    const user = getSessionUser(req)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pool = await getPool()
    try {
        // Fetch recent Lead ID
        const [leads]: any = await pool.query(
            `SELECT lead_id FROM master_buffer 
             WHERE lead_id IS NOT NULL AND lead_id != '' AND lead_id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             ORDER BY sl_no DESC LIMIT 1`
        )

        // Fetch recent KTAHV Booking ID (reservation_id)
        const [ktahvs]: any = await pool.query(
            `SELECT reservation_id FROM ktahv_bookings_fms_v3_part1 
             WHERE reservation_id IS NOT NULL AND reservation_id REGEXP '^KTAHV-PMS-[0-9]+$'
             ORDER BY id DESC LIMIT 1`
        )

        // Fetch recent Villa Raag Booking ID (reservation_number)
        const [villas]: any = await pool.query(
            `SELECT reservation_number FROM villa_raag_client_booking_fms 
             WHERE reservation_number IS NOT NULL AND reservation_number REGEXP '^VRV[0-9]{7}$'
             ORDER BY id DESC LIMIT 1`
        )

        // Fetch recent Order ID
        const [orders]: any = await pool.query(
            `SELECT order_id FROM orders_fms 
             WHERE order_id IS NOT NULL AND (order_id REGEXP '^OID_[0-9]+$' OR order_id REGEXP '^IN[0-9]+$')
             ORDER BY id DESC LIMIT 1`
        )

        const recentIds = [
            ktahvs[0]?.reservation_id,
            villas[0]?.reservation_number,
            orders[0]?.order_id,
        ].filter(Boolean)

        // Add lead ID if exists
        if (leads[0]?.lead_id) {
            recentIds.push(leads[0].lead_id)
        }

        return NextResponse.json({ recentIds })
    } catch {
        console.error('[bot-lookup/recent] database query failed')
        return NextResponse.json({ error: 'Failed to fetch recent IDs' }, { status: 500 })
    }
}
