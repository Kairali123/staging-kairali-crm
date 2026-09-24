export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { getPool } from "@/lib/db";

// ─── Company / Source → SQL table mapping ────────────────────────────────────
const COMPANY_CONFIG = [
  {
    company: "Villaraag",
    companyKey: "VILLARAAG",
    bufferMatch: ["villaraag", "villa raag"],
    sources: [
      {
        source: "Facebook",
        table: "villa_raag_facebook_ppc_api",
        dateCol: "date_time",
        mobileCol: "mobile",
        leadIdCol: "lead_id",
      },
      {
        source: "Google",
        table: "api_villaraag_new_website_online_enquiry",
        dateCol: "create_date_time",
        mobileCol: "phone_number",
        leadIdCol: "enq_id",
        sourceFilter: "utm_medium != 'organic' OR utm_medium IS NULL",
      },
      {
        source: "Website",
        table: "api_villaraag_new_website_online_enquiry",
        dateCol: "create_date_time",
        mobileCol: "phone_number",
        leadIdCol: "enq_id",
        sourceFilter: "utm_medium = 'organic'",
      },
      {
        source: "Anjali AI Web",
        table: "villaraag_chatbase_leads_api_anjali_menon",
        dateCol: "chat_created_date_time",
        mobileCol: "phone",
        leadIdCol: "lead_id",
      },
      {
        source: "IVR",
        table: "ivr_lead_api_knowrality",
        dateCol: "date_time",
        mobileCol: "mobile",
        leadIdCol: "lead_id",
        sourceFilter: "lead_relates_to_which_company LIKE '%villa%' OR lead_relates_to_which_company LIKE '%raag%'",
      },
      {
        source: "Others",
        table: "bulk_whatsapp_reply_enquiry_generation",
        dateCol: "date_time",
        mobileCol: "mobile",
        leadIdCol: "id",
      },
    ],
  },
  {
    company: "KTAHV",
    companyKey: "KTAHV",
    bufferMatch: ["kairali the ayurvedic healing village", "ktahv"],
    sources: [
      {
        source: "Facebook",
        table: "ktahv_facebook_lead_api",
        dateCol: "date_time",
        mobileCol: "mobile",
        leadIdCol: "lead_id",
      },
      {
        source: "Google",
        table: "ktahv_new_website_online_enquiry_api",
        dateCol: "create_date_time",
        mobileCol: "phone_number",
        leadIdCol: "enq_id",
      },
      {
        source: "IVR",
        table: "ivr_lead_api_knowrality",
        dateCol: "date_time",
        mobileCol: "mobile",
        leadIdCol: "lead_id",
        sourceFilter: "lead_relates_to_which_company LIKE '%KTAHV%' OR lead_relates_to_which_company LIKE '%healing village%'",
      },
    ],
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function normMobile(m: string | null | undefined): string {
  if (!m) return "";
  const digits = String(m).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function toIST(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function queryDirectTable(
  pool: any,
  cfg: (typeof COMPANY_CONFIG)[0]["sources"][0],
  days: number
): Promise<Array<{ date: string; leadIds: string[]; mobiles: string[]; rows: any[] }>> {
  const where = cfg.sourceFilter ? `AND (${cfg.sourceFilter})` : "";
  const sql = `
    SELECT DATE(\`${cfg.dateCol}\`) AS dt, \`${cfg.leadIdCol}\` AS lead_id, \`${cfg.mobileCol}\` AS mobile, \`${cfg.dateCol}\` AS created_at
    FROM \`${cfg.table}\`
    WHERE \`${cfg.dateCol}\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ${where}
    ORDER BY \`${cfg.dateCol}\` ASC
  `;
  const [rows]: any = await pool.query(sql, [days]);
  const byDate = new Map<string, { leadIds: string[]; mobiles: string[]; rows: any[] }>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, { leadIds: [], mobiles: [], rows: [] });
    const entry = byDate.get(dt)!;
    entry.leadIds.push(String(r.lead_id || ""));
    entry.mobiles.push(normMobile(r.mobile));
    entry.rows.push(r);
  }
  return [...byDate.entries()].map(([date, v]) => ({ date, ...v }));
}

async function queryBuffer(pool: any, companyMatch: string[], days: number) {
  const likeClause = companyMatch.map(() => `LOWER(sbn.Lead_Relates_to_which_company) LIKE ?`).join(" OR ");
  const likeVals = companyMatch.map((c) => `%${c}%`);
  const [rows]: any = await pool.query(
    `SELECT DATE(mb.Date_Time) AS dt, mb.Mobile FROM master_buffer mb
     INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
     WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND (${likeClause})`,
    [days, ...likeVals]
  );
  const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.Mobile));
  }
  return byDate;
}

