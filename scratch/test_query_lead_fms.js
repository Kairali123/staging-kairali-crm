const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  });
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  console.time('query');
  const [rows] = await conn.execute(`
    SELECT
      sl_no, timeIdKey, lead_id, Timestamp, Date_Time,
      Name_of_Client, Mobile, Email_Id, Subjects, Notes,
      IVR_URL, WebSite_Name, Data_Source, Verified_Source,
      actual_time, Assign_To_MR_Main_Agent_Name, Remarks_History,
      call_Count, agent_Id, Full_Disposition, HangUp_Reason,
      Call_Type, Comment, Call_Notes, Time_Delay, Transfer_To,
      Sample_New_Order_Form_Link, created_at, latest_recording_url,
      sqv_lead_intent, lead_category, lead_priority, doer,
      call_recording_duration, planned_date, campaign_name,
      customer_name, list_id, leadId_from_dialer, campaign_id,
      from_sheet, Followup, Followup_Date, Lead_Conversion,
      Conversion_Amount, send_lead_Date_Time, sheet_name
    FROM lead_fms
    ORDER BY sl_no DESC
    LIMIT 15000
  `);
  console.timeEnd('query');
  console.log('Fetched rows:', rows.length);
  console.log('First row sample:', rows[0]?.sl_no, rows[0]?.Name_of_Client, rows[0]?.Full_Disposition);

  await conn.end();
}

main().catch(console.error);
