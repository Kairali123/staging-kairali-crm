import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET(req: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const company = searchParams.get('company')

    const pool = await getPool()
    connection = await pool.getConnection()

    await connection.execute('SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED')

    const conditions: string[] = []
    const params: any[] = []

    if (from) {
      conditions.push('f.generate_date_time >= ?')
      params.push(`${from} 00:00:00`)
    }
    if (to) {
      conditions.push('f.generate_date_time <= ?')
      params.push(`${to} 23:59:59`)
    }

    const companyCase = `
      CASE 
        WHEN LOWER(f.company_belongs_to) IN ('villaraag') THEN 'VILLARAAG'
        WHEN LOWER(f.company_belongs_to) IN (
          'kairali the ayurvedic healing village',
          'kairali ayurvedic centers'
        ) THEN 'KTAHV'
        ELSE 'KAPPL'
      END
    `

    if (company && company !== 'ALL') {
      conditions.push(`${companyCase} = ?`)
      params.push(company)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 🚀 FIXED: Correct Potential Value Summation
    // We deduplicate by lead_id inside f_summary to ensure each lead contributes exactly ONCE to the sum.
    // We use regular SUM() instead of SUM(DISTINCT) to ensure multiple leads with the same value are all counted.
    const query = `
      SELECT 
        f_summary.normalized_company,
        f_summary.date_key,
        UPPER(TRIM(COALESCE(NULLIF(m.Verified_Source, ''), f_summary.data_source, 'Others'))) AS normalized_source,
        COUNT(f_summary.lead_id) AS cold_count,
        SUM(COALESCE(lv.lost_value, 0)) AS total_lost_value
      FROM (
        SELECT 
          lead_id, 
          MAX(data_source) as data_source, 
          DATE_FORMAT(MAX(generate_date_time), '%d-%m-%Y') AS date_key,
          ${companyCase} AS normalized_company,
          MAX(generate_date_time) as max_gen
        FROM spalabsdomain_Kairali_CRM_Db.fms_enquiry_cold_reverification_v2 f
        ${whereClause}
        GROUP BY lead_id, normalized_company
      ) f_summary
      
      INNER JOIN spalabsdomain_Kairali_CRM_Db.master_buffer m 
          ON (f_summary.lead_id COLLATE utf8mb4_general_ci) = (m.lead_id COLLATE utf8mb4_general_ci)
      
      LEFT JOIN (
          SELECT data_source, lost_value 
          FROM spalabsdomain_Kairali_CRM_Db.source_wise_lost_potential_value
          WHERE id IN (
              SELECT MIN(id) FROM spalabsdomain_Kairali_CRM_Db.source_wise_lost_potential_value GROUP BY data_source
          )
      ) lv ON (f_summary.data_source COLLATE utf8mb4_general_ci) = (lv.data_source COLLATE utf8mb4_general_ci)

      GROUP BY normalized_company, date_key, normalized_source
      ORDER BY max_gen DESC
    `

    const [rows] = await connection.execute(query, params) as any[]

    const finalMap: Record<string, Record<string, Record<string, [string, number, number]>>> = {}

    rows.forEach((row: any) => {
      const comp = row.normalized_company || 'KAPPL'
      const date = row.date_key || '01-01-2000'
      const vSrc = row.normalized_source || 'OTHERS'
      const coldCount = parseInt(row.cold_count) || 0
      const totalLost = parseFloat(row.total_lost_value) || 0

      if (!finalMap[comp]) finalMap[comp] = {}
      if (!finalMap[comp][date]) finalMap[comp][date] = {}
      
      if (!finalMap[comp][date][vSrc]) {
        finalMap[comp][date][vSrc] = [vSrc, 0, 0]
      }
      
      finalMap[comp][date][vSrc][1] += coldCount
      finalMap[comp][date][vSrc][2] += totalLost
    })

    return NextResponse.json({
      success: true,
      data: finalMap,
      totalRows: rows.length
    })

  } catch {
    console.error('[potential-value] potential value lookup failed')
    return NextResponse.json({ success: false, error: 'Failed to fetch potential value data' }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}
