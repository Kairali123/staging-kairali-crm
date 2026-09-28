import { NextResponse } from 'next/server'
import { buildAssignmentSnapshot } from '@/lib/morning-lead-allocation'
import { renderAllocationSnapshotEmail } from '@/lib/morning-allocation-email'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const summary = await buildAssignmentSnapshot()
    const { html } = renderAllocationSnapshotEmail(summary)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (error: any) {
    return new NextResponse(error.message || 'Error', { status: 500 })
  }
}
