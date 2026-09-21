import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'emails' | 'phones' | 'template'
    const category = searchParams.get('category') || ''
    const subCategory = searchParams.get('subCategory') || ''

    const pool = await getPool()

    if (type === 'template') {
      const csvHeader = 'Name,Phone,Email,Alternate Phone,Category,Sub Category,Source Sheet,City State,Remarks\n'
      const sampleRow = 'Rahul Sharma,9876543210,rahul@example.com,9876543211,KTAHV Hospital,IPD Patient,Google Drive Upload,Delhi,Interested in wellness packages\n'
      const csvContent = csvHeader + sampleRow

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="client_upload_template.csv"',
        },
      })
    }

    let whereClause = 'WHERE 1=1'
    const queryParams: any[] = []

    if (category && category !== 'ALL') {
      const cats = category.split(',').map(c => c.trim()).filter(Boolean)
      if (cats.length > 0) {
        whereClause += ` AND category IN (${cats.map(() => '?').join(',')})`
        queryParams.push(...cats)
      }
    }

    if (subCategory && subCategory !== 'ALL') {
      const subs = subCategory.split(',').map(s => s.trim()).filter(Boolean)
      if (subs.length > 0) {
        whereClause += ` AND sub_category IN (${subs.map(() => '?').join(',')})`
        queryParams.push(...subs)
      }
    }

    const excludeUnsubscribed = searchParams.get('excludeUnsubscribed')
    if (excludeUnsubscribed === 'true') {
      whereClause += ' AND (is_unsubscribed IS NULL OR is_unsubscribed = 0)'
    }

    if (type === 'emails') {
      whereClause += " AND email IS NOT NULL AND email != ''"
      const [rows]: any = await pool.query(
        `SELECT DISTINCT email, name, category, sub_category, source_sheet FROM client_database ${whereClause} ORDER BY email ASC`,
        queryParams
      )

      const lines = ['Email ID,Client Name,Category,Sub Category,Source']
      for (const r of rows) {
        lines.push(`"${r.email}","${r.name || ''}","${r.category || ''}","${r.sub_category || ''}","${r.source_sheet || ''}"`)
      }
      const csvContent = lines.join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="client_email_ids_${Date.now()}.csv"`,
        },
      })
    }

    if (type === 'phones') {
      whereClause += " AND phone IS NOT NULL AND phone != ''"
      const [rows]: any = await pool.query(
        `SELECT DISTINCT phone, name, category, sub_category, source_sheet FROM client_database ${whereClause} ORDER BY phone ASC`,
        queryParams
      )

      const lines = ['Phone Number,Client Name,Category,Sub Category,Source']
      for (const r of rows) {
        lines.push(`"${r.phone}","${r.name || ''}","${r.category || ''}","${r.sub_category || ''}","${r.source_sheet || ''}"`)
      }
      const csvContent = lines.join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="client_phone_numbers_${Date.now()}.csv"`,
        },
      })
    }

    if (type === 'both') {
      const [rows]: any = await pool.query(
        `SELECT unique_client_id, name, email, phone, category, sub_category, source_sheet FROM client_database ${whereClause} ORDER BY id ASC`,
        queryParams
      )

      const lines = ['Client ID,Client Name,Email ID,Phone Number,Category,Sub Category,Source']
      for (const r of rows) {
        lines.push(`"${r.unique_client_id}","${r.name || ''}","${r.email || ''}","${r.phone || ''}","${r.category || ''}","${r.sub_category || ''}","${r.source_sheet || ''}"`)
      }
      const csvContent = lines.join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="client_database_full_${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid export type specified.' }, { status: 400 })
  } catch (err: any) {
    console.error('[API client-database export]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
