export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { getPool } from "@/lib/db";

// ─── Company / Source → SQL table mapping ────────────────────────────────────
interface SourceConfig {
  source: string;
  table: string;
  dateCol: string;
  mobileCol: string;
  leadIdCol: string;
  nameCol?: string;
  emailCol?: string;
  sourceFilter?: string;
}

interface CompanyConfig {
  company: string;
  companyKey: string;
  bufferMatch: string[];
  sources: SourceConfig[];
}


const COMPANY_CONFIG: CompanyConfig[] = [
  {
    company: "VillaRaag",
    companyKey: "VILLARAAG",
    bufferMatch: ["villaraag", "villa raag", "villa", "raag"],
    sources: [
      { source: "Facebook", table: "villa_raag_facebook_ppc_api", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "lead_id", nameCol: "name_of_client", emailCol: "email_id" },
      { source: "Google", table: "api_villaraag_new_website_online_enquiry", dateCol: "create_date_time", mobileCol: "phone_number", leadIdCol: "enq_id", nameCol: "name", emailCol: "email_id", sourceFilter: "utm_medium != 'organic' OR utm_medium IS NULL" },
      { source: "website", table: "api_villaraag_new_website_online_enquiry", dateCol: "create_date_time", mobileCol: "phone_number", leadIdCol: "enq_id", nameCol: "name", emailCol: "email_id", sourceFilter: "utm_medium = 'organic'" },
      { source: "Anjali AI Web", table: "villaraag_chatbase_leads_api_anjali_menon", dateCol: "chat_created_date_time", mobileCol: "phone", leadIdCol: "lead_id", nameCol: "name", emailCol: "email" },
      { source: "IVR", table: "ivr_lead_api_knowrality", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "lead_id", nameCol: "name_of_client", emailCol: "email_id", sourceFilter: "((lead_relates_to_which_company LIKE '%villa%' AND lead_relates_to_which_company NOT LIKE '%village%') OR lead_relates_to_which_company LIKE '%raag%' OR (company_by_extension LIKE '%villa%' AND company_by_extension NOT LIKE '%village%') OR company_by_extension LIKE '%raag%')" },
      { source: "others", table: "bulk_whatsapp_reply_enquiry_generation", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "id", nameCol: "client_name", emailCol: "email_id", sourceFilter: "website_name LIKE '%villa%' OR website_name LIKE '%raag%'" }
    ],
  },
  {
    company: "Kairali The Ayurvedic Healing Village",
    companyKey: "KTAHV",
    bufferMatch: ["kairali the ayurvedic healing village", "ktahv", "healing village", "palakkad"],
    sources: [
      { source: "Facebook", table: "ktahv_facebook_lead_api", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "lead_id", nameCol: "client_name", emailCol: "email_id" },
      { source: "Google", table: "ktahv_new_website_online_enquiry_api", dateCol: "create_date_time", mobileCol: "phone_number", leadIdCol: "enq_id", nameCol: "name", emailCol: "email_id" },
      { source: "IVR", table: "ivr_lead_api_knowrality", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "lead_id", nameCol: "name_of_client", emailCol: "email_id", sourceFilter: "lead_relates_to_which_company LIKE '%KTAHV%' OR lead_relates_to_which_company LIKE '%healing village%' OR company_by_extension LIKE '%KTAHV%' OR company_by_extension LIKE '%healing village%'" },
      { source: "Website", table: "site_exit_popup_lead_generation_api", dateCol: "Created_date_time", mobileCol: "phone", leadIdCol: "id", nameCol: "name", emailCol: "email", sourceFilter: "landing_page LIKE '%ktahv%' OR landing_page LIKE '%healing village%'" },
      { source: "CRR", table: "site_exit_popup_lead_generation_api", dateCol: "Created_date_time", mobileCol: "phone", leadIdCol: "id", nameCol: "name", emailCol: "email", sourceFilter: "landing_page LIKE '%crr%'" },
      { source: "Site Exit Pop-up", table: "site_exit_popup_lead_generation_api", dateCol: "Created_date_time", mobileCol: "phone", leadIdCol: "id", nameCol: "name", emailCol: "email" },
      { source: "Others", table: "bulk_whatsapp_reply_enquiry_generation", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "id", nameCol: "client_name", emailCol: "email_id", sourceFilter: "website_name LIKE '%KTAHV%' OR website_name LIKE '%healing village%'" }
    ],
  },
  {
    company: "Kairali Ayurvedic Product",
    companyKey: "KAPL",
    bufferMatch: ["kairali ayurvedic product", "kairali ayurvedic products", "kapl", "kappl", "product", "products", "kairali product", "priya", "priyasharma"],
    sources: [
      { source: "IVR", table: "ivr_lead_api_knowrality", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "lead_id", nameCol: "name_of_client", emailCol: "email_id", sourceFilter: "lead_relates_to_which_company LIKE '%product%' OR company_by_extension LIKE '%product%' OR company_by_extension LIKE '%kappl%'" },
      { source: "Others", table: "bulk_whatsapp_reply_enquiry_generation", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "id", nameCol: "client_name", emailCol: "email_id", sourceFilter: "website_name LIKE '%product%' OR new_category LIKE '%kappl%' OR (website_name IS NULL AND (new_category IS NULL OR new_category = 'Data Backup - Deleted'))" },
      { source: "Priyasharma AI-web", table: "kairali_chatbase_leads_api_priya_sharma", dateCol: "chat_created_date_time", mobileCol: "phone", leadIdCol: "lead_id", nameCol: "name", emailCol: "email", sourceFilter: "src = 'Widget or Iframe' OR src = 'API'" },
      { source: "Priyasharma AI-instagram", table: "kairali_chatbase_leads_api_priya_sharma", dateCol: "chat_created_date_time", mobileCol: "phone", leadIdCol: "lead_id", nameCol: "name", emailCol: "email", sourceFilter: "src = 'Instagram'" },
      { source: "Priyasharma AI-Whatsapp", table: "kairali_chatbase_leads_api_priya_sharma", dateCol: "chat_created_date_time", mobileCol: "phone", leadIdCol: "lead_id", nameCol: "name", emailCol: "email", sourceFilter: "src = 'WhatsApp'" },
      { source: "Priyasharma AI-facebook", table: "kairali_chatbase_leads_api_priya_sharma", dateCol: "chat_created_date_time", mobileCol: "phone", leadIdCol: "lead_id", nameCol: "name", emailCol: "email", sourceFilter: "src = 'Facebook'" },
      { source: "Priyasharma AI Chat", table: "kairali_chatbase_leads_api_priya_sharma", dateCol: "chat_created_date_time", mobileCol: "phone", leadIdCol: "lead_id", nameCol: "name", emailCol: "email", sourceFilter: "src IS NULL OR src NOT IN ('Widget or Iframe', 'API', 'Instagram', 'WhatsApp', 'Facebook')" }
    ],
  },
  {
    company: "Kairali Ayurvedic Treatment Cenres",
    companyKey: "KATC",
    bufferMatch: ["kairali ayurvedic treatment", "kac", "centres", "centers", "katc", "treatment", "center", "centre"],
    sources: [
      { source: "IVR", table: "ivr_lead_api_knowrality", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "lead_id", nameCol: "name_of_client", emailCol: "email_id", sourceFilter: "lead_relates_to_which_company LIKE '%center%' OR lead_relates_to_which_company LIKE '%centre%' OR company_by_extension LIKE '%center%' OR company_by_extension LIKE '%centre%' OR company_by_extension LIKE '%kac%'" },
      { source: "Others", table: "bulk_whatsapp_reply_enquiry_generation", dateCol: "date_time", mobileCol: "mobile", leadIdCol: "id", nameCol: "client_name", emailCol: "email_id", sourceFilter: "website_name LIKE '%center%' OR website_name LIKE '%centre%'" }
    ]
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normMobile(m: string | null | undefined): string {
  if (!m) return "";
  const digits = String(m).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function toIST(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function rowDate(val: unknown): string {
  if (val instanceof Date) return toIST(val);
  return String(val).slice(0, 10);
}

function detectDuplicates(mobiles: string[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const m of mobiles) {
    if (!m) continue;
    if (seen.has(m)) dupes++;
    else seen.add(m);
  }
  return dupes;
}

// ─── Direct source query ──────────────────────────────────────────────────────

interface DirectEntry {
  date: string;
  leadIds: string[];
  mobiles: string[];
  timestamps: number[];
}

async function queryDirectTable(
  pool: any,
  cfg: SourceConfig,
  days: number
): Promise<DirectEntry[]> {
  const where = cfg.sourceFilter ? `AND (${cfg.sourceFilter})` : "";
  const sql = `
    SELECT DATE(\`${cfg.dateCol}\`) AS dt,
           \`${cfg.dateCol}\`     AS arrival_time,
           \`${cfg.leadIdCol}\`     AS lead_id,
           \`${cfg.mobileCol}\`     AS mobile
    FROM \`${cfg.table}\`
    WHERE \`${cfg.dateCol}\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ${where}
    ORDER BY \`${cfg.dateCol}\` ASC
  `;
  const [rows]: any[] = await pool.query(sql, [days]);

  const byDate: Record<string, { leadIds: string[]; mobiles: string[]; timestamps: number[] }> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = { leadIds: [], mobiles: [], timestamps: [] };
    byDate[dt].leadIds.push(String(r.lead_id ?? ""));
    byDate[dt].mobiles.push(normMobile(r.mobile));
    const t = r.arrival_time ? new Date(r.arrival_time).getTime() : new Date(dt).getTime();
    byDate[dt].timestamps.push(t);
  }
  return Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
}

// ─── Buffer mobile sets by date ───────────────────────────────────────────────

interface BufferQueryResult {
  byDate: Record<string, Set<string>>;
  allBufferList: Array<{ mobile: string; time: number; dateStr: string; leadId: string }>;
}

async function queryBuffer(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<BufferQueryResult> {
  const likeExprs = companyMatch.map(() => "LOWER(sbn.Lead_Relates_to_which_company) LIKE ?");
  // Include rows where staging_buffer_new has no match (NULL) or no company set —
  // otherwise NULL LIKE is NULL (falsy) and valid buffer rows are silently dropped.
  const companyWhere = likeExprs.length > 0
    ? `AND (sbn.Lead_id IS NULL OR sbn.Lead_Relates_to_which_company IS NULL OR sbn.Lead_Relates_to_which_company = '' OR ${likeExprs.join(" OR ")})`
    : "";
  const params: any[] = [days + 2, ...companyMatch.map((c) => `%${c.toLowerCase()}%`)];

  const [rows]: any[] = await pool.query(
    `SELECT DATE(mb.Date_Time) AS dt,
            mb.Date_Time AS arrival_time,
            mb.Mobile,
            mb.lead_id
     FROM master_buffer mb
     LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
     WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ${companyWhere}`,
    params
  );

  const byDate: Record<string, Set<string>> = {};
  const allBufferList: Array<{ mobile: string; time: number; dateStr: string; leadId: string }> = [];

  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.Mobile);
    if (m) {
      byDate[dt].add(m);
      const time = r.arrival_time ? new Date(r.arrival_time).getTime() : new Date(dt).getTime();
      allBufferList.push({ mobile: m, time, dateStr: dt, leadId: String(r.lead_id ?? "") });
    }
  }
  return { byDate, allBufferList };
}

// ─── CRM mobile sets by date ──────────────────────────────────────────────────

async function queryCRM(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Record<string, Set<string>>> {
  const likeClause = companyMatch
    .map(() => "LOWER(sbn.Lead_Relates_to_which_company) LIKE ?")
    .join(" OR ");
  const params: any[] = [days, ...companyMatch.map((c) => `%${c.toLowerCase()}%`)];

  const [rows]: any[] = await pool.query(
    `SELECT DATE(mb.Date_Time) AS dt, mb.Mobile
     FROM master_buffer mb
     INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
     WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND (${likeClause})`,
    params
  );

  const byDate: Record<string, Set<string>> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.Mobile);
    if (m) byDate[dt].add(m);
  }
  return byDate;
}

// ─── KServe mobile sets by date (staging_buffer_new.Assign_To_MR_Main) ───────

async function queryKServe(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Record<string, Set<string>>> {
  const likeClause = companyMatch
    .map(() => "LOWER(sbn.Lead_Relates_to_which_company) LIKE ?")
    .join(" OR ");
  const params: any[] = [days, ...companyMatch.map((c) => `%${c.toLowerCase()}%`)];
  const [rows]: any[] = await pool.query(
    `SELECT DATE(mb.Date_Time) AS dt, mb.Mobile
     FROM master_buffer mb
     INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
     WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND LOWER(sbn.Assign_To_MR_Main) LIKE '%kserve%'
       AND (${likeClause})`,
    params
  );

  const byDate: Record<string, Set<string>> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.Mobile);
    if (m) byDate[dt].add(m);
  }
  return byDate;
}

