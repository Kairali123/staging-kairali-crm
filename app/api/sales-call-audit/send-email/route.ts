import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { getSessionUser, hasSalesCallAuditSendAccess } from "@/lib/authz"
import { getPool } from "@/lib/db"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
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

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to send audit reports." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (!hasSalesCallAuditSendAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.send permission required to dispatch email reports." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    // Issue #60: Reject any client-supplied metrics, employee lists, or custom recipients
    if (body.metrics || body.employees || body.to || body.recipient || body.reportContent) {
      return NextResponse.json(
        {
          success: false,
          error: "Client-supplied metrics, employee data, or custom recipient override is prohibited. All report data is server-computed.",
        },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const requestedDate = body.date || body.dateKey || ""
    const targetYmd = normalizeToYmd(requestedDate) || normalizeToYmd(new Date())

    const pool = await getPool()

    let dbRows: any[] = []
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT id, emp_id, name, designation, time_stamp, created_at,
                total_calls_audited, good_calls, bad_calls, avg_score, daily_fail_pass
         FROM daily_sales_reports_log_fms
         WHERE DATE(time_stamp) = ? OR DATE(created_at) = ?
         ORDER BY id DESC`,
        [targetYmd, targetYmd]
      )
      dbRows = rows || []
    } catch (dbErr: any) {
      console.error("[sales-call-audit-email] Database read error:", dbErr?.message)
      return NextResponse.json(
        { success: false, error: "Database error fetching audit report data" },
        { status: 500, headers: noStoreHeaders }
      )
    }

    if (dbRows.length === 0) {
      return NextResponse.json(
        { success: false, error: `No audit records found for the requested date: ${targetYmd}` },
        { status: 404, headers: noStoreHeaders }
      )
    }

    // Server-derived metrics calculation (100% computed from authoritative database records)
    let totalCalls = 0
    let totalGood = 0
    let totalBad = 0
    let passCount = 0
    let failCount = 0
    let scoreSum = 0
    let scoreCount = 0

    const employees = dbRows.map((r) => {
      const calls = Number(r.total_calls_audited) || 0
      const good = Number(r.good_calls) || 0
      const bad = Number(r.bad_calls) || 0
      const score = r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null
      const isPass = String(r.daily_fail_pass || "").toUpperCase() === "PASS"

      totalCalls += calls
      totalGood += good
      totalBad += bad
      if (isPass) passCount++
      else failCount++

      if (score !== null && !isNaN(score)) {
        scoreSum += score
        scoreCount++
      }

      return {
        id: r.emp_id || "",
        name: r.name || "",
        designation: r.designation || "",
        calls,
        good,
        bad,
        score: score !== null ? score.toFixed(2) : "N/A",
        result: isPass ? "PASS" : "FAIL",
      }
    })

    const totalAgents = dbRows.length
    const teamAvgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(2) : "0.00"

    const targetRecipient = "sysadmin@kairali.com"
    const displayDate = targetYmd || "Today"
    const subject = `[Daily HR Quality Audit Report] - Agent-wise Call Audit (${displayDate})`

    const employeeRowsHtml = employees
      .map(
        (emp) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 14px; font-weight: bold; color: #1e293b; font-size: 13px;">
            ${emp.name}
            ${emp.id ? `<div style="font-size: 10px; color: #64748b; font-family: monospace; font-weight: normal;">${emp.id}</div>` : ""}
          </td>
          <td style="padding: 12px 14px; text-align: center; font-weight: bold; color: #334155; font-size: 13px;">
            ${emp.calls}
          </td>
          <td style="padding: 12px 14px; text-align: center; font-size: 12px;">
            <span style="color: #059669; font-weight: bold;">${emp.good}</span>
            <span style="color: #94a3b8; margin: 0 4px;">/</span>
            <span style="color: #e11d48; font-weight: bold;">${emp.bad}</span>
          </td>
          <td style="padding: 12px 14px; text-align: center; font-weight: bold; color: #4338ca; font-size: 13px;">
            ${emp.score}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; ${
              emp.result === "PASS"
                ? "background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"
                : "background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;"
            }">
              ${emp.result}
            </span>
          </td>
        </tr>
      `
      )
      .join("")

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: Arial, sans-serif;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 24px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; font-weight: bold;">
              Head Office • Daily Quality Audit
            </div>
            <h1 style="margin: 6px 0 2px; font-size: 22px; font-weight: bold; color: #ffffff;">
              Agent-wise Call Audit Report
            </h1>
            <div style="font-size: 12px; opacity: 0.9;">
              Audit date: <strong>${displayDate}</strong>
            </div>
          </div>

          <div style="display: flex; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 20px; text-align: center;">
            <div style="flex: 1; border-right: 1px solid #e2e8f0; padding: 0 8px;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Agents</div>
              <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 2px;">${totalAgents}</div>
            </div>
            <div style="flex: 1; border-right: 1px solid #e2e8f0; padding: 0 8px;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Pass / Fail</div>
              <div style="font-size: 18px; font-weight: bold; margin-top: 2px;">
                <span style="color: #059669;">${passCount}</span> / <span style="color: #e11d48;">${failCount}</span>
              </div>
            </div>
            <div style="flex: 1; border-right: 1px solid #e2e8f0; padding: 0 8px;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Good / Bad Calls</div>
              <div style="font-size: 18px; font-weight: bold; margin-top: 2px;">
                <span style="color: #059669;">${totalGood}</span> / <span style="color: #e11d48;">${totalBad}</span>
              </div>
            </div>
            <div style="flex: 1; padding: 0 8px;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Team Avg Score</div>
              <div style="font-size: 20px; font-weight: bold; color: #4338ca; margin-top: 2px;">${teamAvgScore}</div>
            </div>
          </div>

          <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold;">Sales Agent</th>
                  <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; text-align: center;">Total Calls</th>
                  <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; text-align: center;">Good / Bad</th>
                  <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; text-align: center;">Score</th>
                  <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; text-align: center;">Outcome</th>
                </tr>
              </thead>
              <tbody>
                ${employeeRowsHtml}
              </tbody>
            </table>
          </div>

          <div style="background-color: #f8fafc; padding: 14px 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            This is an automated report generated by Kairali Group CRM • Head Office Quality Assurance System
          </div>
        </div>
      </body>
      </html>
    `

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com"
    const smtpPort = parseInt(process.env.SMTP_PORT || "587")
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS

    if (!smtpUser || !smtpPass) {
      console.warn("[sales-call-audit-email] SMTP credentials missing, failing closed")
      return NextResponse.json(
        {
          success: false,
          error: "SMTP credentials not configured on server",
        },
        { status: 500, headers: noStoreHeaders }
      )
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      const info = await transporter.sendMail({
        from: `"Kairali CRM QA Audit" <${smtpUser}>`,
        to: targetRecipient,
        subject,
        html: emailHtml,
      })

      console.log("[sales-call-audit-email] Dispatched report via SMTP:", info.messageId)

      return NextResponse.json(
        {
          success: true,
          message: `Report successfully dispatched to ${targetRecipient}`,
          messageId: info.messageId,
          metrics: {
            totalAgents,
            passCount,
            failCount,
            totalCalls,
            totalGood,
            totalBad,
            teamAvgScore,
          },
        },
        { headers: noStoreHeaders }
      )
    } catch (mailErr: any) {
      console.error("[sales-call-audit-email] SMTP dispatch failed:", mailErr?.message)
      return NextResponse.json(
        {
          success: false,
          error: `SMTP dispatch failed: ${mailErr?.message || "Mailer error"}`,
        },
        { status: 502, headers: noStoreHeaders }
      )
    }
  } catch (error: any) {
    console.error("[sales-call-audit-email] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process email report" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