async function queryCRM(pool: any, companyMatch: string[], days: number) {
  const likeClause = companyMatch.map(() => `LOWER(Lead_Relates_to_which_company) LIKE ?`).join(" OR ");
  const likeVals = companyMatch.map((c) => `%${c}%`);
  const [rows]: any = await pool.query(
    `SELECT DATE(Timestamp_2) AS dt, Phone_Number_of_User FROM staging_buffer_new
     WHERE Timestamp_2 >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND (${likeClause})`,
    [days, ...likeVals]
  );
  const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.Phone_Number_of_User));
  }
  return byDate;
}

async function queryKServe(pool: any, companyKey: string, days: number) {
  const [rows]: any = await pool.query(
    `SELECT DATE(date_time) AS dt, mobile FROM ai_voice_leads_received
     WHERE date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND UPPER(company) = ? AND (sent_status = 'Sent' OR assign_to_app_sheet_or_dialer IS NOT NULL)`,
    [days, companyKey.toUpperCase()]
  );
  const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.mobile));
  }
  return byDate;
}

async function querySales(pool: any, companyKey: string, days: number) {
  const [rows]: any = await pool.query(
    `SELECT DATE(enquiry_date_time) AS dt, mobile FROM dialshree_kairali_sent
     WHERE enquiry_date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND (data_source LIKE ? OR data_source LIKE ?)`,
    [days, `%${companyKey}%`, `%${companyKey.toLowerCase()}%`]
  );
  const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, new Set());
    byDate.get(dt)!.add(normMobile(r.mobile));
  }
  return byDate;
}

// ─── Detect duplicates in a set of mobiles ───────────────────────────────────
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

// ─── Build lost lead records for popup ────────────────────────────────────────
function buildLostRecords(
  directMobiles: string[],
  directLeadIds: string[],
  bufferMobileSet: Set<string>,
  crmMobileSet: Set<string>,
  source: string,
  date: string,
  company: string
) {
  const records: any[] = [];
  const seen24h = new Map<string, string>(); // mobile → leadId

  directMobiles.forEach((mobile, i) => {
    const leadId = directLeadIds[i] || `${source}_${i}`;
    const norm = normMobile(mobile);

    // Check duplicate in same source within 24hrs
    if (norm && seen24h.has(norm)) {
      records.push({
        id: leadId, name: "", phone: mobile, date, company, source,
        generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
        currentStatus: "Lost", transferStatus: "Not transferred", bufferStatus: "Not in buffer", crmStatus: "N/A",
        assignee: "", tatMin: 0, tat: "—",
        isDuplicate: true, validDuplicate: true, expectedDuplicateGap: true,
        inMedium: false, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
        stage: "direct", status: "Duplicate", reason: `Duplicate mobile in same source within 24hrs`,
      });
    } else {
      if (norm) seen24h.set(norm, leadId);
      
      const inBuf = norm ? bufferMobileSet.has(norm) : false;
      const inCrm = norm ? crmMobileSet.has(norm) : false;

      if (!inBuf) {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Lost", transferStatus: "Not transferred", bufferStatus: "Not in buffer", crmStatus: "N/A",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: false, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
          stage: "direct", status: "Lost", reason: "Lead received in Direct API but not found in Buffer (Gap 1)",
        });
      } else if (!inCrm) {
         records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: date, bufferTimestamp: date,
          currentStatus: "Lost", transferStatus: "Transferred", bufferStatus: "In Buffer", crmStatus: "Not in CRM",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: true, toBuffer: true, inBuffer: true, inCrm: false, assigned: false,
          stage: "buffer", status: "Lost", reason: "Lead found in Buffer but missing from CRM (Gap 2)",
        });
      }
    }
  });
  return records;
}

