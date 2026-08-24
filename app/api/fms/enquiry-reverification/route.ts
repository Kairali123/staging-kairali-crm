import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSessionUserResult, hasAdminRole } from "@/lib/authz"

let cachedFilters: { websites: string[], agents: string[], timestamp: number } | null = null;
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
      "website_name"
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

    if (!skipFilters) {
      if (cachedFilters && (Date.now() - cachedFilters.timestamp < CACHE_DURATION)) {
        websites = cachedFilters.websites
        agents = cachedFilters.agents
      } else {
        const [websitesRows]: any = await connection.execute(
          "SELECT DISTINCT website_name FROM fms_enquiry_cold_reverification_v2 WHERE website_name IS NOT NULL AND website_name != '' ORDER BY website_name ASC"
        )
        const [agentsRows]: any = await connection.execute(
          "SELECT DISTINCT cold_by_employee_name FROM fms_enquiry_cold_reverification_v2 WHERE cold_by_employee_name IS NOT NULL AND cold_by_employee_name != '' ORDER BY cold_by_employee_name ASC"
        )
        websites = websitesRows.map((r: any) => r.website_name)
        agents = agentsRows.map((r: any) => r.cold_by_employee_name)
        cachedFilters = { websites, agents, timestamp: Date.now() }
      }
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

    const countWhereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Snapshot params before appending the "not both done" condition — used for the completed-records query
    const completedParams = [...params]

    const executiveDoneClause = "COALESCE(TRIM(verify_action_status_executive_verifier), '') <> ''"
    const seniorDoneClause = "COALESCE(TRIM(verify_action_status_senior_verifier), '') <> ''"
    // Keep the queue visible until both verifiers are complete.
    conditions.push(`NOT (${executiveDoneClause} AND ${seniorDoneClause})`)

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Optimize: Single query to calculate all counts in one table scan
    const countQuery = `
      SELECT 
        COUNT(*) as total,
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
        both_done
      FROM fms_enquiry_cold_reverification_v2
      ${whereClause}
      ORDER BY ${finalSortField} ${finalSortDirection}
      LIMIT ? OFFSET ?
    `

    // Build completed-records query using the same logic as the KPI "completed" count:
    // both executive AND senior verify_action_status must be filled — do NOT rely on both_done column
    // which may not always be updated consistently.
    const completedConditions = [...conditions.filter(c => !c.startsWith("NOT ("))]
    const completedDoneClause = `(${executiveDoneClause} AND ${seniorDoneClause})`
    const completedWhereClause = completedConditions.length > 0
      ? `WHERE (${completedConditions.join(" AND ")}) AND ${completedDoneClause}`
      : `WHERE ${completedDoneClause}`

    const completedQuery = `
      SELECT 
        id,
        generate_date_time,
        enquiry_created_datetime,
        lead_id,
        name_of_client,
        mobile,
        email_id,
        subjects,
        website_name,
        data_source,
        cold_by_employee_name,
        cold_done_datetime,
        cold_remarks_by_sales_team,
        uid,
        company_belongs_to,
        doer_executive_verifier AS CH,
        verify_action_status_executive_verifier AS CI,
        valid_reason_executive_verifier AS CJ,
        what_went_wrong_by_sales_team_executive_verifier AS CK,
        overall_rating_out_of_10_executive_verifier AS CL,
        suggested_solution_for_improvement_executive_verifier AS CM,
        remarks_executive_verifier AS CN,
        ht_created_to_executive_verifier_if_delay_status,
        actual_executive_verifier AS actual,
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
        transfer_to_user_fms_if_reopen,
        actual_senior_verifier AS senior_actual,
        both_done
      FROM fms_enquiry_cold_reverification_v2
      ${completedWhereClause}
      ORDER BY generate_date_time DESC
      LIMIT 200
    `

    // Run count aggregation, paginated select, and completed-records fetch concurrently
    const [countResult, dataResult, completedResult]: any = await Promise.all([
      connection.execute(countQuery, params),
      connection.execute(query, [...params, String(limit), String(offset)]),
      connection.execute(completedQuery, completedParams)
    ])

    const total = countResult[0][0]?.total || 0
    const pending = Number(countResult[0][0]?.pending || 0)
    const completed = Number(countResult[0][0]?.completed || 0)
    const appsheet = Number(countResult[0][0]?.appsheet || 0)
    const rows = dataResult[0]

    const completedRows = completedResult[0] || []

    return NextResponse.json({
      success: true,
      data: rows,
      completedData: completedRows,
      pagination: {
        total: pending,
        page,
        limit,
        totalPages: Math.ceil(pending / limit)
      },
      kpi: {
        total,
        pending,
        completed,
        appsheet,
        seniorReopen: Number(countResult[0][0]?.seniorReopen || 0),
        seniorCold: Number(countResult[0][0]?.seniorCold || 0),
        seniorReopenToOther: Number(countResult[0][0]?.seniorReopenToOther || 0),
        seniorEscalateAbhilash: Number(countResult[0][0]?.seniorEscalateAbhilash || 0)
      },
      filters: skipFilters ? null : {
        websites,
        agents
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
