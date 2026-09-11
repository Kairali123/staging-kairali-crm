import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const company = searchParams.get('company')

    const pool = await getPool()

    const conditions: string[] = []
    const params: any[] = []

    if (from) {
      conditions.push('payment_received_date >= ?')
      params.push(from)
    }

    if (to) {
      conditions.push('payment_received_date <= ?')
      params.push(to)
    }

    // if (company && company !== 'ALL') {
    //   conditions.push('company = ?')
    //   params.push(company)
    // }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // ✅ 🔥 SQL handles date formatting + grouping (no JS parsing needed)
    const [rows]: any = await pool.execute(
      `
      SELECT 
        booking_id,
        name,
        mobile_no,
        payment_mode,
        invoice_amount,
        payment_collected_by,
        received_status,
        company,
        DATE_FORMAT(payment_received_date, '%d-%m-%Y') as payment_date,
        SUM(received_amount) as total_amount
      FROM spalabsdomain_Kairali_CRM_Db.payment_collection
      ${whereClause}
      GROUP BY company, payment_received_date
      ORDER BY company, payment_received_date ASC
      `,
      params
    )

    // ✅ Structure: { COMPANY: { "DD-MM-YYYY": totalAmount } }
    const paymentMap: Record<string, any> = {}

    rows.forEach((row: any) => {
      const companyName = row.company || 'Unknown'
      const dateKey = row.payment_date
      const amount = Number(row.total_amount) || 0

      if (!paymentMap[companyName]) {
        paymentMap[companyName] = {}
      }

      if (!paymentMap[companyName][dateKey]) {
        paymentMap[companyName][dateKey] = {
          total_amount: 0,
          rows: [],
        }
      }

      paymentMap[companyName][dateKey].total_amount += amount
      paymentMap[companyName][dateKey].rows.push({
        booking_id: row.booking_id || '',
        name: row.name || '',
        mobile_no: row.mobile_no || '',
        payment_mode: row.payment_mode || '',
        invoice_amount: Number(row.invoice_amount) || 0,
        received_amount: amount,
        payment_collected_by: row.payment_collected_by || '',
        received_status: row.received_status || '',
        company: companyName,
        payment_date: dateKey,
      })
    })


    return NextResponse.json({
      success: true,
      data: paymentMap,
      totalRows: rows.length,
    })

  } catch {
    console.error('[payment-collection API] request failed')

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment data',
      },
      { status: 500 }
    )
  }
}

// http://localhost:3000/api/leads/payment

/*
http://localhost:3000/api/leads/payment
✅ 🔥 Test URLs
🔹 All data
http://localhost:3000/api/leads/payment
🔹 Date filter
http://localhost:3000/api/leads/payment?from=2024-01-01&to=2024-01-31
🔹 Company filter
http://localhost:3000/api/leads/payment?company=KAPPL
*/
