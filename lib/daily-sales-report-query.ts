import { reportQueries } from './marketing-report-query'
export { reportWindow } from './marketing-report-query'
export const salesSQL = `SELECT 
  c.company, 
  COALESCE(NULLIF(TRIM(c.sales_person_name), ''), 'Unassigned') AS agent,
  COUNT(*) AS records,
  SUM(CASE WHEN c.is_verified = 1 AND
    ((c.company = 'KAPPL' AND COALESCE(c.return_id, '') = '' AND LOWER(COALESCE(o.order_status, '')) NOT LIKE '%cancel%') OR
     (c.company <> 'KAPPL' AND LOWER(COALESCE(c.booking_status,'')) = 'confirmed')) THEN 1 ELSE 0 END) AS conversions,
  SUM(CASE WHEN c.is_verified = 1 AND
    ((c.company = 'KAPPL' AND COALESCE(c.return_id, '') = '' AND LOWER(COALESCE(o.order_status, '')) NOT LIKE '%cancel%') OR
     (c.company <> 'KAPPL' AND LOWER(COALESCE(c.booking_status,'')) = 'confirmed'))
    THEN CASE WHEN c.company = 'KAPPL' THEN COALESCE(NULLIF(c.amount_after_return,0),c.conversion_amount,0) ELSE COALESCE(c.conversion_amount,0) END ELSE 0 END) AS verified,
  SUM(CASE WHEN c.is_verified = 0 AND
    ((c.company = 'KAPPL' AND COALESCE(c.return_id, '') = '' AND LOWER(COALESCE(c.booking_status,'')) NOT IN ('voucher','complimentary') AND LOWER(COALESCE(o.order_status, '')) NOT LIKE '%cancel%') OR
     (c.company <> 'KAPPL' AND LOWER(COALESCE(c.booking_status,'')) NOT IN ('cancelled','booking cancelled','no show','voucher','complimentary')))
    THEN CASE WHEN c.company = 'KAPPL' THEN COALESCE(NULLIF(c.amount_after_return,0),c.conversion_amount,0) ELSE COALESCE(c.conversion_amount,0) END ELSE 0 END) AS unverified,
  SUM(CASE WHEN c.is_verified = 0 AND
    ((c.company = 'KAPPL' AND COALESCE(c.return_id, '') = '' AND LOWER(COALESCE(c.booking_status,'')) NOT IN ('voucher','complimentary') AND LOWER(COALESCE(o.order_status, '')) NOT LIKE '%cancel%') OR
     (c.company <> 'KAPPL' AND LOWER(COALESCE(c.booking_status,'')) NOT IN ('cancelled','booking cancelled','no show','voucher','complimentary')))
    THEN 1 ELSE 0 END) AS unverifiedCount,
  SUM(CASE WHEN c.company = 'KAPPL' AND (
      COALESCE(c.return_id, '') <> '' 
      OR LOWER(COALESCE(c.booking_status, '')) IN ('cancelled', 'booking cancelled', 'order cancel')
      OR LOWER(COALESCE(o.order_status, '')) LIKE '%cancel%'
    ) THEN COALESCE(NULLIF(c.amount_after_return,0),c.conversion_amount,0)
    WHEN c.company <> 'KAPPL' AND LOWER(COALESCE(c.booking_status,'')) IN ('cancelled','booking cancelled','no show') THEN COALESCE(c.conversion_amount,0) ELSE 0 END) AS cancelled,
  SUM(CASE WHEN (c.company = 'KAPPL' AND (
      COALESCE(c.return_id, '') <> '' 
      OR LOWER(COALESCE(c.booking_status, '')) IN ('cancelled', 'booking cancelled', 'order cancel')
      OR LOWER(COALESCE(o.order_status, '')) LIKE '%cancel%'
    )) OR
    (c.company <> 'KAPPL' AND LOWER(COALESCE(c.booking_status,'')) IN ('cancelled','booking cancelled','no show')) THEN 1 ELSE 0 END) AS cancelledCount,
  SUM(c.conversion_amount IS NULL OR c.conversion_amount < 0 OR c.booking_status IS NULL OR c.is_verified IS NULL) AS invalid
  FROM conversion_updates_employeewise c
  LEFT JOIN orders_fms o ON c.booking_order_id COLLATE utf8mb4_unicode_ci = o.order_id COLLATE utf8mb4_unicode_ci
  WHERE c.date_and_time >= ? AND c.date_and_time < ? 
  GROUP BY c.company, TRIM(c.sales_person_name)`
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
