import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser, hasDealAssistantAccess } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
      )
    }
    if (!hasDealAssistantAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } }
      )
    }

    const pool = await getPool()
    const connection = await pool.getConnection()
    
    try {
      const body = await req.json()
      const { leadId, notes = 'AI Message Generated & Copied' } = body

      if (!leadId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: leadId' },
          { status: 400 }
        )
      }

      const followedUpAt = new Date()
      const markedBy =
        typeof user.email === 'string' && user.email.trim()
          ? user.email.trim()
          : typeof user.name === 'string' && user.name.trim()
            ? user.name.trim()
            : 'Authenticated CRM user'

      // Insert follow-up log into deal_assistant_followups
      await connection.execute(`
        INSERT INTO deal_assistant_followups (lead_id, followed_up_at, marked_by, notes)
        VALUES (?, ?, ?, ?)
      `, [leadId, followedUpAt, markedBy, notes])

      return NextResponse.json({
        success: true,
        message: 'Lead marked as followed up successfully!',
        followedUpAt: followedUpAt.toISOString()
      })

    } finally {
      connection.release()
    }
  } catch {
    console.error('[mark-followed-up] failed to record follow-up')
    return NextResponse.json(
      { success: false, error: 'Failed to mark lead as followed up' },
      { status: 500 }
    )
  }
}
