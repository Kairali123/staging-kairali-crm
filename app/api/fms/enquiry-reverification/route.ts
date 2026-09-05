import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSessionUserResult, hasAdminRole } from "@/lib/authz"

let cachedFilters: { websites: string[], agents: string[], priorities: string[], timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Fetch all enquiries with search and filter parameters (optimized)
export async function GET(req: NextRequest) {
  let connection
  try {
    const session = getSessionUserResult(req)
    if (session.state === "missing") {
      return NextResponse.json(
        { success: false, error: "Access denied: Not logged in" },
        { status: 401 }
      )
    }

    if (session.state === "invalid") {
      return NextResponse.json(
        { success: false, error: "Access denied: Invalid session" },
        { status: 401 }
      )
    }

    const user = session.user
    const isSenior = user?.permissions?.includes("cold_enquiry_reverification.Senior") || false
    const isAdmin = hasAdminRole(user, "lower") || user?.permissions?.includes("all") || false
    const hasViewPermission = user?.permissions?.includes("cold_enquiry_reverification.view") || isSenior || isAdmin

    if (!hasViewPermission) {
      return NextResponse.json(
        { success: false, error: "Access denied: Insufficient permissions" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const company = searchParams.get("company")
    const source = searchParams.get("source")
    const website = searchParams.get("website")
    const coldBy = searchParams.get("coldBy")
    const verifyStatus = searchParams.get("verifyStatus")
    const priority = searchParams.get("priority")
    const workflowTab = searchParams.get("workflowTab") || searchParams.get("tab") || "manual_review"
    const skipFilters = searchParams.get("skipFilters") === "true"

    const sortField = searchParams.get("sortField") || "generate_date_time"
    const sortDirection = searchParams.get("sortDirection") || "desc"

    // Whitelist allowed sort columns to prevent SQL Injection
    const allowedSortFields = [
      "generate_date_time",
      "enquiry_created_datetime",
      "lead_id",
      "data_source",
      "call_count_before_cold",
      "company_belongs_to",
      "website_name",
      "sqv_priority"
    ]
    const finalSortField = allowedSortFields.includes(sortField) ? sortField : "generate_date_time"
    const finalSortDirection = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC"

    const limit = parseInt(searchParams.get("limit") || "25", 10)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const offset = (page - 1) * limit

    const pool = await getPool()
    connection = await pool.getConnection()

    await connection.execute("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED")

    let websites: string[] = []
    let agents: string[] = []
    let priorities: string[] = []

    if (!skipFilters) {
      if (cachedFilters && (Date.now() - cachedFilters.timestamp < CACHE_DURATION)) {
        websites = cachedFilters.websites
        agents = cachedFilters.agents
        priorities = cachedFilters.priorities || []
      } else {
        const [websitesRows]: any = await connection.execute(
          "SELECT DISTINCT website_name FROM fms_enquiry_cold_reverification_v2 WHERE website_name IS NOT NULL AND website_name != '' ORDER BY website_name ASC"
        )
        const [agentsRows]: any = await connection.execute(
          "SELECT DISTINCT cold_by_employee_name FROM fms_enquiry_cold_reverification_v2 WHERE cold_by_employee_name IS NOT NULL AND cold_by_employee_name != '' ORDER BY cold_by_employee_name ASC"
        )
        let dbPriorities: string[] = []
        try {
          const [priorityRows]: any = await connection.execute(
            "SELECT DISTINCT TRIM(COALESCE(NULLIF(TRIM(sqv_priority), ''), NULLIF(TRIM(sqv_intent), ''))) as p FROM archieve_fms_enquiry_cold_reverification_v2 WHERE (sqv_priority IS NOT NULL AND TRIM(sqv_priority) != '') OR (sqv_intent IS NOT NULL AND TRIM(sqv_intent) != '') ORDER BY p ASC"
          )
          dbPriorities = priorityRows.map((r: any) => r.p?.trim()).filter(Boolean)
        } catch (e) {
          console.log("Could not fetch distinct sqv_priority:", e)
        }
        websites = websitesRows.map((r: any) => r.website_name)
        agents = agentsRows.map((r: any) => r.cold_by_employee_name)
        priorities = Array.from(new Set(["High", "Medium", "Low", ...dbPriorities]))
        cachedFilters = { websites, agents, priorities, timestamp: Date.now() }
      }
    }

    let hasFmsPriorityCol = false
    try {
      const [cols]: any = await connection.execute("SHOW COLUMNS FROM fms_enquiry_cold_reverification_v2 LIKE 'sqv_priority'")
      hasFmsPriorityCol = Array.isArray(cols) && cols.length > 0
    } catch {
      hasFmsPriorityCol = false
    }

    const conditions: string[] = []
    const params: any[] = []

    if (!isAdmin) {
      const emailPrefix = user.email.split('@')[0]
      if (isSenior) {
        conditions.push("SUBSTRING_INDEX(doer_senior_verifier_email_id, '@', 1) = ?")
        params.push(emailPrefix)
      } else {
        conditions.push("SUBSTRING_INDEX(doer_executive_verifier_email_id, '@', 1) = ?")
        params.push(emailPrefix)
      }
    }

    if (search) {
      const cleanSearch = search.trim()
      conditions.push("(lead_id = ? OR name_of_client = ? OR mobile = ? OR email_id = ? OR uid = ?)")
      params.push(cleanSearch, cleanSearch, cleanSearch, cleanSearch, cleanSearch)
    }

    if (from) {
      conditions.push("generate_date_time >= ?")
      params.push(`${from} 00:00:00`)
    }
    if (to) {
      conditions.push("generate_date_time <= ?")
      params.push(`${to} 23:59:59`)
    }

    if (company && company !== "ALL") {
      conditions.push("company_belongs_to = ?")
      params.push(company)
    }

    if (source && source !== "all") {
      conditions.push("data_source LIKE ?")
      params.push(`%${source}%`)
    }

    if (website && website !== "all") {
      conditions.push("website_name = ?")
      params.push(website)
    }

    if (coldBy && coldBy !== "all") {
      conditions.push("cold_by_employee_name = ?")
      params.push(coldBy)
    }

    if (verifyStatus && verifyStatus !== "all") {
      // Filter strictly by Senior Verifier Action Status column
      conditions.push("TRIM(verify_action_status_senior_verifier) = ?")
      params.push(verifyStatus)
    }

    if (priority && priority !== "all") {
      const cleanPriority = priority.trim()
      conditions.push("TRIM(COALESCE(NULLIF(TRIM(sqv_priority), ''), NULLIF(TRIM(dialer_priority), ''))) = ?")
      params.push(cleanPriority)
    }

    const countWhereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const executiveDoneClause = "COALESCE(TRIM(verify_action_status_executive_verifier), '') <> ''"
    const seniorDoneClause = "COALESCE(TRIM(verify_action_status_senior_verifier), '') <> ''"

    // Strictly mutually exclusive SQL predicates for AI_Verification_Category
    const isEscalateClause = `(LOWER(TRIM(AI_Verification_Category)) LIKE '%escalate%' OR LOWER(TRIM(AI_Verification_Category)) LIKE '%abhilash%')`
    const isOtherClause = `((LOWER(TRIM(AI_Verification_Category)) LIKE '%other%') AND NOT ${isEscalateClause})`
    const isReopenClause = `((LOWER(TRIM(AI_Verification_Category)) LIKE '%reopen%') AND NOT ${isOtherClause} AND NOT ${isEscalateClause})`
    const isColdClause = `((LOWER(TRIM(AI_Verification_Category)) LIKE '%cold%') AND NOT ${isReopenClause} AND NOT ${isOtherClause} AND NOT ${isEscalateClause})`
    const isManualReviewClause = `(
      AI_Verification_Category IS NULL 
      OR TRIM(AI_Verification_Category) = '' 
      OR (
        NOT ${isEscalateClause}
        AND NOT ${isOtherClause}
        AND NOT ${isReopenClause}
        AND NOT ${isColdClause}
      )
    )`

    // Apply workflow tab specific filter using AI_Verification_Category
    if (workflowTab === "manual_review") {
      conditions.push(isManualReviewClause)
    } else if (workflowTab === "ai_reopen" || workflowTab === "ai_reopened") {
      conditions.push(isReopenClause)
    } else if (workflowTab === "ai_cold") {
      conditions.push(isColdClause)
    } else if (workflowTab === "ai_reopen_to_other" || workflowTab === "reopen_to_other") {
      conditions.push(isOtherClause)
    } else if (workflowTab === "ai_escalate_abhilash" || workflowTab === "escalate_to_abhilash") {
      conditions.push(isEscalateClause)
    } else {
      // Keep queue visible until both verifiers are complete
      conditions.push(`NOT (${executiveDoneClause} AND ${seniorDoneClause})`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Optimize: Single query to calculate all counts in one table scan with mutually exclusive clauses
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ${isManualReviewClause} THEN 1 ELSE 0 END) as countManualReview,
        SUM(CASE WHEN ${isReopenClause} THEN 1 ELSE 0 END) as countAiReopen,
        SUM(CASE WHEN ${isColdClause} THEN 1 ELSE 0 END) as countAiCold,
        SUM(CASE WHEN ${isOtherClause} THEN 1 ELSE 0 END) as countAiReopenToOther,
        SUM(CASE WHEN ${isEscalateClause} THEN 1 ELSE 0 END) as countAiEscalateAbhilash,
        SUM(CASE WHEN NOT (${executiveDoneClause} AND ${seniorDoneClause}) THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ${executiveDoneClause} AND ${seniorDoneClause} THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN LOWER(cold_done_in_calling_appsheet_or_in_dailer) = 'yes' 
                      OR verify_action_status_executive_verifier = 'Reopen and Escalate To Abhilash Sir' 
                      OR verify_action_status_senior_verifier = 'Reopen and Escalate To Abhilash Sir' THEN 1 ELSE 0 END) as appsheet,
        SUM(CASE WHEN ${executiveDoneClause} AND ${seniorDoneClause} AND TRIM(verify_action_status_senior_verifier) = 'Reopen' THEN 1 ELSE 0 END) as seniorReopen,
        SUM(CASE WHEN ${executiveDoneClause} AND ${seniorDoneClause} AND TRIM(verify_action_status_senior_verifier) = 'Cold' THEN 1 ELSE 0 END) as seniorCold,
        SUM(CASE WHEN ${executiveDoneClause} AND ${seniorDoneClause} AND TRIM(verify_action_status_senior_verifier) = 'Reopen to Other' THEN 1 ELSE 0 END) as seniorReopenToOther,
        SUM(CASE WHEN ${executiveDoneClause} AND ${seniorDoneClause} AND TRIM(verify_action_status_senior_verifier) = 'Reopen and Escalate To Abhilash Sir' THEN 1 ELSE 0 END) as seniorEscalateAbhilash
      FROM fms_enquiry_cold_reverification_v2
      ${countWhereClause}
    `

    const query = `
      SELECT 
        id,
        generate_date_time,
        enquiry_created_datetime,
        lead_id,
        name_of_client,
        mobile,
        email_id,
        subjects,
        notes,
        ivr_url,
        website_name,
        data_source,
        cold_by_employee_name,
        cold_done_datetime,
        cold_remarks_by_sales_team,
        call_count_before_cold,
        call_history_link,
        cold_done_in_calling_appsheet_or_in_dailer,
        uid,
        company_belongs_to,
        appsheet_call_recording_url,
        COALESCE(NULLIF(TRIM(sqv_priority), ''), NULLIF(TRIM(dialer_priority), '')) AS sqv_priority,
        planned_executive_verifier AS planned,
        actual_executive_verifier AS actual,
        time_delay_executive_verifier AS timedelay,
        doer_executive_verifier AS CH,
        verify_action_status_executive_verifier AS CI,
        valid_reason_executive_verifier AS CJ,
        what_went_wrong_by_sales_team_executive_verifier AS CK,
        overall_rating_out_of_10_executive_verifier AS CL,
        suggested_solution_for_improvement_executive_verifier AS CM,
        remarks_executive_verifier AS CN,
        ht_created_to_executive_verifier_if_delay_status,
        doer_executive_verifier_email_id,
        hs_status_if_escalate_to_abhilash_sir_by_executive AS CQ,
        planned_senior_verifier AS senior_planned,
        actual_senior_verifier AS senior_actual,
        time_delay_senior_verifier AS senior_timedelay,
        doer_senior_verifier AS CW,
        verify_action_status_senior_verifier AS CX,
        valid_reason_senior_verifier AS CY,
        what_went_wrong_by_sales_team_senior_verifier AS CZ,
        overall_rating_out_of_10_senior_verifier AS DA,
        suggested_solution_for_improvement_senior_verifier AS DB,
        remarks_senior_verifier AS DC,
        ht_created_to_senior_verifier_if_delay_status,
        whatsapp_alert_to_sales_person_if_reopen,
        email_alert_to_sales_person_if_reopen,
        doer_senior_verifier_email_id,
        hs_status_if_escalate_to_abhilash_sir_by_senior,
        transfer_to_user_fms_if_reopen,
        both_done,
        AI_Verification_Category
      FROM fms_enquiry_cold_reverification_v2
      ${whereClause}
      ORDER BY ${finalSortField} ${finalSortDirection}
      LIMIT ? OFFSET ?
    `

    // Build completed-records query for `archieve_fms_enquiry_cold_reverification_v2`
    // using its table column mappings with the same user/company/date/search/verifyStatus/priority filters
    const archiveConditions: string[] = []
    const archiveParams: any[] = []

    if (!isAdmin) {
      const emailPrefix = user.email.split('@')[0]
      if (isSenior) {
        archiveConditions.push("SUBSTRING_INDEX(doer_email_senior_verifier, '@', 1) = ?")
        archiveParams.push(emailPrefix)
      } else {
        archiveConditions.push("SUBSTRING_INDEX(doer_email_executive_verifier, '@', 1) = ?")
        archiveParams.push(emailPrefix)
      }
    }

    if (search) {
      const cleanSearch = search.trim()
      archiveConditions.push("(lead_id = ? OR name_of_client = ? OR mobile = ? OR email_id = ? OR uid = ?)")
      archiveParams.push(cleanSearch, cleanSearch, cleanSearch, cleanSearch, cleanSearch)
    }

    if (from) {
      archiveConditions.push("generate_datetime >= ?")
      archiveParams.push(`${from} 00:00:00`)
    }
    if (to) {
      archiveConditions.push("generate_datetime <= ?")
      archiveParams.push(`${to} 23:59:59`)
    }

    if (company && company !== "ALL") {
      archiveConditions.push("company = ?")
      archiveParams.push(company)
    }

    if (source && source !== "all") {
      archiveConditions.push("data_source LIKE ?")
      archiveParams.push(`%${source}%`)
    }

    if (website && website !== "all") {
      archiveConditions.push("website_name = ?")
      archiveParams.push(website)
    }

    if (coldBy && coldBy !== "all") {
      archiveConditions.push("assign_to_mr = ?")
      archiveParams.push(coldBy)
    }

    if (verifyStatus && verifyStatus !== "all") {
      archiveConditions.push("TRIM(verify_action_status_senior_verifier) = ?")
      archiveParams.push(verifyStatus)
    }

    if (priority && priority !== "all") {
      archiveConditions.push("TRIM(COALESCE(NULLIF(TRIM(sqv_priority), ''), NULLIF(TRIM(sqv_intent), ''))) = ?")
      archiveParams.push(priority.trim())
    }

    const archiveWhereClause = archiveConditions.length > 0
      ? `WHERE ${archiveConditions.join(" AND ")}`
      : ""

    const completedQuery = `
      SELECT 
        id,
        generate_datetime AS generate_date_time,
        enquiry_created_datetime,
        lead_id,
        name_of_client,
        mobile,
        email_id,
        subjects,
        website_name,
        data_source,
        assign_to_mr AS cold_by_employee_name,
        cold_done_datetime,
        cold_remarks_by_sales_team,
        uid,
        company AS company_belongs_to,
        COALESCE(NULLIF(TRIM(sqv_priority), ''), NULLIF(TRIM(sqv_intent), '')) AS sqv_priority,
        doer_executive_verifier AS CH,
        verify_action_status_executive_verifier AS CI,
        valid_reason_executive_verifier AS CJ,
        what_went_wrong_sales_team_executive_verifier AS CK,
        overall_rating_executive_verifier AS CL,
        suggested_solution_executive_verifier AS CM,
        remarks_executive_verifier AS CN,
        ht_created_executive_verifier_delay_status AS ht_created_to_executive_verifier_if_delay_status,
        actual_executive_verifier AS actual,
        doer_senior_verifier AS CW,
        verify_action_status_senior_verifier AS CX,
        valid_reason_senior_verifier AS CY,
        what_went_wrong_sales_team_senior_verifier AS CZ,
        overall_rating_senior_verifier AS DA,
        suggested_solution_senior_verifier AS DB,
        remarks_senior_verifier AS DC,
        ht_created_senior_verifier_delay_status AS ht_created_to_senior_verifier_if_delay_status,
        whatsapp_alert_sales_person_reopen AS whatsapp_alert_to_sales_person_if_reopen,
        email_alert_sales_person_reopen AS email_alert_to_sales_person_if_reopen,
        transfer_to_user_fms_if_reopen,
        actual_senior_verifier AS senior_actual,
        both_done
      FROM archieve_fms_enquiry_cold_reverification_v2
      ${archiveWhereClause}
      ORDER BY generate_datetime DESC
    `

    const archiveCountQuery = `
      SELECT 
        COUNT(*) as completed,
        SUM(CASE WHEN TRIM(verify_action_status_senior_verifier) = 'Reopen' THEN 1 ELSE 0 END) as seniorReopen,
        SUM(CASE WHEN TRIM(verify_action_status_senior_verifier) = 'Cold' THEN 1 ELSE 0 END) as seniorCold,
        SUM(CASE WHEN TRIM(verify_action_status_senior_verifier) = 'Reopen to Other' THEN 1 ELSE 0 END) as seniorReopenToOther,
        SUM(CASE WHEN TRIM(verify_action_status_senior_verifier) = 'Reopen and Escalate To Abhilash Sir' THEN 1 ELSE 0 END) as seniorEscalateAbhilash
      FROM archieve_fms_enquiry_cold_reverification_v2
      ${archiveWhereClause}
    `

    // Run count aggregation, paginated select, and completed-records fetch concurrently
    const [countResult, dataResult, completedResult, archiveCountResult]: any = await Promise.all([
      connection.execute(countQuery, params),
      connection.execute(query, [...params, String(limit), String(offset)]),
      connection.execute(completedQuery, archiveParams),
      connection.execute(archiveCountQuery, archiveParams)
    ])

    const pending = Number(countResult[0][0]?.pending || 0)
    const archiveCompleted = Number(archiveCountResult[0][0]?.completed || 0)
    const activeCompleted = Number(countResult[0][0]?.completed || 0)
    const completed = archiveCompleted + activeCompleted
    const total = pending + completed
    const appsheet = Number(countResult[0][0]?.appsheet || 0)
    const rows = dataResult[0]

    const completedRows = completedResult[0] || []

    const seniorReopen = Number(archiveCountResult[0][0]?.seniorReopen || 0) + Number(countResult[0][0]?.seniorReopen || 0)
    const seniorCold = Number(archiveCountResult[0][0]?.seniorCold || 0) + Number(countResult[0][0]?.seniorCold || 0)
    const seniorReopenToOther = Number(archiveCountResult[0][0]?.seniorReopenToOther || 0) + Number(countResult[0][0]?.seniorReopenToOther || 0)
    const seniorEscalateAbhilash = Number(archiveCountResult[0][0]?.seniorEscalateAbhilash || 0) + Number(countResult[0][0]?.seniorEscalateAbhilash || 0)

    const countManualReview = Number(countResult[0][0]?.countManualReview || 0)
    const countAiReopen = Number(countResult[0][0]?.countAiReopen || 0)
    const countAiCold = Number(countResult[0][0]?.countAiCold || 0)
    const countAiReopenToOther = Number(countResult[0][0]?.countAiReopenToOther || 0)
    const countAiEscalateAbhilash = Number(countResult[0][0]?.countAiEscalateAbhilash || 0)

    let currentTabTotal = countManualReview
    if (workflowTab === "ai_reopen" || workflowTab === "ai_reopened") currentTabTotal = countAiReopen
    else if (workflowTab === "ai_cold") currentTabTotal = countAiCold
    else if (workflowTab === "ai_reopen_to_other" || workflowTab === "reopen_to_other") currentTabTotal = countAiReopenToOther
    else if (workflowTab === "ai_escalate_abhilash" || workflowTab === "escalate_to_abhilash") currentTabTotal = countAiEscalateAbhilash
    else if (workflowTab === "all") currentTabTotal = pending

    const totalPages = Math.max(1, Math.ceil(currentTabTotal / limit))

    return NextResponse.json({
      success: true,
      data: rows,
      completedData: completedRows,
      pagination: {
        total: currentTabTotal,
        page,
        limit,
        totalPages
      },
      tabCounts: {
        manualReview: countManualReview,
        aiReopen: countAiReopen,
        aiCold: countAiCold,
        aiReopenToOther: countAiReopenToOther,
        aiEscalateAbhilash: countAiEscalateAbhilash,
        // Backward compatibility keys
        aiReopened: countAiReopen
      },
      kpi: {
        total,
        pending,
        completed,
        appsheet,
        seniorReopen,
        seniorCold,
        seniorReopenToOther,
        seniorEscalateAbhilash
      },
      filters: skipFilters ? null : {
        websites,
        agents,
        priorities
      }
    })

  } catch (error) {
    console.error("[enquiry-reverification API GET] request failed:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch enquiry reverification data" }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}

// Update reverification comments, notes, or status
export async function POST(req: NextRequest) {
  let connection
  try {
    const body = await req.json()

    const pool = await getPool()
    connection = await pool.getConnection()

    if (body.isExecutiveVerify) {
      const {
        id,
        CH,
        CI,
        CJ,
        CK,
        CL,
        CM,
        CN,
        ht_created_to_executive_verifier_if_delay_status,
        doer_executive_verifier_email_id,
        CQ,
      } = body

      if (!id) {
        return NextResponse.json({ success: false, error: "Missing Enquiry ID" }, { status: 400 })
      }

      const query = `
        UPDATE fms_enquiry_cold_reverification_v2
        SET 
          actual_executive_verifier = NOW(),
          time_delay_executive_verifier = CASE 
            WHEN planned_executive_verifier IS NOT NULL THEN 
              CONCAT(
                FLOOR(HOUR(TIMEDIFF(NOW(), planned_executive_verifier))), 'h ',
                ABS(MINUTE(TIMEDIFF(NOW(), planned_executive_verifier))), 'm'
              )
            ELSE '0h 0m'
          END,
          doer_executive_verifier = ?,
          verify_action_status_executive_verifier = ?,
          valid_reason_executive_verifier = ?,
          what_went_wrong_by_sales_team_executive_verifier = ?,
          overall_rating_out_of_10_executive_verifier = ?,
          suggested_solution_for_improvement_executive_verifier = ?,
          remarks_executive_verifier = ?,
          ht_created_to_executive_verifier_if_delay_status = ?,
          doer_executive_verifier_email_id = ?,
          hs_status_if_escalate_to_abhilash_sir_by_executive = ?
        WHERE id = ?
      `
      const [result] = await connection.execute(query, [
        CH || "",
        CI || "",
        CJ || "",
        CK || "",
        CL || null,
        CM || "",
        CN || "",
        ht_created_to_executive_verifier_if_delay_status || "",
        doer_executive_verifier_email_id || "",
        CQ || "",
        id
      ])

      return NextResponse.json({
        success: true,
        message: "Executive verification saved successfully",
        result
      })
    }

    if (body.isSeniorVerify) {
      const {
        id,
        CW,
        CX,
        CY,
        CZ,
        DA,
        DB,
        DC,
        ht_created_to_senior_verifier_if_delay_status,
        whatsapp_alert_to_sales_person_if_reopen,
        email_alert_to_sales_person_if_reopen,
        doer_senior_verifier_email_id,
        hs_status_if_escalate_to_abhilash_sir_by_senior,
        transfer_to_user_fms_if_reopen
      } = body

      if (!id) {
        return NextResponse.json({ success: false, error: "Missing Enquiry ID" }, { status: 400 })
      }

      const query = `
        UPDATE fms_enquiry_cold_reverification_v2
        SET 
          actual_senior_verifier = NOW(),
          time_delay_senior_verifier = CASE 
            WHEN planned_senior_verifier IS NOT NULL THEN 
              CONCAT(
                FLOOR(HOUR(TIMEDIFF(NOW(), planned_senior_verifier))), 'h ',
                ABS(MINUTE(TIMEDIFF(NOW(), planned_senior_verifier))), 'm'
              )
            ELSE '0h 0m'
          END,
          doer_senior_verifier = ?,
          verify_action_status_senior_verifier = ?,
          valid_reason_senior_verifier = ?,
          what_went_wrong_by_sales_team_senior_verifier = ?,
          overall_rating_out_of_10_senior_verifier = ?,
          suggested_solution_for_improvement_senior_verifier = ?,
          remarks_senior_verifier = ?,
          ht_created_to_senior_verifier_if_delay_status = ?,
          whatsapp_alert_to_sales_person_if_reopen = ?,
          email_alert_to_sales_person_if_reopen = ?,
          doer_senior_verifier_email_id = ?,
          hs_status_if_escalate_to_abhilash_sir_by_senior = ?,
          transfer_to_user_fms_if_reopen = ?
        WHERE id = ?
      `
      const [result] = await connection.execute(query, [
        CW || "",
        CX || "",
        CY || "",
        CZ || "",
        DA || null,
        DB || "",
        DC || "",
        ht_created_to_senior_verifier_if_delay_status || "",
        whatsapp_alert_to_sales_person_if_reopen || "",
        email_alert_to_sales_person_if_reopen || "",
        doer_senior_verifier_email_id || "",
        hs_status_if_escalate_to_abhilash_sir_by_senior || "",
        transfer_to_user_fms_if_reopen || "",
        id
      ])

      return NextResponse.json({
        success: true,
        message: "Senior verification saved successfully",
        result
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action. Only Executive and Senior verification updates are allowed." }, { status: 400 })

  } catch (error: any) {
    console.error("[enquiry-reverification API POST] request failed:", error)
    return NextResponse.json({ success: false, error: "Failed to update: " + (error?.message || String(error)) }, { status: 500 })
  } finally {
    if (connection) connection.release()
  }
}
