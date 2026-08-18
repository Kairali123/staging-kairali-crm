import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = String(user?.id || user?.employeeId || user?.email || '').trim()
        if (!userId) {
            return NextResponse.json({ error: 'Authenticated user ID is required' }, { status: 400 })
        }

        const pool = await getPool()
        const [rows] = await pool.query(
            `SELECT ticket_id as ticketId, reference_id as referenceId, category, description, status, created_at as createdAt 
             FROM support_tickets 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        )

        return NextResponse.json({ tickets: rows })
    } catch {
        console.error('[my-tickets] ticket lookup failed')
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }
}
