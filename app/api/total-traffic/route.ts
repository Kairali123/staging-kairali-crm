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
      conditions.push('date >= ?')
      params.push(from)
    }

    if (to) {
      conditions.push('date <= ?')
      params.push(to)
    }

    if (company && company !== 'ALL') {
      conditions.push('comapany_name = ?')
      params.push(company)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await pool.execute(
      `SELECT 
        DATE_FORMAT(date, '%d-%m-%Y') as date,
        medium,
        total_users_count,
        comapany_name
       FROM spalabsdomain_Kairali_CRM_Db.total_traffic_table
       ${whereClause}
       ORDER BY comapany_name, date ASC`,
      params
    ) as any[]

    // Structure: { COMPANY: { "DD-MM-YYYY": { medium: count } } }
    const trafficMap: Record<string, any> = {}

    rows.forEach((row: any) => {
      // 🔥 FIX: Date formatting directly from MySQL (NO JS DATE) avoids timezone shifting!
      const dateKey = row.date

      const companyName = row.comapany_name || 'Unknown'
      const medium = row.medium || 'Others'
      const count = Number(row.total_users_count) || 0

      if (!trafficMap[companyName]) trafficMap[companyName] = {}
      if (!trafficMap[companyName][dateKey]) trafficMap[companyName][dateKey] = {}

      trafficMap[companyName][dateKey][medium] =
        (trafficMap[companyName][dateKey][medium] || 0) + count
    })

    return NextResponse.json({
      success: true,
      data: trafficMap,
      totalRows: rows.length,
    })

  } catch {
    console.error('[total-traffic] traffic lookup failed')
    return NextResponse.json(
      { success: false, error: 'Failed to fetch traffic data' },
      { status: 500 }
    )
  }
}

/*
✅ 🔹 Different Test URLs
1. 🔸 Without filter (all data)
http://localhost:3000/api/total-traffic
2. 🔸 Date filter
http://localhost:3000/api/total-traffic?from=2024-01-01&to=2024-01-31
3. 🔸 Company filter
http://localhost:3000/api/total-traffic?company=KAPPL
4. 🔸 Date + Company filter (Recommended)
http://localhost:3000/api/total-traffic?from=2024-01-01&to=2024-01-31&company=KAPPL
5. 🔸 All companies explicitly
http://localhost:3000/api/total-traffic?company=ALL
✅ 🔥 Expected Response
{
  "success": true,
  "data": {
    "KAPPL": {
      "01-01-2024": {
        "google": 120,
        "facebook": 80
      }
    }
  },
  "totalRows": 25
}
*/
