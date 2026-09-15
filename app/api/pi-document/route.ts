import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing document URL' }, { status: 400 })
  }

  // Redirect cleanly to the target document URL
  try {
    const validUrl = new URL(url)
    return NextResponse.redirect(validUrl.toString())
  } catch {
    return NextResponse.json({ error: 'Invalid document URL format' }, { status: 400 })
  }
}