// ─── Sales mobile sets by date (staging_buffer_new.Assign_To_MR_Main) ────────

async function querySales(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Record<string, Set<string>>> {
  const likeClause = companyMatch
    .map(() => "LOWER(sbn.Lead_Relates_to_which_company) LIKE ?")
    .join(" OR ");
  const params: any[] = [days, ...companyMatch.map((c) => `%${c.toLowerCase()}%`)];
  const [rows]: any[] = await pool.query(
    `SELECT DATE(mb.Date_Time) AS dt, mb.Mobile
     FROM master_buffer mb
     INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
     WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND sbn.Assign_To_MR_Main IS NOT NULL
       AND sbn.Assign_To_MR_Main != ''
       AND LOWER(sbn.Assign_To_MR_Main) NOT LIKE '%kserve%'
       AND (${likeClause})`,
    params
  );

  const byDate: Record<string, Set<string>> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.Mobile);
    if (m) byDate[dt].add(m);
  }
  return byDate;
}

function parseDateRobust(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  try {
    const str = String(val).trim();
    if (!str || str.startsWith("0000-00-00") || str.toLowerCase() === "null") return null;
    // YYYY-MM-DD with optional HH:mm:ss or HH:mm
    const mYMD = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (mYMD) {
      return new Date(
        Number(mYMD[1]),
        Number(mYMD[2]) - 1,
        Number(mYMD[3]),
        Number(mYMD[4] ?? 0),
        Number(mYMD[5] ?? 0),
        Number(mYMD[6] ?? 0)
      );
    }
    // DD-MM-YYYY with optional HH:mm:ss or HH:mm
    const mDMY = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (mDMY) {
      return new Date(
        Number(mDMY[3]),
        Number(mDMY[2]) - 1,
        Number(mDMY[1]),
        Number(mDMY[4] ?? 0),
        Number(mDMY[5] ?? 0),
        Number(mDMY[6] ?? 0)
      );
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

// ─── TAT (Turn-around time in seconds) by date ──────────────────────────────

async function queryTAT(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Record<string, { avgSec: number }>> {
  const likeClause = companyMatch
    .map(() => "LOWER(sbn.Lead_Relates_to_which_company) LIKE ?")
    .join(" OR ");
  const params: any[] = [days, ...companyMatch.map((c) => `%${c.toLowerCase()}%`)];
  try {
    const [rows]: any[] = await pool.query(
      `SELECT DATE(mb.Date_Time) AS dt,
              mb.Date_Time AS arrival_time,
              sbn.Timestamp_2,
              sbn.Sent_status
       FROM master_buffer mb
       INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
       WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND sbn.Timestamp_2 IS NOT NULL
         AND (${likeClause})`,
      params
    );

    const dateStats: Record<string, { totalSec: number; count: number }> = {};
    for (const r of rows as any[]) {
      const dt = rowDate(r.dt);
      const arrival = parseDateRobust(r.arrival_time);
      if (!arrival) continue;

      const reached = parseDateRobust(r.Timestamp_2) || parseDateRobust(r.Sent_status);
      if (!reached) continue;

      const diffSec = Math.floor((reached.getTime() - arrival.getTime()) / 1000);
      if (diffSec >= -300 && diffSec <= 172800) {
        const effectiveSec = Math.min(Math.max(0, diffSec), 86400);
        if (!dateStats[dt]) dateStats[dt] = { totalSec: 0, count: 0 };
        dateStats[dt].totalSec += effectiveSec;
        dateStats[dt].count += 1;
      }
    }

    const byDate: Record<string, { avgSec: number }> = {};
    for (const [dt, stat] of Object.entries(dateStats)) {
      if (stat.count > 0) {
        byDate[dt] = { avgSec: Math.round(stat.totalSec / stat.count) };
      }
    }
    return byDate;
  } catch (err) {
    console.warn('[lead-loss] queryTAT error:', err);
    return {};
  }
}

// ─── Build lost records for popup ────────────────────────────────────────────

function buildLostRecords(
  directMobiles: string[],
  directLeadIds: string[],
  directTimestamps: number[],
  bufSet: Set<string>,
  crmSet: Set<string>,
  globalBufferMap: Map<string, Array<{ leadId: string; time: number; dateStr: string }>>,
  source: string,
  date: string,
  company: string
): any[] {
  const records: any[] = [];
  const seen24h = new Map<string, string>();

  directMobiles.forEach((mobile, i) => {
    const leadId = directLeadIds[i] ?? `${source}_${i}`;
    const norm = normMobile(mobile);
    const t = directTimestamps?.[i] ?? new Date(date).getTime();

    const inBuf = norm ? bufSet.has(norm) : false;
    const isDirectDupe = Boolean(norm && seen24h.has(norm));
    if (norm && !seen24h.has(norm)) seen24h.set(norm, leadId);

    const bufs = norm ? (globalBufferMap.get(norm) || []) : [];
    const prior24Match = (!inBuf && norm) ? bufs.find(b => {
      const diffHours = (t - b.time) / (3600 * 1000);
      return (diffHours >= -6 && diffHours <= 48) || (b.dateStr && b.dateStr <= date);
    }) : null;

    if (inBuf) {
      if (isDirectDupe) {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Filtered (Same-day Duplicate)", transferStatus: "Filtered",
          bufferStatus: "Filtered", crmStatus: "Filtered",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: true, validDuplicate: true, expectedDuplicateGap: true,
          inMedium: true, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
          mediumBufferLost: true,
          stage: "direct", status: "Duplicate",
          reason: "Duplicate mobile in Direct API on same day",
        });
      } else {
        const inCrm = crmSet.has(norm);
        if (!inCrm) {
          records.push({
            id: leadId, name: "", phone: mobile, date, company, source,
            generatedAt: date, timestamp: date, transferTimestamp: date, bufferTimestamp: date,
            currentStatus: "Lost", transferStatus: "Transferred",
            bufferStatus: "In Buffer", crmStatus: "Not in CRM",
            assignee: "", tatMin: 0, tat: "—",
            isDuplicate: false, inMedium: true, toBuffer: true,
            inBuffer: true, inCrm: false, assigned: false,
            masterCrmLost: true,
            stage: "buffer", status: "Lost",
            reason: "Lead found in Buffer but missing from CRM (Gap 3: Buffer→CRM)",
          });
        }
      }
    } else if (prior24Match) {
      records.push({
        id: leadId, name: "", phone: mobile, date, company, source,
        generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
        currentStatus: "Filtered (24h Duplicate)", transferStatus: "Filtered",
        bufferStatus: "Filtered (24h Buffer)", crmStatus: "Filtered",
        assignee: "", tatMin: 0, tat: "—",
        isDuplicate: true, validDuplicate: true, expectedDuplicateGap: true,
        inMedium: true, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
        mediumBufferLost: true,
        stage: "direct", status: "Duplicate",
        reason: `Filtered intentionally: repeated mobile within 24 hours (already received in Buffer ${prior24Match.leadId} on ${prior24Match.dateStr})`,
      });
    } else if (isDirectDupe) {
      records.push({
        id: leadId, name: "", phone: mobile, date, company, source,
        generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
        currentStatus: "Filtered (Same-day Duplicate)", transferStatus: "Filtered",
        bufferStatus: "Filtered", crmStatus: "Filtered",
        assignee: "", tatMin: 0, tat: "—",
        isDuplicate: true, validDuplicate: true, expectedDuplicateGap: true,
        inMedium: true, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
        mediumBufferLost: true,
        stage: "direct", status: "Duplicate",
        reason: "Duplicate mobile in Direct API on same day",
      });
    } else {
      // Check if mobile arrived in buffer AFTER this lead (late transfer: next day or within 48h forward)
      const lateMatch = bufs.find(b => {
        const diffHours = (b.time - t) / (3600 * 1000); // positive = buffer came after lead
        return diffHours > 0 && diffHours <= 72;
      });
      if (lateMatch) {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Late Transfer (Next-day Buffer)", transferStatus: "Delayed",
          bufferStatus: `In Buffer (${lateMatch.dateStr})`, crmStatus: "Filtered",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, validDuplicate: false, expectedDuplicateGap: false,
          lateTransfer: true,
          inMedium: true, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
          mediumBufferLost: true,
          stage: "direct", status: "Delayed",
          reason: `Late Transfer: Lead received in Direct API on ${date} but buffer entry arrived on ${lateMatch.dateStr} (transferred next day)`,
        });
      } else {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Lost", transferStatus: "Not transferred",
          bufferStatus: "Not in buffer", crmStatus: "N/A",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: true, toBuffer: false,
          inBuffer: false, inCrm: false, assigned: false,
          mediumBufferLost: true,
          stage: "buffer", status: "Lost",
          reason: "Lead received in Direct API but not found in Buffer or previous 24h (Gap 2: Medium→Buffer)",
        });
      }
    }
  });
  return records;
}

