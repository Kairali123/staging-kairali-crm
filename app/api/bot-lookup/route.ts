import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'

type Source = 'lead' | 'ktahv' | 'order' | 'villa' | 'unknown'

function detectSource(id: string): Source {
    const v = id.trim()
    if (/^KTAHV-PMS-\d+$/i.test(v)) return 'ktahv'
    if (/^VRV\d{7}$/i.test(v)) return 'villa'
    if (/^OID_\d+$/i.test(v) || /^IN\d+$/i.test(v)) return 'order'
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return 'lead'
    return 'unknown'
}

function cleanSearchQuery(q: string): string {
    let text = q.toLowerCase();
    
    // Remove common phrases first
    const phrases = [
        /tell\s+me\s+about\s+the\s+booking\s+for/g,
        /tell\s+me\s+about\s+the\s+booking\s+of/g,
        /tell\s+me\s+about\s+the/g,
        /tell\s+me\s+about/g,
        /show\s+me\s+details\s+for/g,
        /show\s+me\s+details\s+of/g,
        /show\s+me/g,
        /search\s+for/g,
        /details\s+for/g,
        /details\s+of/g,
        /booking\s+for/g,
        /booking\s+of/g,
        /booking\s+details/g,
    ];
    
    for (const phrase of phrases) {
        text = text.replace(phrase, '');
    }
    
    // Remove standalone filler words
    const words = [
        /\bthe\b/g,
        /\bbooking\b/g,
        /\bbookings\b/g,
        /\bdetails\b/g,
        /\bfor\b/g,
        /\babout\b/g,
        /\bfind\b/g,
        /\bsearch\b/g,
        /\bshow\b/g,
        /\bme\b/g,
    ];
    
    for (const word of words) {
        text = text.replace(word, '');
    }
    
    // Clean up multiple spaces
    return text.replace(/\s+/g, ' ').trim();
}

