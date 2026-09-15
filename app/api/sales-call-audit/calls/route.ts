import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import {
  getSalesCallAuditIdentity,
  getSalesCallAuditScope,
  getSessionUser,
  hasSalesCallAuditPageAccess,
  isRowInSalesCallAuditScope,
} from "@/lib/authz"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

export interface AuditedCallDetail {
  callId: string
  leadId: string | null
  clientName: string | null
  clientPhone: string | null
  callTime: string
  callDuration: string | null
  qualityType: "good" | "bad"
  statedOutcome: string | null
  verifiedOutcome: string | null
  avgScore: number | null
  productKnowledge: number | null
  customerUnderstanding: number | null
  communicationSkills: number | null
  objectionHandling: number | null
  closingSkills: number | null
  toneVolume: number | null
  auditorObservation: string | null
  strengths: string[]
  deficiencies: string[]
  recordingUrl?: string | null
  callType?: string | null
  isAudible?: boolean | null
}

function parseScore(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "NA" || val === "N/A") return null
  const n = parseFloat(String(val))
  return isNaN(n) ? null : Number(n.toFixed(2))
}

function formatCallTime(dateVal: any): string {
  if (!dateVal) return ""
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return String(dateVal)
  }
}

function normalizeToYmd(val: any): string | null {
  if (!val) return null
  if (typeof val === "string") {
    const s = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0")
      const month = ddmmyyyy[2].padStart(2, "0")
      const year = ddmmyyyy[3]
      return `${year}-${month}-${day}`
    }
    const ddmmmyyyy = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})$/)
    if (ddmmmyyyy) {
      const day = ddmmmyyyy[1].padStart(2, "0")
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      }
      const month = monthMap[ddmmmyyyy[2].toLowerCase().slice(0, 3)] || "01"
      const year = ddmmmyyyy[3]
      return `${year}-${month}-${day}`
    }
  }
  try {
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return null
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(d)
  } catch {
    return null
  }
}

// Explicit minimal column projections (Issue #52, P1 minimal field selection)
const PARENT_SELECT_COLUMNS = `
  id, emp_id, name, designation, time_stamp, created_at,
  total_calls_audited, good_calls, bad_calls, avg_score,
  daily_fail_pass, hr_name, product_knowledge, customer_understanding,
  communication_skills, objection_handling, closing_skills, tone_volume
`

