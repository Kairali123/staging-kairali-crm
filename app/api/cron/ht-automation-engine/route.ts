import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { google } from 'googleapis'
import { verifySessionCookieValue } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// This path is not deployed yet, so Vercel's scheduled caller (vercel.json:
// */5 * * * *, no session cookie) has never actually been able to reach it —
// middleware.ts requires a session for any path not explicitly exempted, and
// this one wasn't. Once deployed, that would silently block every scheduled
// run. Accept either the external cron's Bearer $CRON_SECRET or the signed-in
// session used by the settings page's manual "Run Cron" button, matching the
// pattern other cron routes in this codebase use (see lib/api-auth.ts).
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Manual "Run Now" from the settings page: only a signed-in session may force a run
// (a Bearer CRON_SECRET or an unauthenticated local call never can).
function isForcedManualRun(req: NextRequest): boolean {
  if (req.nextUrl.searchParams.get('force') !== '1') return false
  const sessionCookie = req.cookies.get('kairali_user')?.value
  return Boolean(sessionCookie && verifySessionCookieValue(sessionCookie))
}

function isAuthorizedCronOrSession(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (secret && authHeader.startsWith('Bearer ') && safeCompare(authHeader.slice(7).trim(), secret)) {
    return true
  }
  const sessionCookie = req.cookies.get('kairali_user')?.value
  if (sessionCookie && verifySessionCookieValue(sessionCookie)) {
    return true
  }
  // No CRON_SECRET configured yet and no session: only allow this outside production,
  // so local testing (e.g. curl) keeps working before the secret is set up.
  return !secret && process.env.NODE_ENV !== 'production'
}

// Helpers for IST time.
// Date.getTime() is always a timezone-independent UTC epoch instant — it never needs a
// getTimezoneOffset() correction. The old code added the server's local offset on top of
// the IST offset, so on any server whose system clock isn't UTC (e.g. one already set to
// IST, where getTimezoneOffset() = -330) the two offsets cancelled out and this silently
// returned real UTC time mislabeled as IST — about 5.5 hours behind actual IST, which is
// exactly why triggers scheduled for evening times kept reporting "skipped" all day.
// The fix: shift the epoch by exactly +5:30 and read fields back with the UTC getters
// (toISOString, getUTCDay, etc.) — that's correct on any server timezone.
function nowIST() {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + istOffset)
}

function todayIST() {
  return nowIST().toISOString().slice(0, 10)
}

function currentTimeIST() {
  return nowIST().toISOString().slice(11, 19) // HH:MM:SS
}