// ─── Details GET handler ──────────────────────────────────────────────────────

async function handleDetailsRequest(pool: any, requestUrl: URL) {
  const idsParam = requestUrl.searchParams.get("ids") ?? "";
  const requestedIds = idsParam ? idsParam.split(",").map(s => s.trim()).filter(Boolean) : [];
  const dateParam = requestUrl.searchParams.get("date") ?? "";

  const bufferCache: Record<string, Promise<{ sameDayMap: Map<string, any>; sameDayGlobalMap: Map<string, any>; bufferList: any[] }>> = {};

  function getBufferMap(dtStr: string, companyMatch: string[] = []): Promise<{ sameDayMap: Map<string, any>; sameDayGlobalMap: Map<string, any>; bufferList: any[] }> {
    const cacheKey = `${dtStr}__${companyMatch.join(",")}`;
    if (bufferCache[cacheKey]) return bufferCache[cacheKey];
    bufferCache[cacheKey] = (async () => {
      let bufRows: any[] = [];
      try {
        const [r]: any[] = await pool.query(
          `SELECT mb.lead_id,
                  COALESCE(NULLIF(TRIM(mb.Mobile), ''), NULLIF(TRIM(sbn.Phone_Number_of_User), '')) AS Mobile,
                  COALESCE(mb.Date_Time, mb.actual_time, mb.Timestamp) AS Date_Time,
                  sbn.Assign_To_MR_Main,
                  sbn.Sent_status,
                  COALESCE(sbn.Lead_Relates_to_which_company, sbn.KAPPL_KTAHV, mb.WebSite_Name, '') AS Lead_Relates_to_which_company
           FROM master_buffer mb
           LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
           WHERE (mb.Date_Time >= DATE_SUB(?, INTERVAL 2 DAY) AND mb.Date_Time < DATE_ADD(?, INTERVAL 3 DAY))
              OR (mb.Timestamp >= DATE_SUB(?, INTERVAL 2 DAY) AND mb.Timestamp < DATE_ADD(?, INTERVAL 3 DAY))`,
          [dtStr, dtStr, dtStr, dtStr]
        );
        bufRows = r;
      } catch {
        try {
          const [r]: any[] = await pool.query(
            `SELECT mb.lead_id,
                    COALESCE(NULLIF(TRIM(mb.Mobile), ''), NULLIF(TRIM(sbn.Phone_Number_of_User), '')) AS Mobile,
                    COALESCE(mb.Date_Time, mb.actual_time, mb.Timestamp) AS Date_Time,
                    sbn.Assign_To_MR_Main,
                    sbn.Sent_status,
                    COALESCE(sbn.Lead_Relates_to_which_company, sbn.KAPPL_KTAHV, mb.WebSite_Name, '') AS Lead_Relates_to_which_company
             FROM master_buffer mb
             LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
             WHERE DATE(mb.Date_Time) >= DATE_SUB(?, INTERVAL 2 DAY) AND DATE(mb.Date_Time) <= DATE_ADD(?, INTERVAL 3 DAY)`,
            [dtStr, dtStr]
          );
          bufRows = r;
        } catch (err) {
          console.error(`[lead-loss-details] buffer query failed for ${dtStr}:`, err);
        }
      }
      const sameDayMap = new Map<string, any>();
      const sameDayGlobalMap = new Map<string, any>();
      for (const b of bufRows) {
        const bDate = rowDate(b.Date_Time);
        const m = normMobile(b.Mobile);
        if (bDate === dtStr) {
          if (m) sameDayGlobalMap.set(m, b);
          if (b.lead_id) sameDayGlobalMap.set(String(b.lead_id), b);
          const coName = String(b.Lead_Relates_to_which_company || "").toLowerCase();
          const matchesCo = companyMatch.length === 0 || !coName || companyMatch.some(c => coName.includes(c.toLowerCase()));
          if (matchesCo) {
            if (m) sameDayMap.set(m, b);
            if (b.lead_id) sameDayMap.set(String(b.lead_id), b);
          }
        }
      }
      return { sameDayMap, sameDayGlobalMap, bufferList: bufRows };
    })();
    return bufferCache[cacheKey];
  }

  const targets: Array<{ rowId: string; company: string; source: string; date: string; co: CompanyConfig; srcCfg: SourceConfig }> = [];

  if (requestedIds.length > 0) {
    for (const rid of requestedIds) {
      const parts = rid.split("__");
      if (parts.length < 3) continue;
      const compName = parts[0];
      const srcName = parts[1];
      let dtStr = parts.slice(2).join("__");
      if (/^\d{2}-\d{2}-\d{4}$/.test(dtStr)) {
        const [d, m, y] = dtStr.split("-");
        dtStr = `${y}-${m}-${d}`;
      }
      const co = COMPANY_CONFIG.find(c => c.company.toLowerCase() === compName.toLowerCase());
      if (!co) continue;
      const srcCfg = co.sources.find(s => s.source.toLowerCase() === srcName.toLowerCase());
      if (!srcCfg) continue;
      targets.push({ rowId: rid, company: co.company, source: srcCfg.source, date: dtStr, co, srcCfg });
    }
  } else if (dateParam) {
    let normDate = dateParam;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateParam)) {
      const [d, m, y] = dateParam.split("-");
      normDate = `${y}-${m}-${d}`;
    }
    for (const co of COMPANY_CONFIG) {
      for (const srcCfg of co.sources) {
        targets.push({ rowId: `${co.company}__${srcCfg.source}__${normDate}`, company: co.company, source: srcCfg.source, date: normDate, co, srcCfg });
      }
    }
  }

  const rows = (await Promise.all(targets.map(async t => {
    const { rowId, company, source, date, co, srcCfg } = t;
    const { sameDayMap, sameDayGlobalMap, bufferList } = await getBufferMap(date, co.bufferMatch);

    const nameCol = srcCfg.nameCol ? `\`${srcCfg.nameCol}\`` : "NULL";
    const emailCol = srcCfg.emailCol ? `\`${srcCfg.emailCol}\`` : "NULL";
    const where = srcCfg.sourceFilter ? `AND (${srcCfg.sourceFilter})` : "";

    let directRows: any[] = [];
    try {
      const sqlFast = `
        SELECT \`${srcCfg.leadIdCol}\` AS lead_id,
               \`${srcCfg.mobileCol}\` AS mobile,
               ${nameCol} AS client_name,
               ${emailCol} AS email,
               \`${srcCfg.dateCol}\` AS date_time
        FROM \`${srcCfg.table}\`
        WHERE \`${srcCfg.dateCol}\` >= ? AND \`${srcCfg.dateCol}\` < DATE_ADD(?, INTERVAL 1 DAY)
        ${where}
        ORDER BY \`${srcCfg.dateCol}\` ASC
      `;
      const [r]: any[] = await pool.query(sqlFast, [date, date]);
      directRows = r;
    } catch {
      try {
        const sqlFallback = `
          SELECT \`${srcCfg.leadIdCol}\` AS lead_id,
                 \`${srcCfg.mobileCol}\` AS mobile,
                 ${nameCol} AS client_name,
                 ${emailCol} AS email,
                 \`${srcCfg.dateCol}\` AS date_time
          FROM \`${srcCfg.table}\`
          WHERE DATE(\`${srcCfg.dateCol}\`) = ?
          ${where}
          ORDER BY \`${srcCfg.dateCol}\` ASC
        `;
        const [r]: any[] = await pool.query(sqlFallback, [date]);
        directRows = r;
      } catch (err) {
        console.error(`[lead-loss-details] failed for ${srcCfg.table}:`, err);
        return null;
      }
    }

    const directMobileCounts = new Map<string, number>();
    for (const r of directRows) {
      const nm = normMobile(r.mobile);
      if (nm) directMobileCounts.set(nm, (directMobileCounts.get(nm) ?? 0) + 1);
    }

    const seenMobiles = new Set<string>();
    const records: any[] = [];

    for (const r of directRows) {
      const leadId = String(r.lead_id ?? "");
      const rawMobile = String(r.mobile ?? "");
      const norm = normMobile(rawMobile);
      const isDup = Boolean(norm && seenMobiles.has(norm));
      if (norm) seenMobiles.add(norm);

      const bufMatch = norm ? sameDayMap.get(norm) : sameDayMap.get(leadId);
      const sameDayGlobalMatch = (!bufMatch && norm) ? sameDayGlobalMap.get(norm) : null;
      const rawTime = parseDateRobust(r.date_time) || (r.date_time ? new Date(r.date_time) : null);
      const formattedTime = rawTime ? rawTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
      const generatedAt = rawTime ? rawTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : date;
      const leadTime = rawTime && !isNaN(rawTime.getTime()) ? rawTime.getTime() : new Date(`${date}T23:59:59`).getTime();

      // 24-hour lookback in master_buffer (across all buffer entries in 48-hour window)
      const prior24Match = (!bufMatch && !sameDayGlobalMatch && norm) ? bufferList.find((b: any) => {
        const bnm = normMobile(b.Mobile);
        if (bnm !== norm) return false;
        const bObj = parseDateRobust(b.Date_Time) || (b.Date_Time ? new Date(b.Date_Time) : null);
        const bTime = bObj ? bObj.getTime() : 0;
        if (!bTime) {
          const bDate = rowDate(b.Date_Time);
          return bDate && bDate <= date;
        }
        const diffHours = (leadTime - bTime) / (3600 * 1000);
        return diffHours >= -6 && diffHours <= 48;
      }) : null;

      // Late-transfer check: buffer entry arrived AFTER this Direct API lead (next-day or within 72h forward)
      const lateTransferMatch = (!bufMatch && !sameDayGlobalMatch && !prior24Match && norm) ? bufferList.find((b: any) => {
        const bnm = normMobile(b.Mobile);
        if (bnm !== norm) return false;
        const bObj = parseDateRobust(b.Date_Time) || (b.Date_Time ? new Date(b.Date_Time) : null);
        const bTime = bObj ? bObj.getTime() : 0;
        if (!bTime) return false;
        const diffHours = (bTime - leadTime) / (3600 * 1000); // positive = buffer came AFTER lead
        return diffHours > 0 && diffHours <= 72;
      }) : null;

      let status: "Resolved" | "Duplicate" | "Lost" | "Delayed" = "Lost";
      let currentStatus = "Actual Lost (Technical Issue)";
      let bufferStatus = "Not in buffer";
      let crmStatus = "Not in CRM";
      let transferStatus = "Failed Transfer";
      let assignee = "Unassigned";
      let reason = "Direct API received but not found in Buffer or previous 24h";
      let inBuffer = false;
      let inCrm = false;
      let assigned = false;

      if (bufMatch) {
        if (isDup) {
          status = "Duplicate";
          currentStatus = "Filtered (Same-day Duplicate)";
          bufferStatus = "Filtered";
          crmStatus = "Filtered";
          transferStatus = "Filtered";
          reason = "Filtered intentionally: repeated mobile number in Direct API on same day";
        } else {
          inBuffer = true;
          inCrm = true;
          bufferStatus = "In Buffer";
          crmStatus = "In CRM";
          transferStatus = "Transferred";
          const ass = (bufMatch.Assign_To_MR_Main || "").trim();

          if (ass.toLowerCase().includes("kserve")) {
            assigned = true;
            assignee = "KServe";
            currentStatus = "Assigned: KServe";
            status = "Resolved";
            reason = "Verified: Lead arrived in buffer & successfully assigned to KServe";
          } else if (ass) {
            assigned = true;
            assignee = ass;
            currentStatus = `Assigned: Sales (${ass})`;
            status = "Resolved";
            reason = `Verified: Lead arrived in buffer & transferred to Sales Team (${ass})`;
          } else {
            currentStatus = "In CRM (Unassigned)";
            status = "Delayed";
            reason = "Lead arrived in Buffer/CRM, awaiting salesperson or dialer allocation";
          }
        }
      } else if (sameDayGlobalMatch) {
        status = "Duplicate";
        currentStatus = "Filtered (Same-day Duplicate)";
        bufferStatus = "Filtered (Buffer Match)";
        crmStatus = "Filtered";
        transferStatus = "Filtered";
        reason = `Filtered intentionally: repeated mobile already received in Buffer on same day (${sameDayGlobalMatch.lead_id || "Buffer"})`;
      } else if (prior24Match) {
        status = "Duplicate";
        currentStatus = "Filtered (24h Duplicate)";
        bufferStatus = "Filtered (24h Buffer)";
        crmStatus = "Filtered";
        transferStatus = "Filtered";
        const priorFormatted = prior24Match.Date_Time ? new Date(new Date(prior24Match.Date_Time).getTime() + 5.5 * 3600 * 1000).toLocaleString("en-IN") : "";
        reason = `Filtered intentionally: repeated mobile within 24 hours (already received in Buffer ${prior24Match.lead_id} on ${priorFormatted})`;
      } else if (lateTransferMatch) {
        status = "Delayed";
        currentStatus = "Late Transfer (Next-day Buffer)";
        bufferStatus = `In Buffer (${rowDate(lateTransferMatch.Date_Time)})`;
        crmStatus = "Filtered";
        transferStatus = "Delayed";
        const lateFormatted = lateTransferMatch.Date_Time ? new Date(new Date(lateTransferMatch.Date_Time).getTime() + 5.5 * 3600 * 1000).toLocaleString("en-IN") : "";
        reason = `Late Transfer: Lead received in Direct API on ${date} but buffer entry arrived on ${lateFormatted} (transferred next day — not lost)`;
      } else if (isDup || (norm && (directMobileCounts.get(norm) ?? 0) > 1 && !bufMatch)) {
        status = "Duplicate";
        currentStatus = "Filtered (Same-day Duplicate)";
        bufferStatus = "Filtered";
        crmStatus = "Filtered";
        transferStatus = "Filtered";
        reason = "Filtered intentionally: repeated mobile number in Direct API on same day";
      }

      records.push({
        id: leadId,
        name: r.client_name ? String(r.client_name).trim() : "",
        phone: rawMobile,
        email: r.email ? String(r.email).trim() : "",
        date,
        company,
        source,
        generatedAt,
        timestamp: formattedTime || date,
        transferTimestamp: inBuffer ? date : "",
        bufferTimestamp: inBuffer ? date : "",
        currentStatus,
        transferStatus,
        bufferStatus,
        crmStatus,
        assignee,
        tatMin: 0,
        tat: "—",
        isDuplicate: status === "Duplicate",
        validDuplicate: status === "Duplicate",
        expectedDuplicateGap: status === "Duplicate",
        lateTransfer: currentStatus === "Late Transfer (Next-day Buffer)",
        inMedium: true,
        toBuffer: inBuffer,
        inBuffer,
        inCrm,
        assigned,
        mediumBufferLost: !inBuffer,
        masterCrmLost: inBuffer && !inCrm,
        stage: inCrm ? "crm" : inBuffer ? "buffer" : status === "Duplicate" ? "direct" : status === "Delayed" ? "direct" : "buffer",
        status,
        reason,
      });
    }

    return {
      id: rowId,
      date,
      company,
      source,
      direct: directRows.length,
      records,
      issues: records.filter(rec => rec.status === "Lost"),
    };
  }))).filter(Boolean);

  return Response.json({
    live: true,
    mode: "Live SQL Direct Details",
    rows,
  });
}

