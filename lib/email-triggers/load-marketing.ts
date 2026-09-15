import { getPool } from '@/lib/db'
import { reportWindow, reportQueries, combineReport, type AggregateRow } from '@/lib/marketing-report-query'
export async function loadScheduledMarketing(date:string){
 const window=reportWindow(date)
  let connection
  try {
    connection=await (await getPool()).getConnection()
    await connection.query("SET SESSION time_zone = '+05:30'")
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await connection.query('START TRANSACTION READ ONLY')
    const results: Record<string, unknown[]> = {}
    for(const [key,sql] of Object.entries(reportQueries)) {
      const [rows]=await connection.query({sql,timeout:20000},window)
      results[key]=rows as unknown[]
    }
    await connection.rollback()
    const report=combineReport(date,results.traffic as AggregateRow[],results.spend as AggregateRow[],results.sales as AggregateRow[],Number((results.duplicates[0] as {duplicates:number}).duplicates),results.leads as AggregateRow[])
    return report
  } catch {
    if(connection) { try {await connection.rollback()} catch {} }
    throw Error('Report data unavailable')
  } finally { connection?.release() }
}
