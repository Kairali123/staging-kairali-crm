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
      conditions.push('company = ?')
      params.push(company)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 🔥 FIX: Date formatting directly from MySQL (NO JS DATE)
    const [rows] = await pool.execute(
      `SELECT 
        DATE_FORMAT(date, '%d-%m-%Y') as date,
        source,
        expense_amount,
        company
       FROM spalabsdomain_Kairali_CRM_Db.expense_performance
       ${whereClause}
       ORDER BY company, date ASC`,
      params
    ) as any[]

    // Structure: { COMPANY: { "DD-MM-YYYY": { source: amount } } }
    const expenseMap: Record<string, any> = {}

    rows.forEach((row: any) => {
      const dateKey = row.date   // ✅ already correct format (DD-MM-YYYY)

      const companyName = row.company || 'Unknown'
      const source = row.source || 'Others'
      const amount = Number(row.expense_amount) || 0

      if (!expenseMap[companyName]) {
        expenseMap[companyName] = {}
      }

      if (!expenseMap[companyName][dateKey]) {
        expenseMap[companyName][dateKey] = {}
      }

      expenseMap[companyName][dateKey][source] =
        (expenseMap[companyName][dateKey][source] || 0) + amount
    })

    return NextResponse.json({
      success: true,
      data: expenseMap,
      totalRows: rows.length,
    })

  } catch {
    console.error('[expense] expense lookup failed')

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch expense data'
      },
      { status: 500 }
    )
  }
}


//http://localhost:3000/api/expense

/*
🔹 1. Base Endpoint (no filter)
http://localhost:3000/api/expense
🔹 2. Date filter
http://localhost:3000/api/expense?from=2024-01-01&to=2024-01-31
🔹 3. Company filter
http://localhost:3000/api/expense?company=KAPPL
🔹 4. Date + Company (Best use)
http://localhost:3000/api/expense?from=2024-01-01&to=2024-01-31&company=KAPPL
🔹 5. ALL company
http://localhost:3000/api/expense?company=ALL
🧠 Important Concept

👉 Ye sab alag endpoints nahi hain
👉 Ye sab same endpoint ke query parameters hain
*/
