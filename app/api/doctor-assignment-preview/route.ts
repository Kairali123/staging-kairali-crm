import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authz'
import { localDay } from '@/lib/email-triggers/schedule'
import { loadDoctorAssignments } from '@/lib/email-triggers/load-doctor-assignments'
import { renderDoctorAssignments } from '@/lib/email-triggers/doctor-assignment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'" }

export async function GET(req: NextRequest) {
  const user = getSessionUser(req)
  const role = String(user?.role || '').toLowerCase().trim()
  if (!user || !['super_admin', 'super admin'].includes(role)) return new NextResponse('Administrator access required', { status: 403, headers })
  try {
    return new NextResponse(renderDoctorAssignments(await loadDoctorAssignments(), localDay(Date.now(), 'Asia/Kolkata')), { headers })
  } catch {
    return new NextResponse('Doctor assignment source unavailable. Check Google access and the verified GuestTracker field map.', { status: 503, headers })
  }
}
