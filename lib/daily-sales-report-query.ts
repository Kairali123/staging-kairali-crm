import { reportQueries } from './marketing-report-query'
export { reportWindow } from './marketing-report-query'
// Reuse the approved Leads / Assign monetary definitions, grouped by salesperson.
export const salesSQL = reportQueries.sales.replace("COALESCE(NULLIF(TRIM(verified_source), ''), 'Others') AS source", "COALESCE(NULLIF(TRIM(sales_person_name), ''), 'Unassigned') AS agent").replace('GROUP BY company, TRIM(verified_source)', 'GROUP BY company, TRIM(sales_person_name)')
// lead_fms is the existing DialShree Received source. Latest staging classification
// is selected once per lead to avoid multiplying calls through a many-to-many join.
export const callsSQL = `WITH calls AS (
 SELECT lead_id, COALESCE(NULLIF(TRIM(Assign_To_MR_Main_Agent_Name),''),'Unassigned') agent
 FROM lead_fms WHERE actual_time >= ? AND actual_time < ? AND sheet_name='DailShree Received Sheet'
), classified AS (
 SELECT s.Lead_id, s.Lead_Relates_to_which_company company,
 ROW_NUMBER() OVER(PARTITION BY s.Lead_id ORDER BY s.Timestamp_2 DESC,s.sl_no DESC) rn
 FROM staging_buffer_new s INNER JOIN (SELECT DISTINCT lead_id FROM calls) c ON CONVERT(c.lead_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(s.Lead_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
)
SELECT CASE WHEN LOWER(TRIM(s.company)) IN ('villaraag','villa raag') THEN 'VILLARAAG'
 WHEN LOWER(TRIM(s.company)) IN ('ktahv','kairali the ayurvedic healing village','kairali ayurvedic centers','kairali ayurvedic center','kairali ayurvedic healing village') THEN 'KTAHV'
 WHEN LOWER(TRIM(s.company)) IN ('kappl','kairali ayurvedic products','kairali ayurvedic products pvt ltd','kairali ayurvedic products pvt. ltd.') THEN 'KAPPL'
 ELSE 'UNMAPPED' END company,c.agent,COUNT(*) dialer
 FROM calls c LEFT JOIN classified s ON CONVERT(c.lead_id USING utf8mb4) COLLATE utf8mb4_unicode_ci=CONVERT(s.Lead_id USING utf8mb4) COLLATE utf8mb4_unicode_ci AND s.rn=1 GROUP BY company,c.agent`
