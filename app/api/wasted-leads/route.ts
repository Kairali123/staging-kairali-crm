import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ArrowBigUpDash } from 'lucide-react'
import { League_Script } from 'next/font/google'

// Define normalization locally to avoid import issues
const normalizeVSrc = (raw: unknown) => {
  const str = (typeof raw === "string") ? raw : String(raw || "")
  const cleaned = str.trim().replace(/\s+/g, " ")
  if (!cleaned || cleaned.toLowerCase() === "others" || cleaned === "—") {
    return { key: "OTHERS", label: "Others" }
  }
  const key = cleaned.toUpperCase()
  return { key, label: cleaned }
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const source = searchParams.get('source')
  const company = searchParams.get('company')
  const pool = await getPool();
  const [masterconn, stageingconn, pontialconn, maincoldconn] = await Promise.all([
    pool.getConnection(), pool.getConnection(), pool.getConnection(),
    pool.getConnection()
  ]);
  let allmap = {
    colddatamap: await getMaincoldData(maincoldconn, from, to),
    masterdatamap: await getMasterdata(masterconn),
    stagingdatamap: await getstagingMasterdata(stageingconn),
    potentialdatamap: await getLostValuedata(pontialconn)
  }
  let leads = []
  let count = 1
  for (let id in allmap.colddatamap) {
    let coldleads = allmap.colddatamap[id];
    let masterdata = allmap.masterdatamap[id] || {};
    let stagingdata = allmap.stagingdatamap[id] || {};
    let datasource = masterdata.data_Source;
    let lostvalue = allmap.potentialdatamap[datasource];
    let stagingcompany = String(stagingdata.company).trim().toLowerCase()
    let company_computed = stagingcompany === "villaraag" ? "VILLARAAG" :
      stagingcompany === "kairali the ayurvedic healing village" || stagingcompany === "kairali ayurvedic centers" || stagingcompany === "kairali ayurvedic center" || stagingcompany === "kairali ayurvedic healing village" ? "KTAHV" : "KAPPL"
    const reqSourceNormalized = source ? normalizeVSrc(source).key : null;
    const leadSourceNormalized = normalizeVSrc(masterdata.verified_Source).key;
    if ((company && company !== 'ALL' && company_computed !== company) || 
        (reqSourceNormalized && reqSourceNormalized !== 'ALL' && reqSourceNormalized !== leadSourceNormalized) || 
        !(id in allmap.masterdatamap)) continue;
    let actualdate = new Date(coldleads.cold_done_datetime).toLocaleDateString("en-GB").replace(/\//g, "-");
    leads.push({
      srNo: count,
      dateTime: actualdate,
      leadId: id,
      clientName: coldleads.name_of_client,
      mobile: coldleads.mobile,
      email: coldleads.email_id,
      priority: stagingdata.priority || 'N/A',
      urgency: stagingdata.urgency || 'N/A',
      dataSource: masterdata.data_Source || 'N/A',
      source: masterdata.verified_Source || 'Others',
      disposition: 'Cold Reverified',
      leadOutcome: stagingdata.leadoutcome || 'N/A',
      leadCategory: stagingdata.leadcategory || 'N/A',
      summary: stagingdata.summary || 'N/A',
      agent: coldleads.cold_by_employee_name || 'N/A',
      company: company_computed,
      cancellationRemarks: coldleads.cold_remarks_by_sales_team || 'N/A',
      lostValue: parseFloat(lostvalue || 0)
    })
    count++;
  }

  return NextResponse.json({
    success: true,
    total: leads.length,
    data: { all: leads }
  });

}
async function getMaincoldData(maincoldconn: any, from?: string | null, to?: string | null) {
  try {
    const conditions: string[] = []
    const queryParams: any[] = []

    if (from) { conditions.push('generate_date_time >= ?'); queryParams.push(`${from} 00:00:00`) }
    if (to) { conditions.push('generate_date_time <= ?'); queryParams.push(`${to} 23:59:59`) }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [colddata]: any = await maincoldconn.execute(`
      SELECT
        generate_date_time,
        lead_id,
        name_of_client,
        mobile,
        email_id,
        cold_by_employee_name,
        cold_remarks_by_sales_team
      FROM fms_enquiry_cold_reverification_v2
      ${whereClause}
    `, queryParams);

    const iddatamap: Record<string, any> = {};

    for (let i = 0; i < colddata.length; i++) {
      const r = colddata[i];
      const leadId = String(r.lead_id).trim();

      if (!iddatamap[leadId]) {
        iddatamap[leadId] = {
          cold_done_datetime: r.generate_date_time,
          name_of_client: r.name_of_client,
          mobile: r.mobile,
          email_id: r.email_id,
          cold_by_employee_name: r.cold_by_employee_name,
          cold_remarks_by_sales_team: r.cold_remarks_by_sales_team
        };
      }
    }

    return iddatamap;
  } finally {
    maincoldconn?.release();
  }
}
async function getMasterdata(masterconn: any) {
  try {
    const [masterdata]: any = await masterconn.execute(`
      SELECT
        lead_id,
        Data_Source,
        Verified_Source
      FROM master_buffer
    `);

    const masteriddata: Record<string, any> = {};

    for (let i = 0; i < masterdata.length; i++) {
      const r = masterdata[i];
      const lead_id = String(r.lead_id).trim();

      if (!masteriddata[lead_id]) {
        masteriddata[lead_id] = {
          data_Source: r.Data_Source,
          verified_Source: r.Verified_Source
        };
      }
    }

    return masteriddata;
  } finally {
    masterconn?.release();
  }
}
async function getstagingMasterdata(stageingconn: any) {
  try {
    const [stagingdata]: any = await stageingconn.execute(`
      SELECT
        Lead_id,
        Priority,
        Urgency_YES_NO,
        Summary_of_Conversation,
        Lead_Relates_to_which_company,
        Lead_Outcome,
        Lead_Category
      FROM staging_buffer_new
    `);

    const stagingiddata: Record<string, any> = {};

    for (let i = 0; i < stagingdata.length; i++) {
      const r = stagingdata[i];
      const lead_id = String(r.Lead_id).trim();

      if (!stagingiddata[lead_id]) {
        stagingiddata[lead_id] = {
          priority: r.Priority,
          urgency: r.Urgency_YES_NO,
          summary: r.Summary_of_Conversation,
          company: r.Lead_Relates_to_which_company,
          leadoutcome: r.Lead_Outcome,
          leadcategory: r.Lead_Category
        };
      }
    }

    return stagingiddata;
  } finally {
    stageingconn?.release();
  }
}
async function getLostValuedata(pontialconn: any) {
  try {
    const [lostvaluedata]: any = await pontialconn.execute(`
      SELECT
        lost_value,
        data_source
      FROM source_wise_lost_potential_value
    `);

    const lostvaluesmap: Record<string, any> = {};

    for (let i = 0; i < lostvaluedata.length; i++) {
      const r = lostvaluedata[i];
      const datasource = String(r.data_source).trim();

      if (!lostvaluesmap[datasource]) {
        lostvaluesmap[datasource] = Number(r.lost_value);
      }
    }

    return lostvaluesmap;
  } finally {
    pontialconn?.release();
  }
}
// export async function GET(req: NextRequest) {
//   let connection;
//   try {
//     const { searchParams } = new URL(req.url)
//     let from = searchParams.get('from')
//     let to = searchParams.get('to')
//     const source = searchParams.get('source')
//     const company = searchParams.get('company')

//     const page = parseInt(searchParams.get('page') || '1', 10)
//     const pageSize = parseInt(searchParams.get('pageSize') || '2000', 10)
//     const offset = (page - 1) * pageSize

//     const pool = await getPool()
//     connection = await pool.getConnection()

//     await connection.execute('SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED')

//     const conditions: string[] = []
//     const params: any[] = []

//     if (from) {
//       conditions.push('f.generate_date_time >= ?')
//       params.push(`${from} 00:00:00`)
//     }
//     if (to) {
//       conditions.push('f.generate_date_time <= ?')
//       params.push(`${to} 23:59:59`)
//     }

//     const companyCase = `
//       CASE
//         WHEN LOWER(f.company_belongs_to) IN ('villaraag') THEN 'VILLARAAG'
//         WHEN LOWER(f.company_belongs_to) IN (
//           'kairali the ayurvedic healing village',
//           'kairali ayurvedic centers'
//         ) THEN 'KTAHV'
//         ELSE 'KAPPL'
//       END
//     `

//     if (company && company !== 'ALL') {
//       conditions.push(`${companyCase} = ?`)
//       params.push(company)
//     }

//     const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

//     // Dynamic subquery clauses
//     const subWhereClauseF2 = conditions.length > 0
//       ? `WHERE ${conditions.join(' AND ').replace(/f\./g, 'f2.')}`
//       : ''
//     const subWhereClauseF3 = conditions.length > 0
//       ? `WHERE ${conditions.join(' AND ').replace(/f\./g, 'f3.')}`
//       : ''

//     let finalWhereClause = whereClause
//     const finalMainParams = [...params]

//     if (source && source !== 'all' && source !== 'Others') {
//       const { key } = normalizeVSrc(source)
//       const sourceCond = 'UPPER(TRIM(m.Verified_Source)) = ?'
//       finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${sourceCond}` : `WHERE ${sourceCond}`
//       finalMainParams.push(key)
//     } else if (source === 'Others') {
//       const sourceCond = '(m.Verified_Source IS NULL OR m.Verified_Source = "" OR UPPER(TRIM(m.Verified_Source)) = "OTHERS")'
//       finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${sourceCond}` : `WHERE ${sourceCond}`
//     }

//     // 🚀 MASTER COLLATION FIX: Apply COLLATE to EVERY Lead_id comparison, including IN clauses
//     const joinClause = `
//       FROM spalabsdomain_Kairali_CRM_Db.fms_enquiry_cold_reverification_v2 f
//       INNER JOIN (
//         SELECT lead_id, MAX(id) as max_id
//         FROM spalabsdomain_Kairali_CRM_Db.fms_enquiry_cold_reverification_v2 f2
//         ${subWhereClauseF2}
//         GROUP BY lead_id
//       ) f_latest ON f.id = f_latest.max_id
//       INNER JOIN spalabsdomain_Kairali_CRM_Db.master_buffer m
//         ON (f.lead_id COLLATE utf8mb4_general_ci) = (m.lead_id COLLATE utf8mb4_general_ci)

//       LEFT JOIN (
//         SELECT s1.Lead_id, s1.Priority, s1.Urgency_YES_NO, s1.Summary_of_Conversation, s1.Lead_Outcome, s1.Lead_Category
//         FROM spalabsdomain_Kairali_CRM_Db.staging_buffer_new s1
//         INNER JOIN (
//           SELECT Lead_id, MAX(sl_no) as max_sl
//           FROM spalabsdomain_Kairali_CRM_Db.staging_buffer_new
//           WHERE (Lead_id COLLATE utf8mb4_general_ci) IN (
//             SELECT DISTINCT (f3.lead_id COLLATE utf8mb4_general_ci)
//             FROM spalabsdomain_Kairali_CRM_Db.fms_enquiry_cold_reverification_v2 f3
//             ${subWhereClauseF3}
//           )
//           GROUP BY Lead_id
//         ) s2 ON (s1.Lead_id COLLATE utf8mb4_general_ci) = (s2.Lead_id COLLATE utf8mb4_general_ci) AND s1.sl_no = s2.max_sl
//       ) a ON (m.lead_id COLLATE utf8mb4_general_ci) = (a.Lead_id COLLATE utf8mb4_general_ci)

//       LEFT JOIN (
//           SELECT data_source, lost_value
//           FROM spalabsdomain_Kairali_CRM_Db.source_wise_lost_potential_value
//           WHERE id IN (
//               SELECT MIN(id) FROM spalabsdomain_Kairali_CRM_Db.source_wise_lost_potential_value GROUP BY data_source
//           )
//       ) lv ON (f.data_source COLLATE utf8mb4_general_ci) = (lv.data_source COLLATE utf8mb4_general_ci)
//     `

//     const countParams = [...params, ...params, ...finalMainParams]
//     const dataParams = [...params, ...params, ...finalMainParams, pageSize, offset]

//     const countSql = `SELECT COUNT(DISTINCT f.lead_id) AS total ${joinClause} ${finalWhereClause}`
//     const [countRows] = await connection.execute(countSql, countParams) as any[]
//     const total = countRows[0]?.total || 0

//     const dataSql = `
//       SELECT
//         m.lead_id,
//         f.generate_date_time as actual_date,
//         m.Name_of_Client,
//         m.Mobile,
//         m.Email_Id,
//         m.Verified_Source,
//         m.Data_Source as master_data_source,
//         ${companyCase} AS company,
//         a.Priority,
//         a.Urgency_YES_NO,
//         a.Summary_of_Conversation,
//         a.Lead_Outcome,
//         a.Lead_Category,
//         f.cold_remarks_by_sales_team,
//         f.cold_by_employee_name,
//         lv.lost_value
//       ${joinClause}
//       ${finalWhereClause}
//       GROUP BY f.lead_id
//       ORDER BY actual_date DESC
//       LIMIT ? OFFSET ?
//     `
//     const [rows] = await connection.execute(dataSql, dataParams) as any[]

//     const leads = rows.map((row: any, index: number) => ({
//       srNo: offset + index + 1,
//       dateTime: row.actual_date,
//       leadId: row.lead_id,
//       clientName: row.Name_of_Client,
//       mobile: row.Mobile,
//       email: row.Email_Id,
//       priority: row.Priority || 'N/A',
//       urgency: row.Urgency_YES_NO || 'N/A',
//       dataSource: row.master_data_source || 'N/A',
//       source: row.Verified_Source || 'N/A',
//       disposition: 'Cold Reverified',
//       leadOutcome: row.Lead_Outcome || 'N/A',
//       leadCategory: row.Lead_Category || 'N/A',
//       summary: row.Summary_of_Conversation || 'N/A',
//       agent: row.cold_by_employee_name || 'N/A',
//       company: row.company,
//       cancellationRemarks: row.cold_remarks_by_sales_team || 'N/A',
//       lostValue: parseFloat(row.lost_value || 0)
//     }))

//     return NextResponse.json({
//       success: true,
//       data: { all: leads },
//       total
//     })

//   } catch (error: any) {
//     console.error('[wasted-leads API] Error:', error)
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 })
//   } finally {
//     if (connection) connection.release()
//   }
// }
