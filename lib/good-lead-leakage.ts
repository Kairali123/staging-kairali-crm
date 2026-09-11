function reportWindow(date:string) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date')
 const start=new Date(date+'T00:00:00Z')
 if(!Number.isFinite(start.getTime()) || start.toISOString().slice(0,10)!==date) throw new Error('Invalid date')
 return [date,new Date(start.getTime()+86400000).toISOString().slice(0,10)]
}
export function leakageParams(from: string, to: string, company: string, review: string) {
  reportWindow(from)
  const end = reportWindow(to)[1]
  if (from > to || (Date.parse(end)-Date.parse(from))/86400000 > 93) throw new Error('Choose a date range of up to 93 days')
  if (!['ALL','KTAHV','KAPPL','VILLARAAG'].includes(company) || !['ALL','AI','Manual'].includes(review)) throw new Error('Invalid filter')
  return [from,end,company,company,review,review]
}
// Classification mirrors the existing enquiry-reverification workflow.
// AI recommendation and completed senior decision are independent signals.
export const leakageBase = `WITH reviews AS (
 SELECT company_belongs_to company, data_source source, cold_by_employee_name owner,
 generate_date_time review_date, call_count_before_cold attempts, 'Current' origin, uid, lead_id,
 LOWER(TRIM(COALESCE(AI_Verification_Category,''))) ai,
 LOWER(TRIM(COALESCE(verify_action_status_senior_verifier,''))) senior,
 (COALESCE(TRIM(verify_action_status_executive_verifier),'') <> '' AND COALESCE(TRIM(verify_action_status_senior_verifier),'') <> '') completed
 FROM fms_enquiry_cold_reverification_v2
 UNION ALL
 SELECT company, data_source, assign_to_mr, generate_datetime, call_count_before_cold, 'Archive', uid, lead_id,
 '', LOWER(TRIM(COALESCE(verify_action_status_senior_verifier,''))), 1
 FROM archieve_fms_enquiry_cold_reverification_v2
), classified AS (
 SELECT *, CASE
 WHEN ai LIKE '%escalate%' OR ai LIKE '%abhilash%' THEN 'Escalation'
 WHEN ai LIKE '%other%' THEN 'Reassign'
 WHEN ai LIKE '%reopen%' THEN 'Reopen'
 WHEN ai LIKE '%cold%' THEN 'Cold'
 ELSE 'Manual review' END ai_bucket
 FROM reviews
), signals AS (
 SELECT *, (ai_bucket = 'Reopen') ai_reopened,
 (completed = 1 AND senior = 'reopen') manual_reopened,
 CASE WHEN origin = 'Current' AND ai_bucket <> 'Manual review' THEN 'AI' ELSE 'Manual' END review
 FROM classified
), filtered AS (
 SELECT * FROM signals WHERE review_date >= ? AND review_date < ? AND (? = 'ALL' OR company = ?) AND (? = 'ALL' OR review = ?)
)`
export const leakageQuery = `${leakageBase}
SELECT COALESCE(NULLIF(TRIM(company),''),'Unattributed') company,
 COALESCE(NULLIF(TRIM(source),''),'Unattributed') source,
 COALESCE(NULLIF(TRIM(owner),''),'Unassigned') owner, review, origin,
 COUNT(*) cold, SUM(ai_reopened OR manual_reopened) reopened,
 SUM(ai_reopened) aiReopened, SUM(manual_reopened) manualReopened,
 SUM(ai_reopened AND manual_reopened) bothReopened,
 SUM(ai_bucket = 'Reassign') aiReassign,
 SUM(ai_bucket = 'Escalation') aiEscalated,
 SUM(completed = 1 AND senior = 'reopen to other') manualReassign,
 SUM(completed = 1 AND senior = 'reopen and escalate to abhilash sir') manualEscalated,
 SUM(completed = 0) pending,
 SUM(ai_reopened AND completed = 1 AND senior = 'cold') aiRejected,
 SUM(attempts IS NULL OR attempts < 0) missingAttempts,
 SUM(COALESCE(TRIM(company),'') = '') missingCompany,
 SUM(COALESCE(TRIM(source),'') = '') missingSource,
 SUM(COALESCE(TRIM(owner),'') = '') missingOwner,
 SUM(CASE WHEN (ai_reopened OR manual_reopened) AND attempts IS NOT NULL
 AND TRIM(CAST(attempts AS CHAR)) REGEXP '^[0-9]+$' AND CAST(attempts AS UNSIGNED) < 3 THEN 1 ELSE 0 END) lowAttempts
FROM filtered
GROUP BY company, source, owner, review, origin ORDER BY reopened DESC, cold DESC`
export interface LeakageRow {company:string;source:string;owner:string;review:string;origin:string;cold:number;reopened:number;lowAttempts:number;aiReopened:number;manualReopened:number;bothReopened:number;aiReassign:number;aiEscalated:number;manualReassign:number;manualEscalated:number;pending:number;aiRejected:number;missingAttempts:number;missingCompany:number;missingSource:number;missingOwner:number}

export const leakageDiagnosticsQuery = `${leakageBase}
SELECT COUNT(*) records,
 COUNT(DISTINCT NULLIF(TRIM(uid),'')) distinctReviewIds,
 COUNT(DISTINCT NULLIF(TRIM(lead_id),'')) distinctLeadIds,
 SUM(COALESCE(TRIM(uid),'') = '') missingReviewIds,
 SUM(COALESCE(TRIM(lead_id),'') = '') missingLeadIds,
 MIN(review_date) firstReview, MAX(review_date) lastReview
FROM filtered`
