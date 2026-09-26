import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Helpers for IST time
function nowIST() {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffset)
}

function todayIST() {
  return nowIST().toISOString().slice(0, 10)
}

function currentTimeIST() {
  return nowIST().toISOString().slice(11, 19) // HH:MM:SS
}

function formatCustomTimestamp(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// --- GOOGLE SHEETS API CONFIGURATION ---
const SPREADSHEET_ID = "1BkCQF1awWZ-jOVkTioItn7Fp_-kmq1oSQiSSBDKy-JA"; 
const SHEET_NAME = "Form Responses 1"; // Make sure the tab name is exactly this (or change it here)

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
  try {
    const pool = await getPool();
    
    // 1. Load active rules
    const [rules]: any[] = await pool.query("SELECT * FROM ht_automation_rules WHERE is_active = 1");
    if (rules.length === 0) {
      return NextResponse.json({ message: "No active rules found" });
    }

    const currentIst = nowIST();
    const currentDayName = dayNames[currentIst.getDay()];
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
      
      // a. Check day
      if (!activeDays.includes(currentDayName)) {
        results.push({ rule_id: rule.id, status: "skipped", reason: `Not scheduled for ${currentDayName}` });
        continue;
      }

      // b. Check time (within 10 minutes of trigger time)
      const triggerTime = rule.trigger_time; // HH:MM:SS
      const triggerMinutes = parseInt(triggerTime.slice(0, 2)) * 60 + parseInt(triggerTime.slice(3, 5));
      const currentMinutes = parseInt(currentIstTime.slice(0, 2)) * 60 + parseInt(currentIstTime.slice(3, 5));
      
      if (currentMinutes < triggerMinutes || currentMinutes > triggerMinutes + 10) {
        results.push({ rule_id: rule.id, status: "skipped", reason: `Time mismatch. Trigger: ${triggerTime}, Current: ${currentIstTime}` });
        continue;
      }

      // c. Check cooldown
      const [logs]: any[] = await pool.query(`
        SELECT id FROM ht_automation_log 
        WHERE rule_id = ? AND DATE(triggered_at) = ? AND form_status = 'success'
      `, [rule.id, todayDate]);

      if (logs.length > 0) {
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
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: \`\${SHEET_NAME}!B:M\`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
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
