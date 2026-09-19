import { NextResponse } from 'next/server'
import { getGoogleAuth } from '@/lib/google-client-sync'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1VJNCXxat2bcItVqsvW24NT9aDwnthaTfqsN5R1KkWTY',
      range: "'B2B_Leads-FMS'!A1:Z5",
    })
    return NextResponse.json({ rows: res.data.values })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