export async function GET(req: NextRequest) {
    const user = getSessionUser(req)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized', source: 'unknown' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')?.trim()
    const q = req.nextUrl.searchParams.get('q')?.trim()

    if (!id && !q) {
        return NextResponse.json({ error: 'id or q required', source: 'unknown' }, { status: 400 })
    }

    const pool = await getPool()

    if (q) {
        const cleaned = cleanSearchQuery(q)
        if (cleaned.length < 2) {
            return NextResponse.json({ source: 'search', results: [] })
        }

        const param = `%${cleaned.toLowerCase()}%`

        try {
            const [ktahvRows, villaRows, orderRows, leadRows]: any[] = await Promise.all([
                pool.query(
                    `SELECT 'ktahv' AS source, reservation_id AS id, client_name AS name, mobile, email, arrival_date AS date, booking_status AS status 
                     FROM ktahv_bookings_fms_v3_part1 
                     WHERE LOWER(client_name) LIKE ? OR LOWER(mobile) LIKE ? OR LOWER(email) LIKE ? 
                     LIMIT 5`,
                    [param, param, param]
                ),
                pool.query(
                    `SELECT 'villa' AS source, reservation_number AS id, name_of_client AS name, mobile, guest_email AS email, arrival_date AS date, booking_status AS status 
                     FROM villa_raag_client_booking_fms 
                     WHERE LOWER(name_of_client) LIKE ? OR LOWER(mobile) LIKE ? OR LOWER(guest_email) LIKE ? 
                     LIMIT 5`,
                    [param, param, param]
                ),
                pool.query(
                    `SELECT 'order' AS source, order_id AS id, client_name AS name, mobile, email, timestamp AS date, order_status AS status 
                     FROM orders_fms 
                     WHERE LOWER(client_name) LIKE ? OR LOWER(mobile) LIKE ? OR LOWER(email) LIKE ? 
                     LIMIT 5`,
                    [param, param, param]
                ),
                pool.query(
                    `SELECT 'lead' AS source, mb.lead_id AS id, mb.Name_of_Client AS name, mb.Mobile AS mobile, mb.Email_Id AS email, mb.actual_time AS date, sbn.status AS status 
                     FROM master_buffer mb 
                     INNER JOIN staging_buffer_new sbn ON mb.lead_id = sbn.lead_id 
                     WHERE LOWER(mb.Name_of_Client) LIKE ? OR LOWER(mb.Mobile) LIKE ? OR LOWER(mb.Email_Id) LIKE ? 
                     GROUP BY mb.lead_id 
                     LIMIT 5`,
                    [param, param, param]
                )
            ])

            const results = [
                ...(ktahvRows[0] || []),
                ...(villaRows[0] || []),
                ...(orderRows[0] || []),
                ...(leadRows[0] || [])
            ]

            return NextResponse.json({ source: 'search', results })
        } catch {
            console.error('[bot-lookup search] request failed')
            return NextResponse.json({ source: 'search', error: 'Search failed' }, { status: 500 })
        }
    }

    const source = detectSource(id!)
    try {
        switch (source) {
            case 'lead': {
                const [rows]: any = await pool.query(
                    `SELECT * FROM master_buffer mb
           JOIN staging_buffer_new sbn ON mb.lead_id = sbn.lead_id
           WHERE mb.lead_id = ? ORDER BY sbn.sl_no DESC LIMIT 1`,
                    [id]
                )
                if (!rows.length) return NextResponse.json({ source, data: null, error: 'Lead not found' }, { status: 404 })
                return NextResponse.json({ source, data: rows[0] })
            }

            case 'villa': {
                const [rows]: any = await pool.query(
                    `SELECT * FROM villa_raag_client_booking_fms WHERE reservation_number = ? LIMIT 1`,
                    [id]
                )
                if (!rows.length) return NextResponse.json({ source, data: null, error: 'Booking not found' }, { status: 404 })
                return NextResponse.json({ source, data: rows[0] })
            }

            case 'order': {
                const [orderRows]: any = await pool.query(`SELECT * FROM orders_fms WHERE order_id = ?`, [id])
                const [dispatchRows]: any = await pool.query(`SELECT * FROM dispatch_fms_factory WHERE order_id = ?`, [id])

                if (!orderRows.length) return NextResponse.json({ source, data: null, error: 'Order not found' }, { status: 404 })

                const order = orderRows[0]
                let note: string | null = null
                let possibleReplacement: any = null
                const status = order.status || order.order_status

                if (status === 'Edited-Cancelled') {
                    const [buyerOrders]: any = await pool.query(
                        `SELECT * FROM orders_fms WHERE buyer_id = ? AND order_id != ? ORDER BY timestamp DESC LIMIT 1`,
                        [order.buyer_id, order.order_id]
                    )
                    if (buyerOrders.length > 0) {
                        possibleReplacement = buyerOrders[0]
                        note = `This order was edited and cancelled. Found a newer order (${possibleReplacement.order_id}) from the same buyer (${order.buyer_id}) — likely the replacement.`
                    } else {
                        note = `This order was edited and cancelled. No newer order found yet for buyer ${order.buyer_id}.`
                    }
                }

                return NextResponse.json({
                    source,
                    data: { order, dispatch: dispatchRows[0] || null, possibleReplacement },
                    note,
                })
            }

            case 'ktahv': {
                const stages = [
                    ['part1', 'ktahv_bookings_fms_v3_part1'],
                    ['nb', 'ktahv_bookings_fms_v3_nb_booking_verification_stage'],
                    ['av', 'ktahv_bookings_fms_v3_av_AccountsVerify_frontoffice'],
                    ['ft', 'ktahv_bookings_fms_v3_ft_final_transfer'],
                    ['dc', 'ktahv_bookings_fms_v3_dc_delete_complete'],
                ] as const

                const results: Record<string, any> = {}
                let found = false
                for (const [key, table] of stages) {
                    const [rows]: any = await pool.query(`SELECT * FROM ${table} WHERE reservation_id = ?`, [id])
                    results[key] = rows[0] || null
                    if (rows[0]) found = true
                }

                if (!found) return NextResponse.json({ source, data: null, error: 'Booking not found' }, { status: 404 })
                return NextResponse.json({ source, data: results })
            }

            default:
                return NextResponse.json({ source: 'unknown', error: `Unrecognized ID format: "${id}"` }, { status: 404 })
        }
    } catch {
        console.error('[bot-lookup] request failed')
        return NextResponse.json({ source, error: 'Lookup failed' }, { status: 500 })
    }
}
