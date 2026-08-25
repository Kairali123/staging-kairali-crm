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

function safeStr(val, fallback = "") {
  if (val === null || val === undefined) return fallback;
  if (val instanceof Date) return safeDate(val);
  const s = String(val).trim();
  return s === "" ? fallback : s;
}

function safeDate(val) {
  if (!val) return "";
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "";
      const p = (n) => String(n).padStart(2, "0");
      return `${val.getFullYear()}-${p(val.getMonth() + 1)}-${p(val.getDate())}T${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`;
    }
    const str = String(val).trim();
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    return str;
  } catch {
    return "";
  }
}

function mapCompany(websiteName, dataSource, sheetName) {
  const s = `${websiteName || ""} ${dataSource || ""} ${sheetName || ""}`.toUpperCase();
  if (s.includes("VILLARAAG") || s.includes("VILLA RAAG")) return "VILLARAAG";
  if (s.includes("KTAHV") || s.includes("HEALING VILLAGE") || s.includes("AHV")) return "KTAHV";
  if (s.includes("KAPPL") || s.includes("PRODUCTS") || s.includes("KAP") || s.includes("AYURVEDIC PRODUCTS")) return "KAPPL";
  return "KAC";
}

function deriveLeadStatus(category, disposition) {
  if (category) {
    const cat = category.toLowerCase().trim();
    if (cat.includes("qualified") && !cat.includes("non") && !cat.includes("not") && !cat.includes("un")) {
      return "Qualified";
    }
    if (cat.includes("non") || cat.includes("not") || cat.includes("un") || cat.includes("junk") || cat.includes("cold")) {
      return "Non-Qualified";
    }
  }
  if (disposition) {
    const d = disposition.toLowerCase().trim();
    if (["sale made", "converted", "transfer to mr", "call transferred"].some(k => d.includes(k))) {
      return "Qualified";
    }
    if (["cold", "not interested", "declined sale", "junk", "disconnected number", "do not call", "dead air"].some(k => d.includes(k))) {
      return "Non-Qualified";
    }
  }
  return "Pending";
}

function mapRow(row) {
  const websiteName = safeStr(row.WebSite_Name);
  const dataSource = safeStr(row.Data_Source);
  const sheetName = safeStr(row.sheet_name);
  const clientName = safeStr(row.Name_of_Client) || safeStr(row.customer_name);
  const mobile = safeStr(row.Mobile) || safeStr(row.Default_Contact_No);
  const email = safeStr(row.Email_Id) || safeStr(row.Default_Email_ID);
  const audioUrl = safeStr(row.latest_recording_url) || safeStr(row.IVR_URL);
  const disposition = safeStr(row.Full_Disposition);
  const leadCategory = safeStr(row.lead_category);
  const intent = safeStr(row.sqv_lead_intent) || safeStr(row.lead_priority);

  return {
    id: safeStr(row.lead_id) || safeStr(row.sl_no),
    dbId: row.sl_no ?? null,
    sl_no: row.sl_no,
    timeIdKey: safeStr(row.timeIdKey),
    timestamp: safeDate(row.Timestamp),
    dateTime: safeDate(row.Date_Time),
    clientName: clientName || "—",
    mobile: mobile || "—",
    email: email || "—",
    subject: safeStr(row.Subjects),
    notes: safeStr(row.Notes),
    ivrUrl: audioUrl,
    latest_recording_url: safeStr(row.latest_recording_url),
    website: websiteName,
    dataSource: dataSource,
    verified_source: safeStr(row.Verified_Source),
    assigned_mr: safeStr(row.Assign_To_MR_Main_Agent_Name),
    assignto: safeStr(row.Assign_To_MR_Main_Agent_Name) || safeStr(row.Transfer_To),
    transcription: safeStr(row.Remarks_History) || safeStr(row.Comment),
    viewUrl: safeStr(row.Sample_New_Order_Form_Link),
    callSubId: safeStr(row.list_id),
    initialid: safeStr(row.lead_id) || safeStr(row.timeIdKey),
    callstarttime: safeDate(row.actual_time || row.Timestamp),
    callendtime: safeDate(row.send_lead_Date_Time || row.actual_time),
    callduration: safeStr(row.call_recording_duration, "0"),
    callstatus: disposition,
    calltype: safeStr(row.Call_Type),
    callendreason: safeStr(row.HangUp_Reason),
    aicallcategory: leadCategory,
    finalcallstatus: disposition,
    customerengagementlevel: safeStr(row.call_Count ? `${row.call_Count} calls` : ""),
    interestlevel: intent,
    calloutcome: disposition,
    nextactionrequired: safeStr(row.Followup),
    aicallsummary: safeStr(row.Remarks_History) || safeStr(row.Comment) || safeStr(row.Call_Notes),
    lead_status: leadCategory || disposition,
    leadstatus: deriveLeadStatus(leadCategory, disposition),
    cutomercontext: safeStr(row.Call_Notes) || safeStr(row.Notes),
    preferreddatetime: safeDate(row.Followup_Date),
    cutomerintent: intent,
    additionalnotes: safeStr(row.Comment),
    servicecategory: safeStr(row.from_sheet),
    finalleadoutcome: disposition,
    scheduledtime: safeDate(row.planned_date || row.Followup_Date),
    scheduledstatus: safeStr(row.Followup),
    company: mapCompany(websiteName, dataSource, sheetName),
    tat: safeStr(row.Time_Delay),
    doer: safeStr(row.doer),
    agent_Id: safeStr(row.agent_Id),
    campaign_name: safeStr(row.campaign_name),
    campaign_id: safeStr(row.campaign_id),
    leadId_from_dialer: safeStr(row.leadId_from_dialer),
    created_at: safeDate(row.created_at),
    updated_at: safeDate(row.created_at),
  };
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  const [rows] = await conn.execute(`
    SELECT *
    FROM lead_fms
    ORDER BY sl_no DESC
    LIMIT 5
  `);

  const mapped = rows.map(mapRow);
  console.log('Successfully mapped 5 rows:');
  console.log(JSON.stringify(mapped, null, 2));

  await conn.end();
}

main().catch(console.error);
