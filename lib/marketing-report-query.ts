import { normalizeVSrcKey, normalizeVSrc } from './lead-source'
/** Read-only, aggregate-only reporting. Metric policy remains subject to owner review. */
export const COMPANY_CODES = ['KTAHV', 'VILLARAAG', 'KAPPL'] as const
export function reportWindow(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid report date')
  const start = new Date(date + 'T00:00:00Z')
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date) throw new Error('Invalid report date')
  return [date, new Date(start.getTime() + 86400000).toISOString().slice(0, 10)]
}
export const reportQueries = {
  leads: `SELECT CASE
    WHEN LOWER(TRIM(Lead_Relates_to_which_company)) = 'villaraag' THEN 'VILLARAAG'
    WHEN LOWER(TRIM(Lead_Relates_to_which_company)) IN ('kairali the ayurvedic healing village','kairali ayurvedic centers','kairali ayurvedic center','kairali ayurvedic healing village') THEN 'KTAHV'
    ELSE 'KAPPL' END AS company,
    COALESCE(Verified_Source,'') AS source, COUNT(*) AS records, COUNT(*) AS leads,
    SUM(LOWER(TRIM(COALESCE(Intent,'')))='high') AS high,
    SUM(LOWER(TRIM(COALESCE(Intent,'')))='medium') AS medium,
    SUM(LOWER(TRIM(COALESCE(Intent,'')))='low') AS low,
    SUM(LOWER(TRIM(COALESCE(Intent,''))) NOT IN ('high','medium','low')) AS unclassified
    FROM (SELECT m.Verified_Source, m.WebSite_Name, s.Lead_Relates_to_which_company, s.Intent,
      ROW_NUMBER() OVER (PARTITION BY m.lead_id ORDER BY s.Timestamp_2 DESC,s.sl_no DESC,m.sl_no DESC) AS rn
      FROM master_buffer m INNER JOIN staging_buffer_new s ON m.lead_id=s.Lead_id
      WHERE m.Timestamp >= ? AND m.Timestamp < ?) ranked
    WHERE rn=1 AND LOWER(COALESCE(WebSite_Name,'')) NOT LIKE '%kserve api outcomes%'
    GROUP BY company, Verified_Source`,
  traffic: `SELECT comapany_name AS company, COALESCE(medium, '') AS source,
    COUNT(*) AS records, SUM(total_users_count) AS traffic,
    SUM(total_users_count IS NULL OR total_users_count < 0) AS invalid
    FROM total_traffic_table WHERE date >= ? AND date < ? GROUP BY comapany_name, medium`,
  spend: `SELECT company, COALESCE(NULLIF(TRIM(source), ''), 'Others') AS source,
    COUNT(*) AS records, SUM(expense_amount) AS spend,
    SUM(expense_amount IS NULL OR expense_amount < 0) AS invalid
    FROM expense_performance WHERE date >= ? AND date < ? GROUP BY company, TRIM(source)`,
  // Match /api/conversion without a type filter, as consumed by Leads / Assign.
  sales: `SELECT company, COALESCE(NULLIF(TRIM(verified_source), ''), 'Others') AS source,
    COUNT(*) AS records,
    SUM(CASE WHEN is_verified = 1 AND
      ((company = 'KAPPL' AND COALESCE(return_id, '') = '') OR
       (company <> 'KAPPL' AND LOWER(COALESCE(booking_status,'')) = 'confirmed')) THEN 1 ELSE 0 END) AS conversions,
    SUM(CASE WHEN is_verified = 1 AND
      ((company = 'KAPPL' AND COALESCE(return_id, '') = '') OR
       (company <> 'KAPPL' AND LOWER(COALESCE(booking_status,'')) = 'confirmed'))
      THEN CASE WHEN company = 'KAPPL' THEN COALESCE(NULLIF(amount_after_return,0),conversion_amount,0) ELSE COALESCE(conversion_amount,0) END ELSE 0 END) AS verified,
    SUM(CASE WHEN is_verified = 0 AND
      ((company = 'KAPPL' AND COALESCE(return_id, '') = '' AND LOWER(COALESCE(booking_status,'')) NOT IN ('voucher','complimentary')) OR
       (company <> 'KAPPL' AND LOWER(COALESCE(booking_status,'')) NOT IN ('cancelled','booking cancelled','no show','voucher','complimentary')))
      THEN CASE WHEN company = 'KAPPL' THEN COALESCE(NULLIF(amount_after_return,0),conversion_amount,0) ELSE COALESCE(conversion_amount,0) END ELSE 0 END) AS unverified,
    SUM(CASE WHEN company = 'KAPPL' AND COALESCE(return_id, '') <> '' THEN COALESCE(NULLIF(amount_after_return,0),conversion_amount,0)
      WHEN company <> 'KAPPL' AND LOWER(COALESCE(booking_status,'')) IN ('cancelled','booking cancelled','no show') THEN COALESCE(conversion_amount,0) ELSE 0 END) AS cancelled,
    SUM(conversion_amount IS NULL OR conversion_amount < 0 OR booking_status IS NULL OR is_verified IS NULL) AS invalid
    FROM conversion_updates_employeewise WHERE date_and_time >= ? AND date_and_time < ? GROUP BY company, TRIM(verified_source)`,
  duplicates: `SELECT COUNT(*) AS duplicates FROM (SELECT company, booking_order_id, COALESCE(return_id,'')
    FROM conversion_updates_employeewise WHERE date_and_time >= ? AND date_and_time < ?
    GROUP BY company, booking_order_id, COALESCE(return_id,'') HAVING COUNT(*) > 1 OR booking_order_id IS NULL OR TRIM(booking_order_id) = '') d`,
}
export interface AggregateRow { company: string; source: string; records: number | string; traffic?: number | string; spend?: number | string; conversions?: number | string; verified?: number | string; unverified?: number | string; cancelled?: number | string; invalid?: number | string; leads?: number | string; high?: number | string; medium?: number | string; low?: number | string; unclassified?: number | string }
export function combineReport(date: string, traffic: AggregateRow[], spend: AggregateRow[], sales: AggregateRow[], duplicates: number, leads?: AggregateRow[]) {
  const normalize=(rows:AggregateRow[])=>rows.map(r=>({...r,source:normalizeVSrcKey(r.source)}))
  traffic=normalize(traffic);spend=normalize(spend).map(r=>({...r,spend:Number(r.spend??0)*(['GOOGLE','FACEBOOK'].includes(r.source)?1.18:1)}));sales=normalize(sales);leads=leads===undefined?undefined:normalize(leads)
  const warnings = ['Metrics follow Leads / Assign. Its production IST date correction must be deployed before lead totals can reconcile.']
  if(leads===undefined)warnings.push('Lead quality feed is unavailable.')
  if(leads?.some(r=>Number(r.unclassified)>0))warnings.push('Some leads have blank or unrecognized Intent; they are included in total leads but not reclassified as low quality.')
  if (duplicates) warnings.push('Repeated or missing booking/order identifiers detected; conversion totals require reconciliation.')
  if ([...traffic,...spend,...sales].some(r=>Number(r.invalid)>0)) warnings.push('Missing or invalid metric inputs detected; totals require reconciliation.')
  if ([...traffic,...spend,...sales].some(r=>!COMPANY_CODES.includes(r.company as typeof COMPANY_CODES[number]))) warnings.push('Unmapped company records excluded; consolidated report is incomplete.')
  const companies = COMPANY_CODES.map(code=>{
    const t=traffic.filter(r=>r.company===code), e=spend.filter(r=>r.company===code), s=sales.filter(r=>r.company===code)
    const l=(leads??[]).filter(r=>r.company===code)
    const sources=[...new Set([...e,...s,...t,...l].map(r=>r.source))].sort()
    const num=(rows:AggregateRow[],field:keyof AggregateRow,source?:string)=>rows.filter(r=>source===undefined||r.source===source).reduce((n,r)=>n+Number(r[field]??0),0)
    const totalSpend=num(e,'spend'), sale=num(s,'verified'), bookings=num(s,'conversions')
    if(sources.some(source=>num(l,'leads',source)>num(t,'traffic',source)&&num(t,'traffic',source)>0)) warnings.push(`${code}: some source lead counts exceed recorded website traffic. Leads/traffic is not a matched visitor-conversion rate.`)
    if (!t.length || !e.length || !s.length) warnings.push(`${code}: at least one data feed has no records for this date; absence does not confirm zero activity.`)
    return {name:code==='VILLARAAG'?'VILARAAG':code,description:'SQL data · awaiting metric reconciliation',traffic:num(t,'traffic'),sources:sources.map(source=>normalizeVSrc(source).label),leads:sources.map(source=>num(l,'leads',source)),high:sources.map(source=>num(l,'high',source)),medium:sources.map(source=>num(l,'medium',source)),low:sources.map(source=>num(l,'low',source)),trafficBySource:sources.map(source=>t.some(r=>r.source===source)?num(t,'traffic',source):null),spend:sources.map(source=>num(e,'spend',source)),sale,bookings,totalLeads:num(l,'leads'),totalSpend,qualityAvailable:leads!==undefined,unverified:num(s,'unverified'),cancelled:num(s,'cancelled'),liveSales:sources.map(source=>({source:normalizeVSrc(source).label,spend:num(e,'spend',source),conversions:num(s,'conversions',source),verified:num(s,'verified',source),unverified:num(s,'unverified',source),cancelled:num(s,'cancelled',source)}))}
  })
  return {date,companies,warnings,status:'needs-reconciliation' as const,generatedAt:new Date().toISOString()}
}
