import { NextResponse } from 'next/server'
import { fetchCategoryHierarchyFromSheet } from '@/lib/google-client-sync'

export async function GET() {
  try {
    const hierarchy = await fetchCategoryHierarchyFromSheet()
    return NextResponse.json({
      success: true,
      hierarchy,
    })
  } catch (err: any) {
    console.error('[API client-database categories]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