const BOT_SELECT_COLUMNS = `
  id, timestamp, sales_person_id, sales_person_name, lead_id, buffer_lead_id,
  client_name, call_count, call_type, quality_status,
  avg_score, overall_score, lead_outcome_by_agent, conversion_outcome,
  lead_outcome_verify_status, product_knowledge, customer_understanding,
  communication_skills, objection_handling, closing_skills, tone_and_volume,
  explanation, what_went_wrong_by_sales_team_senior_verifier, complete_explanation,
  remarks, reason, audio_url, is_auditable
`

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to view call details." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (!hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const scope = getSalesCallAuditScope(user)
    if (scope === "none") {
      return NextResponse.json(
        { success: false, error: "Forbidden: no sales call audit data in scope." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const url = new URL(req.url)
    const recordId = url.searchParams.get("record_id")
    const empId = url.searchParams.get("emp_id") || ""
    const name = url.searchParams.get("name") || ""
    const date = url.searchParams.get("date") || ""
    const type = (url.searchParams.get("type") || "all").toLowerCase() // "good" | "bad" | "all"

    const pool = await getPool()

    // 1. Fetch parent audit record strictly with minimal columns (Issue #52)
    let parentRow: any = null
    if (recordId) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT ${PARENT_SELECT_COLUMNS} FROM daily_sales_reports_log_fms WHERE id = ? LIMIT 1`,
          [recordId]
        )
        if (rows && rows.length > 0) {
          parentRow = rows[0]
        }
      } catch (e: any) {
        console.warn("[sales-call-details-api] Could not fetch parent record:", e?.message)
      }
    }

    let scopedEmpId = empId || parentRow?.emp_id || ""
    let scopedName = name || parentRow?.name || ""

    // Row-level scope boundary check
    if (scope === "self") {
      const identity = getSalesCallAuditIdentity(user)
      if (parentRow && !isRowInSalesCallAuditScope(user, parentRow)) {
        return NextResponse.json(
          { success: false, error: "Forbidden: this audit record belongs to another employee" },
          { status: 403, headers: noStoreHeaders }
        )
      }
      scopedEmpId = identity.employeeId || scopedEmpId
      scopedName = identity.name || scopedName
    }

    // 2. Fetch granular call audit records strictly bounded with hard upper ceiling
    let rawBotRows: any[] = []
    const targetYmd = normalizeToYmd(date) || normalizeToYmd(parentRow?.time_stamp)

    if (targetYmd && (scopedEmpId || scopedName)) {
      // Hard ceiling: max 100 rows
      const hardCeilingLimit = 100

      try {
        const [exactRows] = await pool.query<any[]>(
          `SELECT ${BOT_SELECT_COLUMNS} FROM kairali_sales_metric_bot_for_ho
           WHERE (sales_person_id = ? OR sales_person_id LIKE ? OR sales_person_name = ? OR sales_person_name LIKE ?)
             AND DATE(timestamp) = ?
             AND (call_type IS NULL OR (LOWER(call_type) NOT LIKE '%voicemail%' AND LOWER(call_type) NOT LIKE '%voice mail%'))
             AND (is_auditable = '1' OR is_auditable = 1 OR LOWER(is_auditable) = 'true' OR LOWER(is_auditable) = 'yes')
             AND (avg_score > 0 OR (avg_score IS NULL AND overall_score > 0))
           ORDER BY (CASE WHEN quality_status IS NOT NULL OR overall_score > 0 OR avg_score > 0 THEN 1 ELSE 0 END) DESC, timestamp DESC, id DESC
           LIMIT ?`,
          [scopedEmpId, `%${scopedEmpId}%`, scopedName, `%${scopedName || scopedEmpId}%`, targetYmd, hardCeilingLimit]
        )
        if (exactRows && exactRows.length > 0) {
          rawBotRows = exactRows
        }
      } catch (e: any) {
        console.warn("[sales-call-details-api] Query warning:", e?.message)
      }
    }

    // Helper 1: Voicemail calls — rule: if call type = voicemail, exclude it
    const isVoicemailCall = (callTypeVal: any): boolean => {
      const ct = String(callTypeVal || "").trim().toLowerCase()
      return ct.includes("voicemail") || ct.includes("voice mail") || ct === "left_voicemail"
    }

    // Helper 2: IsAudible calls — rule: IsAudible must be true for showing data
    const isAudibleCall = (audibleVal: any): boolean => {
      if (audibleVal === true || audibleVal === 1 || audibleVal === "1") return true
      const s = String(audibleVal || "").trim().toLowerCase()
      return s === "1" || s === "true" || s === "yes"
    }

    // Helper 3: Avg score — rule: avg score must be greater than 0
    const hasPositiveAvgScore = (r: any): boolean => {
      const raw = r.avg_score !== null && r.avg_score !== undefined && String(r.avg_score).trim() !== ""
        ? r.avg_score
        : r.overall_score
      if (raw === null || raw === undefined || String(raw).trim() === "") return false
      const score = parseFloat(String(raw))
      return !isNaN(score) && score > 0
    }

    // Filter raw bot rows for audited calls strictly checking the 3 conditions:
    // 1. If call type = voicemail, exclude it
    // 2. IsAudible must be true for showing data
    // 3. avg score must be greater than 0
    const eligibleBotRows = rawBotRows.filter(r => {
      if (isVoicemailCall(r.call_type)) return false
      if (!isAudibleCall(r.is_auditable)) return false
      if (!hasPositiveAvgScore(r)) return false
      return true
    })

    const goodBotRows = eligibleBotRows.filter(r => {
      const qs = String(r.quality_status || "").toLowerCase()
      const rawScore = r.avg_score || r.overall_score
      const score = rawScore !== null && rawScore !== undefined && String(rawScore).trim() !== "" ? parseFloat(String(rawScore)) : NaN
      const isExplicitBad = qs.includes("bad") || qs.includes("fail")
      const isExplicitGood = qs.includes("good") || qs.includes("pass")
      return isExplicitGood || (!isExplicitBad && (r.lead_outcome_verify_status === "Yes" || (!isNaN(score) && score >= 2.5)))
    })

    const actualGoodCount = goodBotRows.length
    const actualBadCount = Math.max(0, eligibleBotRows.length - actualGoodCount)
    const actualTotalCount = eligibleBotRows.length

    const totalAudited = actualTotalCount > 0
      ? actualTotalCount
      : (parentRow?.total_calls_audited !== null && parentRow?.total_calls_audited !== undefined
          ? Number(parentRow.total_calls_audited)
          : 0)

    const goodCount = actualTotalCount > 0
      ? actualGoodCount
      : (parentRow?.good_calls !== null && parentRow?.good_calls !== undefined
          ? Number(parentRow.good_calls)
          : 0)

    const badCount = actualTotalCount > 0
      ? actualBadCount
      : (parentRow?.bad_calls !== null && parentRow?.bad_calls !== undefined
          ? Number(parentRow.bad_calls)
          : Math.max(0, totalAudited - goodCount))

    const baseScore = parentRow?.avg_score !== null && parentRow?.avg_score !== undefined
      ? Number(parentRow.avg_score)
      : (eligibleBotRows.length > 0
          ? Number((eligibleBotRows.reduce((sum, r) => sum + (parseFloat(String(r.avg_score || r.overall_score)) || 0), 0) / eligibleBotRows.length).toFixed(2))
          : null)

    // Build the list of real call-specific audited calls — strictly no synthetic fallbacks
    const callsList: AuditedCallDetail[] = []

    if (eligibleBotRows.length > 0) {
      for (let idx = 0; idx < eligibleBotRows.length; idx++) {
        const r = eligibleBotRows[idx]
        const qStatus = String(r.quality_status || "").toLowerCase()
        const rawCallScore = r.avg_score || r.overall_score
        const parsedCallScore = rawCallScore !== null && rawCallScore !== undefined && String(rawCallScore).trim() !== "" ? parseFloat(String(rawCallScore)) : NaN

        const isExplicitBad = qStatus.includes("bad") || qStatus.includes("fail")
        const isExplicitGood = qStatus.includes("good") || qStatus.includes("pass")

        const isGood = isExplicitGood || (!isExplicitBad && (r.lead_outcome_verify_status === "Yes" || (!isNaN(parsedCallScore) && parsedCallScore >= 2.5)))

        const qType: "good" | "bad" = isGood ? "good" : "bad"
        if (type === "good" && qType !== "good") continue
        if (type === "bad" && qType !== "bad") continue

        // Strictly call-specific score: return null if not present on this call (no fallback to daily average baseScore)
        const callSpecificScore = !isNaN(parsedCallScore) && parsedCallScore > 0
          ? Number(parsedCallScore.toFixed(2))
          : null

        const rawExp = r.what_went_wrong_by_sales_team_senior_verifier ||
          r.complete_explanation ||
          r.explanation ||
          r.remarks ||
          r.reason ||
          ""

        // Parse 6 call-specific parameters directly from columns, with fallback to bot explanation text
        const extractScore = (pattern: RegExp): number | null => {
          const match = rawExp.match(pattern)
          if (match && match[1]) {
            const v = parseFloat(match[1])
            return isNaN(v) ? null : Number(v.toFixed(1))
          }
          return null
        }

        const pk = parseScore(r.product_knowledge) ?? extractScore(/Product Knowledge\s*\(([0-9.]+)\/5\)/i)
        const cu = parseScore(r.customer_understanding) ?? extractScore(/Customer Understanding\s*\(([0-9.]+)\/5\)/i)
        const cs = parseScore(r.communication_skills) ?? extractScore(/Communication Skills\s*\(([0-9.]+)\/5\)/i)
        const oh = parseScore(r.objection_handling) ?? extractScore(/Objection Handling\s*\(([0-9.]+)\/5\)/i)
        const cl = parseScore(r.closing_skills) ?? extractScore(/Closing Skills\s*\(([0-9.]+)\/5\)/i)
        const tv = parseScore(r.tone_and_volume) ?? extractScore(/Tone and Volume\s*\(([0-9.]+)\/5\)/i)

        // Factual strengths and deficiencies derived from actual evaluated metric scores
        const strengths: string[] = []
        const deficiencies: string[] = []

        if (pk !== null && pk >= 3.5) strengths.push(`Product Knowledge (${pk}/5)`)
        if (cu !== null && cu >= 3.5) strengths.push(`Customer Understanding (${cu}/5)`)
        if (cs !== null && cs >= 3.5) strengths.push(`Communication Skills (${cs}/5)`)
        if (oh !== null && oh >= 3.5) strengths.push(`Objection Handling (${oh}/5)`)
        if (cl !== null && cl >= 3.5) strengths.push(`Closing Skills (${cl}/5)`)
        if (tv !== null && tv >= 3.5) strengths.push(`Tone & Volume (${tv}/5)`)

        if (pk !== null && pk <= 2.5) deficiencies.push(`Product Knowledge (${pk}/5)`)
        if (cu !== null && cu <= 2.5) deficiencies.push(`Customer Understanding (${cu}/5)`)
        if (cs !== null && cs <= 2.5) deficiencies.push(`Communication Skills (${cs}/5)`)
        if (oh !== null && oh <= 2.5) deficiencies.push(`Objection Handling (${oh}/5)`)
        if (cl !== null && cl <= 2.5) deficiencies.push(`Closing Skills (${cl}/5)`)
        if (tv !== null && tv <= 2.5) deficiencies.push(`Tone & Volume (${tv}/5)`)

        const observation = rawExp || (callSpecificScore !== null && callSpecificScore >= 2.5 ? "Good Call" : "Call evaluation completed")

        callsList.push({
          callId: `CALL-${r.id}`,
          leadId: r.lead_id || (r.buffer_lead_id ? `BUF-${r.buffer_lead_id}` : null),
          clientName: r.client_name || null,
          clientPhone: null,
          callTime: formatCallTime(r.timestamp),
          callDuration: null,
          qualityType: qType,
          statedOutcome: r.lead_outcome_by_agent || null,
          verifiedOutcome: r.conversion_outcome || (isGood ? "Verified Passed" : "Audit Mismatch / Quality Benchmark Breached"),
          avgScore: callSpecificScore,
          productKnowledge: pk,
          customerUnderstanding: cu,
          communicationSkills: cs,
          objectionHandling: oh,
          closingSkills: cl,
          toneVolume: tv,
          auditorObservation: observation,
          strengths,
          deficiencies,
          recordingUrl: r.audio_url || null,
          callType: r.call_type || null,
          isAudible: isAudibleCall(r.is_auditable),
        })
      }
    }

    const isDailyPass = parentRow
      ? (parentRow.daily_fail_pass || "").toUpperCase() === "PASS"
      : (baseScore !== null && baseScore >= 3.0)

    return NextResponse.json(
      {
        success: true,
        agent: {
          empId: scopedEmpId || parentRow?.emp_id || "",
          name: scopedName || parentRow?.name || "",
          designation: parentRow?.designation || "Sales Executive",
          date: targetYmd || date || "Today",
          totalCalls: totalAudited,
          goodCalls: goodCount,
          badCalls: badCount,
          avgScore: baseScore !== null ? Number(baseScore.toFixed(2)) : 0,
          outcome: isDailyPass ? "PASS" : "FAIL",
          evaluator: parentRow?.hr_name || null,
          overallMetrics: {
            productKnowledge: parseScore(parentRow?.product_knowledge),
            customerUnderstanding: parseScore(parentRow?.customer_understanding),
            communicationSkills: parseScore(parentRow?.communication_skills),
            objectionHandling: parseScore(parentRow?.objection_handling),
            closingSkills: parseScore(parentRow?.closing_skills),
            toneVolume: parseScore(parentRow?.tone_volume),
            avgScore: baseScore !== null ? Number(baseScore.toFixed(2)) : 0,
            result: isDailyPass ? "PASS" : "FAIL",
          },
        },
        type,
        count: callsList.length,
        calls: callsList,
        data: callsList,
      },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error("[sales-call-details-api] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load call audit details" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