// ─── Main GET handler ─────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const days = Math.min(parseInt(requestUrl.searchParams.get("days") || "31"), 90);
  const companyFilter = requestUrl.searchParams.get("company")?.toLowerCase() || "";

  try {
    const pool = await getPool();
    const scannedAt = new Date().toISOString();
    const allDates = new Set<string>();
    const rowMap = new Map<string, any>();

    for (const co of COMPANY_CONFIG) {
      if (companyFilter && !co.company.toLowerCase().includes(companyFilter)) continue;

      const [bufferData, crmData, kserveData, salesData] = await Promise.all([
        queryBuffer(pool, co.bufferMatch, days),
        queryCRM(pool, co.bufferMatch, days),
        queryKServe(pool, co.companyKey, days),
        querySales(pool, co.companyKey, days),
      ]);

      for (const srcCfg of co.sources) {
        let directByDate;
        try { directByDate = await queryDirectTable(pool, srcCfg, days); } catch (err) { continue; }

        for (const { date, leadIds, mobiles } of directByDate) {
          allDates.add(date);
          const key = `${co.company}__${srcCfg.source}__${date}`;

          const bufSet = bufferData.get(date) || new Set();
          const crmSet = crmData.get(date) || new Set();
          const kvSet = kserveData.get(date) || new Set();
          const sSet = salesData.get(date) || new Set();

          const direct = leadIds.length;
          const duplicate = detectDuplicates(mobiles);
          
          let buffer = 0, crm = 0, kserve = 0, sales = 0;
          const directUnique = new Set(mobiles.map(normMobile).filter(Boolean));
          
          for (const m of Array.from(directUnique)) {
             if (bufSet.has(m)) buffer++;
             if (crmSet.has(m)) crm++;
             if (kvSet.has(m)) kserve++;
             if (sSet.has(m)) sales++;
          }

          const medium = direct; 
          const expectedDuplicateGap = duplicate;
          const directMediumGap = 0; 
          const bufferTransfer = buffer;
          const mediumBufferLost = Math.max(0, direct - duplicate - buffer);
          const mediumBufferGap = mediumBufferLost;
          const sameDayCrm = crm;
          const lateTransfer = 0;
          const masterCrmLost = Math.max(0, buffer - crm);
          const bufferCrmGap = masterCrmLost;
          const bufferToCrmGap = masterCrmLost;
          const assigned = kserve + sales;

          const lostRecords = buildLostRecords(mobiles, leadIds, bufSet, crmSet, srcCfg.source, date, co.company);

          const existing = rowMap.get(key);
          if (existing) {
            existing.direct += direct; existing.medium += medium; existing.duplicate += duplicate;
            existing.expectedDuplicateGap += expectedDuplicateGap; existing.buffer += buffer;
            existing.bufferTransfer += bufferTransfer; existing.mediumBufferLost += mediumBufferLost;
            existing.crm += crm; existing.kserve += kserve; existing.sales += sales;
            existing.assigned += assigned; existing.records.push(...lostRecords);
            existing.issues.push(...lostRecords.filter((r: any) => r.status === "Lost"));
          } else {
            rowMap.set(key, {
              id: key, date, company: co.company, source: srcCfg.source, direct, medium, directMediumGap,
              duplicate, expectedDuplicateGap, bufferTransfer, mediumBufferGap, mediumBufferLost,
              unexplainedMediumGap: mediumBufferLost, gap: mediumBufferLost, buffer, crm, sameDayCrm,
              lateTransfer, masterCrmLost, bufferCrmGap, bufferToCrmGap, assigned, sales, kserve,
              avgTatMin: 0, slaBreaches: 0, mismatch: false, validationErrors: [],
              records: lostRecords, issues: lostRecords.filter((r: any) => r.status === "Lost"),
            });
          }
        }
      }
    }

    const rows = [...rowMap.values()].sort((a, b) => b.date.localeCompare(a.date) || a.company.localeCompare(b.company) || a.source.localeCompare(b.source));
    const dates = [...allDates].sort();
    const latestDate = dates[dates.length - 1] || "";
    const trackingLagDays = latestDate ? Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000) : 999;

    const pipelineHealth = { checklistLastDate: latestDate, masterLatestDate: latestDate, trackingLagDays, stageTrackingCurrent: trackingLagDays <= 2, message: trackingLagDays <= 2 ? "Current" : "Lag" };
    
    return Response.json({
      live: true, schemaVersion: 3, logicVersion: "sql-vlookup-v2", mode: "SQL Mobile VLookup",
      crmMode: "SQL", scannedAt, rows, pipelineHealth,
      currentSummary: { date: latestDate, crm: 0, assigned: 0, kserve: 0, sales: 0, unassigned: 0, slaBreaches: 0 },
      currentIssues: [], validation: { rows: rows.length, mismatches: 0, leadIds: 0 }
    });
  } catch (error) {
    return Response.json({ live: false, mode: "SQL Failed", rows: [] }, { status: 503 });
  }
}
