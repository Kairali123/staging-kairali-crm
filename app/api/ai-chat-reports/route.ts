import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasAnyPermission } from '@/lib/authz'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import { loadAiChatReportData } from '@/lib/ai-chat-reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const HEADERS = { 'Cache-Control': 'private, no-store' }

const ALLOWED_PERMISSIONS = [
  'marketing.view',
  'marketing_daily_report.view',
  'riya_sharma.view',
  'sales_report.view',
  'leads.view',
]

function canViewAiChatReport(req: NextRequest): boolean {
  const user = getSessionUser(req)
  if (!user) return false
  const role = String(user.role || '')
    .trim()
    .toLowerCase()
  if (role === 'super_admin' || role === 'super admin' || role === 'admin') {
    return true
  }
  return hasAnyPermission(user, ALLOWED_PERMISSIONS)
}

export async function GET(req: NextRequest) {
  if (!canViewAiChatReport(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403, headers: HEADERS }
    )
  }

  try {
    const sp = req.nextUrl.searchParams
    const preset = sp.get('preset')
    const from = sp.get('from')
    const to = sp.get('to')
    const company = sp.get('company')
    const endDate = sp.get('endDate')
    const daysParam = sp.get('days')
    const days = daysParam ? Math.min(365, Math.max(1, Number(daysParam) || 7)) : undefined

    const report = await loadAiChatReportData({
      preset,
      from,
      to,
      endDate,
      days,
      company,
      recordLimitPerBot: 300,
    })

    return NextResponse.json(
      {
        success: true,
        report,
        emailEnabled: marketingMailConfig().configured,
      },
      { headers: HEADERS }
    )
  } catch (err: any) {
    console.error('[api/ai-chat-reports] Failed to load SQL report:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to load AI Chat Reports from SQL',
      },
      { status: 500, headers: HEADERS }
    )
  }
}