// ─── Main GET handler ─────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    const pool = await getPool();

    if (requestUrl.searchParams.get("details") === "1") {
      return handleDetailsRequest(pool, requestUrl);
    }

    const days = Math.min(parseInt(requestUrl.searchParams.get("days") ?? "90", 10), 180);
    const companyFilter = (requestUrl.searchParams.get("company") ?? "").toLowerCase();
    const scannedAt = new Date().toISOString();
    const allDates = new Set<string>();
    const rowMap: Record<string, any> = {};

    const companyData = await Promise.all(
      COMPANY_CONFIG.map(async (co) => {
        if (companyFilter && !co.company.toLowerCase().includes(companyFilter)) return null;
        const [bufferRes, crmData, kserveData, salesData, tatData] = await Promise.all([
          queryBuffer(pool, co.bufferMatch, days),
          queryCRM(pool, co.bufferMatch, days),
          queryKServe(pool, co.bufferMatch, days),
          querySales(pool, co.bufferMatch, days),
          queryTAT(pool, co.bufferMatch, days),
        ]);
        return { co, bufferRes, crmData, kserveData, salesData, tatData };
      })
    );

    // Build per-company and global buffer maps for 24h prior buffer matching
    const companyBufferMaps = new Map<string, Map<string, Array<{ leadId: string; time: number; dateStr: string }>>>();
    const globalBufferMap = new Map<string, Array<{ leadId: string; time: number; dateStr: string }>>();

    for (const cd of companyData) {
      if (!cd) continue;
      const coMap = new Map<string, Array<{ leadId: string; time: number; dateStr: string }>>();
      for (const b of cd.bufferRes.allBufferList) {
        if (!coMap.has(b.mobile)) coMap.set(b.mobile, []);
        coMap.get(b.mobile)!.push({ leadId: b.leadId, time: b.time, dateStr: b.dateStr });

        if (!globalBufferMap.has(b.mobile)) globalBufferMap.set(b.mobile, []);
        globalBufferMap.get(b.mobile)!.push({ leadId: b.leadId, time: b.time, dateStr: b.dateStr });
      }
      companyBufferMaps.set(cd.co.companyKey, coMap);
    }

    for (const cd of companyData) {
      if (!cd) continue;
      const { co, bufferRes, crmData, kserveData, salesData, tatData } = cd;

      // Use company-scoped buffer map for 24h prior duplicate detection, with fallback to global buffer map
      const companyBufMap = companyBufferMaps.get(co.companyKey) ?? new Map<string, Array<{ leadId: string; time: number; dateStr: string }>>();

      for (const srcCfg of co.sources) {
        let directByDate: DirectEntry[];
        try {
          directByDate = await queryDirectTable(pool, srcCfg, days);
        } catch (err) {
          console.error(`[lead-loss] queryDirectTable failed for ${srcCfg.table}:`, err);
          continue;
        }

        for (const { date, leadIds, mobiles, timestamps } of directByDate) {
          allDates.add(date);
          const key = `${co.company}__${srcCfg.source}__${date}`;

          const bufSet: Set<string> = bufferRes.byDate[date] ?? new Set<string>();
          const crmSet: Set<string> = crmData[date] ?? new Set<string>();
          const kvSet: Set<string> = kserveData[date] ?? new Set<string>();
          const sSet: Set<string> = salesData[date] ?? new Set<string>();
          const avgTatSec = tatData[date]?.avgSec || 0;
          const avgTatMin = Math.round(avgTatSec / 60);

          const direct = leadIds.length;
          let buffer = 0, crm = 0, kserve = 0, sales = 0;
          let sameDayDuplicates = 0;
          let prior24hDuplicates = 0;
          let lateTransfers = 0;
          const seenDirectMobiles = new Set<string>();

          for (let i = 0; i < mobiles.length; i++) {
            const raw = mobiles[i];
            const m = normMobile(raw);
            const t = timestamps?.[i] ?? new Date(date).getTime();
            if (!m) continue;

            const inBuf = bufSet.has(m);
            const isDirectDupe = seenDirectMobiles.has(m);
            seenDirectMobiles.add(m);

            // Check company-scoped buffer first, then fall back to global buffer across all companies
            const bufs = companyBufMap.get(m) || globalBufferMap.get(m) || [];
            const priorMatch = !inBuf ? bufs.find(b => {
              const diffHours = (t - b.time) / (3600 * 1000);
              return (diffHours >= -6 && diffHours <= 48) || (b.dateStr && b.dateStr <= date);
            }) : null;

            // Late transfer: buffer arrived AFTER direct API lead (next-day or within 72h forward)
            const lateMatch = (!inBuf && !priorMatch && !isDirectDupe) ? bufs.find(b => {
              const diffHours = (b.time - t) / (3600 * 1000); // positive = buffer came after lead
              return diffHours > 0 && diffHours <= 72;
            }) : null;

            if (inBuf) {
              if (isDirectDupe) {
                sameDayDuplicates++;
              } else {
                buffer++;
                if (crmSet.has(m)) crm++;
                if (kvSet.has(m)) kserve++;
                if (sSet.has(m)) sales++;
              }
            } else if (priorMatch) {
              prior24hDuplicates++;
            } else if (lateMatch) {
              lateTransfers++;
            } else if (isDirectDupe) {
              sameDayDuplicates++;
            }
          }

          const duplicate = sameDayDuplicates + prior24hDuplicates + lateTransfers;
          const medium = direct;
          const expectedDuplicateGap = duplicate;
          const directMediumGap = 0;
          const bufferTransfer = buffer;
          const mediumBufferLost = Math.max(0, direct - buffer);
          const unexplainedMediumGap = Math.max(0, direct - duplicate - buffer);
          const mediumBufferGap = mediumBufferLost;
          const sameDayCrm = crm;
          const lateTransfer = lateTransfers;
          const masterCrmLost = Math.max(0, buffer - crm);
          const bufferCrmGap = masterCrmLost;
          const bufferToCrmGap = masterCrmLost;
          const assigned = kserve + sales;

          const lostRecords = buildLostRecords(
            mobiles, leadIds, timestamps, bufSet, crmSet, globalBufferMap, srcCfg.source, date, co.company
          );

          const existing = rowMap[key];
          if (existing) {
            existing.direct += direct;
            existing.medium += medium;
            existing.duplicate += duplicate;
            existing.expectedDuplicateGap += expectedDuplicateGap;
            existing.buffer += buffer;
            existing.bufferTransfer += bufferTransfer;
            existing.mediumBufferLost += mediumBufferLost;
            existing.mediumBufferGap += mediumBufferGap;
            existing.unexplainedMediumGap = (existing.unexplainedMediumGap || 0) + unexplainedMediumGap;
            existing.gap += mediumBufferLost;
            existing.crm += crm;
            existing.kserve += kserve;
            existing.sales += sales;
            existing.assigned += assigned;
            if (avgTatSec > 0) {
              existing.avgTatSec = existing.avgTatSec > 0 ? Math.round((existing.avgTatSec + avgTatSec) / 2) : avgTatSec;
              existing.avgTatMin = Math.round(existing.avgTatSec / 60);
            }
            existing.records.push(...lostRecords);
            existing.issues.push(...lostRecords.filter((r: any) => r.status === "Lost"));
          } else {
            rowMap[key] = {
              id: key, date, company: co.company, source: srcCfg.source,
              direct, medium, directMediumGap, duplicate, expectedDuplicateGap,
              bufferTransfer, mediumBufferGap, mediumBufferLost,
              unexplainedMediumGap, gap: mediumBufferLost,
              buffer, crm, sameDayCrm, lateTransfer, masterCrmLost,
              bufferCrmGap, bufferToCrmGap, assigned, sales, kserve,
              avgTatSec, avgTatMin, slaBreaches: 0, mismatch: false, validationErrors: [],
              records: lostRecords,
              issues: lostRecords.filter((r: any) => r.status === "Lost"),
            };
          }
        }
      }
    }

    const rows: any[] = Object.values(rowMap).sort(
      (a: any, b: any) =>
        b.date.localeCompare(a.date) ||
        a.company.localeCompare(b.company) ||
        a.source.localeCompare(b.source)
    );

    const dateArr = Array.from(allDates).sort();
    const latestDate = dateArr[dateArr.length - 1] ?? "";
    const trackingLagDays = latestDate
      ? Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000)
      : 999;

    const pipelineHealth = {
      checklistLastDate: latestDate,
      masterLatestDate: latestDate,
      trackingLagDays,
      stageTrackingCurrent: trackingLagDays <= 2,
      message:
        trackingLagDays <= 2
          ? "Pipeline tracking is current — all stages covered."
          : `Data lag of ${trackingLagDays} days detected.`,
    };

    const todayIST = toIST(new Date());
    const todayRows = rows.filter((r: any) => r.date === todayIST || r.date === latestDate);
    const currentSummary = {
      date: todayIST,
      crm: todayRows.reduce((s: number, r: any) => s + r.crm, 0),
      assigned: todayRows.reduce((s: number, r: any) => s + r.assigned, 0),
      kserve: todayRows.reduce((s: number, r: any) => s + r.kserve, 0),
      sales: todayRows.reduce((s: number, r: any) => s + r.sales, 0),
      unassigned: todayRows.reduce((s: number, r: any) => s + Math.max(0, r.crm - r.assigned), 0),
      slaBreaches: 0,
    };

    const currentIssues = rows
      .flatMap((r: any) => (r.issues ?? []) as any[])
      .filter((i: any) => i.date === todayIST || i.date === latestDate)
      .slice(0, 100);

    const totalLeadIds = new Set(
      rows.flatMap((r: any) => (r.records ?? []).map((rec: any) => rec.id))
    ).size;

    return Response.json({
      live: true,
      schemaVersion: 3,
      logicVersion: "sql-vlookup-v3",
      mode: "Live SQL reconciliation",
      crmMode: "SQL",
      scannedAt,
      rows,
      pipelineHealth,
      currentSummary,
      currentIssues,
      validation: {
        rows: rows.length,
        mismatches: rows.filter((r: any) => r.mismatch).length,
        leadIds: totalLeadIds,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[lead-loss-sql]", msg);
    return Response.json(
      { live: false, mode: "SQL query failed", diagnostic: msg, scannedAt: new Date().toISOString(), rows: [] },
      { status: 503 }
    );
  }
}