// `date` here is always a nowIST()-shifted instant, so it must be read back with the UTC
// getters — the local getters would re-apply the server's own timezone offset on top.
function formatCustomTimestamp(date: Date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// --- GOOGLE SHEETS API CONFIGURATION ---
const SPREADSHEET_ID = "1BkCQF1awWZ-jOVkTioItn7Fp_-kmq1oSQiSSBDKy-JA";
const SHEET_NAME = "HELPING TICKET RAISE REQUEST"; // Make sure the tab name is exactly this (or change it here)

// Auth setup using existing service account in .env
function getGoogleAuth() {
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonStr) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing in .env.local");
  const credentials = JSON.parse(jsonStr);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronOrSession(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: valid CRON_SECRET bearer token or session required." },
      { status: 401 }
    )
  }
  try {
    const pool = await getPool();
    const forceRun = isForcedManualRun(req);

    // 1. Load active rules
    const [rules]: any[] = await pool.query("SELECT * FROM ht_automation_rules WHERE is_active = 1");
    if (rules.length === 0) {
      return NextResponse.json({ message: "No active rules found" });
    }

    const currentIst = nowIST();
    const currentDayName = dayNames[currentIst.getUTCDay()];
    const currentIstTime = currentTimeIST();
    const todayDate = todayIST();
    const formattedTimestamp = formatCustomTimestamp(currentIst);

    const results = [];

    // Initialize Google Sheets API
    let sheets: any;
    try {
      const auth = getGoogleAuth();
      sheets = google.sheets({ version: 'v4', auth });
    } catch (authErr: any) {
      return NextResponse.json({ error: "Google Auth Failed: " + authErr.message }, { status: 500 });
    }

    // 2. Process each rule
    for (const rule of rules) {
      const activeDays = (rule.trigger_days || "").split(",");

      // a. Check day (skipped for a manual forced run)
      if (!forceRun && !activeDays.includes(currentDayName)) {
        results.push({ rule_id: rule.id, status: "skipped", reason: `Not scheduled for ${currentDayName}` });
        continue;
      }

      // b. Check time (within 10 minutes of trigger time)
      const triggerTime = rule.trigger_time; // HH:MM:SS
      const triggerMinutes = parseInt(triggerTime.slice(0, 2)) * 60 + parseInt(triggerTime.slice(3, 5));
      const currentMinutes = parseInt(currentIstTime.slice(0, 2)) * 60 + parseInt(currentIstTime.slice(3, 5));

      if (!forceRun && (currentMinutes < triggerMinutes || currentMinutes > triggerMinutes + 10)) {
        results.push({ rule_id: rule.id, status: "skipped", reason: `Time mismatch. Trigger: ${triggerTime}, Current: ${currentIstTime}` });
        continue;
      }

      // c. Check cooldown
      const [logs]: any[] = await pool.query(`
        SELECT id FROM ht_automation_log 
        WHERE rule_id = ? AND DATE(triggered_at) = ? AND form_status = 'success'
      `, [rule.id, todayDate]);

      if (!forceRun && logs.length > 0) {
        results.push({ rule_id: rule.id, status: "skipped", reason: `Already triggered today` });
        continue;
      }

      // Generate dynamic issue text
      let issueText = rule.form_issue_text || '';
      issueText = issueText.replace(/{doer_name}/g, rule.doer_name);
      issueText = issueText.replace(/{date}/g, todayDate);
      issueText = issueText.replace(/{source_page}/g, rule.source_label);
      issueText = issueText.replace(/{trigger_time}/g, rule.trigger_time);

      // d. Fire HT to Google Sheet DIRECTLY (Append Row to B:M)
      // Note: Column A is skipped because we map to B:M
      const rowData = [
        formattedTimestamp,             // Column B: Timestamp (9/26/2026 14:54:04)
        rule.form_creator_name || '',   // Column C: Pls Choose Your Name
        rule.form_creator_email || '',  // Column D: Email Id
        rule.form_department || '',     // Column E: Department
        issueText,                      // Column F: Challenge/Issue
        rule.form_issue_level || '',    // Column G: Challenge/Issue Level
        rule.doer_name || '',           // Column H: Delegated To
        rule.doer_email || '',          // Column I: Email ID of Delegated Person
        rule.form_solution1 || '',      // Column J: Solution 1
        rule.form_solution2 || '',      // Column K: Solution 2
        rule.form_solution3 || '',      // Column L: Solution 3
        ""                              // Column M: Attachment (Empty)
      ];

      let formStatus = 'failed';
      let errorMsg = '';

      try {
        // values.append with an open-ended column range like "B:M" asks the Sheets API to
        // infer both the target row AND column from existing data, and that inference can
        // misfire when column A (the auto-generated Ticket ID) has rows that B:M doesn't —
        // exactly what happens here, since Ticket IDs get pre-filled ahead of the data that
        // claims them (some rows have only an ID and nothing else). That misfire is what
        // shifted a whole row's data one column left, into the Ticket ID column. Column A is
        // never written by this code — it's generated automatically by the sheet itself —
        // so instead of leaving the row to append's guesswork, find the next row explicitly
        // from column B's length (Timestamp, always populated by this code, so its length
        // reflects real data rows even when column A's ID pre-fill runs ahead of them) and
        // write directly to that exact B:M range. Column A is never touched.
        const timestampColumn = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!B:B`,
        });
        const nextRow = (timestampColumn.data.values?.length || 0) + 1;

        // The tab has a fixed grid size; once data reaches its last row, values.update fails
        // with "exceeds grid limits". Grow the grid by exactly the rows we're short.
        const meta = await sheets.spreadsheets.get({
          spreadsheetId: SPREADSHEET_ID,
          fields: 'sheets.properties(sheetId,title,gridProperties.rowCount)',
        });
        const sheetProps = (meta.data.sheets || []).find((sh: any) => sh.properties?.title === SHEET_NAME)?.properties;
        const gridRows: number = sheetProps?.gridProperties?.rowCount ?? 0;
        if (sheetProps && nextRow > gridRows) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              requests: [{ appendDimension: { sheetId: sheetProps.sheetId, dimension: 'ROWS', length: nextRow - gridRows } }],
            },
          });
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!B${nextRow}:M${nextRow}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [rowData],
          },
        });

        formStatus = 'success';
      } catch (err: any) {
        errorMsg = err.message;
        console.error("Google Sheets append error: ", err);
      }

      // e. Log result
      await pool.query(`
        INSERT INTO ht_automation_log (
          rule_id, rule_name, doer_name, doer_email, source_page, 
          form_status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        rule.id, rule.rule_name, rule.doer_name, rule.doer_email, rule.source_label,
        formStatus, errorMsg
      ]);

      results.push({ rule_id: rule.id, status: formStatus, error: errorMsg });
    }

    return NextResponse.json({ success: true, processed: rules.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
