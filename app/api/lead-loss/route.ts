export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { getPool } from "@/lib/db";

// ─── Company / Source → SQL table mapping ────────────────────────────────────
// Format: { company, companyKey, sources: [ { source, table, dateCol, mobileCol, leadIdCol } ] }
const COMPANY_CONFIG = [
  {
    company: "Villaraag",
    companyKey: "VILLARAAG",
    bufferMatch: ["villaraag", "villa raag"],   // match against Lead_Relates_to_which_company (lowercase)
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
  // returns YYYY-MM-DD in IST (+05:30)
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function minutesBetween(a: Date | string, b: Date | string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

// ─── Query: daily counts from a direct source table ──────────────────────────
async function queryDirectTable(
  pool: any,
  cfg: (typeof COMPANY_CONFIG)[0]["sources"][0],
  days: number
): Promise<Array<{ date: string; leadIds: string[]; mobiles: string[]; rows: any[] }>> {
  const where = cfg.sourceFilter ? `AND (${cfg.sourceFilter})` : "";
  const sql = `
    SELECT 
      DATE(\`${cfg.dateCol}\`) AS dt,
      \`${cfg.leadIdCol}\`     AS lead_id,
      \`${cfg.mobileCol}\`     AS mobile,
      \`${cfg.dateCol}\`       AS created_at
    FROM \`${cfg.table}\`
    WHERE \`${cfg.dateCol}\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ${where}
    ORDER BY \`${cfg.dateCol}\` ASC
  `;
  const [rows]: any = await pool.query(sql, [days]);

  // group by date
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

// ─── Query: master_buffer counts by date + company ───────────────────────────
async function queryBuffer(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Map<string, { leadIds: string[]; mobiles: string[]; sources: string[] }>> {
  const likeClause = companyMatch
    .map(() => `LOWER(sbn.Lead_Relates_to_which_company) LIKE ?`)
    .join(" OR ");
  const likeVals = companyMatch.map((c) => `%${c}%`);

  const [rows]: any = await pool.query(
    `SELECT 
        DATE(mb.Date_Time) AS dt,
        mb.lead_id,
        mb.Mobile,
        mb.Verified_Source
       FROM master_buffer mb
       INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
       WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND (${likeClause})
       ORDER BY mb.Date_Time ASC`,
    [days, ...likeVals]
  );

  const byDate = new Map<string, { leadIds: string[]; mobiles: string[]; sources: string[] }>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, { leadIds: [], mobiles: [], sources: [] });
    const e = byDate.get(dt)!;
    e.leadIds.push(String(r.lead_id || ""));
    e.mobiles.push(normMobile(r.Mobile));
    e.sources.push(String(r.Verified_Source || ""));
  }
  return byDate;
}

// ─── Query: staging_buffer_new (CRM) by date + company ───────────────────────
async function queryCRM(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Map<string, { total: number; leadIds: string[] }>> {
  const likeClause = companyMatch
    .map(() => `LOWER(Lead_Relates_to_which_company) LIKE ?`)
    .join(" OR ");
  const likeVals = companyMatch.map((c) => `%${c}%`);

  const [rows]: any = await pool.query(
    `SELECT DATE(Timestamp_2) AS dt, Lead_id
       FROM staging_buffer_new
       WHERE Timestamp_2 >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND (${likeClause})
       ORDER BY Timestamp_2 ASC`,
    [days, ...likeVals]
  );

  const byDate = new Map<string, { total: number; leadIds: string[] }>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, { total: 0, leadIds: [] });
    const e = byDate.get(dt)!;
    e.total++;
    e.leadIds.push(String(r.Lead_id || ""));
  }
  return byDate;
}

// ─── Query: KServe (ai_voice_leads_received) by date + company ───────────────
async function queryKServe(
  pool: any,
  companyKey: string,
  days: number
): Promise<Map<string, { total: number; leadIds: string[] }>> {
  const [rows]: any = await pool.query(
    `SELECT DATE(date_time) AS dt, lead_id
       FROM ai_voice_leads_received
       WHERE date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND UPPER(company) = ?
         AND (sent_status = 'Sent' OR assign_to_app_sheet_or_dialer IS NOT NULL)
       ORDER BY date_time ASC`,
    [days, companyKey.toUpperCase()]
  );

  const byDate = new Map<string, { total: number; leadIds: string[] }>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    if (!byDate.has(dt)) byDate.set(dt, { total: 0, leadIds: [] });
    const e = byDate.get(dt)!;
    e.total++;
    e.leadIds.push(String(r.lead_id || ""));
  }
  return byDate;
}

// ─── Query: Sales (dialshree_kairali_sent) by date + lead_ids ────────────────
async function querySales(
  pool: any,
  companyKey: string,
  days: number
): Promise<Map<string, number>> {
  // dialshree does not have company column; match via lead_ids later
  // Use data_source LIKE company pattern as proxy
  const [rows]: any = await pool.query(
    `SELECT DATE(enquiry_date_time) AS dt, COUNT(*) AS cnt
       FROM dialshree_kairali_sent
       WHERE enquiry_date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND (data_source LIKE ? OR data_source LIKE ?)
       GROUP BY dt`,
    [days, `%${companyKey}%`, `%${companyKey.toLowerCase()}%`]
  );

  const byDate = new Map<string, number>();
  for (const r of rows) {
    const dt = r.dt instanceof Date ? toIST(r.dt) : String(r.dt).slice(0, 10);
    byDate.set(dt, Number(r.cnt));
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
  bufferMobiles: string[],
  source: string,
  date: string,
  company: string
) {
  const bufferMobileSet = new Set(bufferMobiles.filter(Boolean));
  const records: any[] = [];

  const seen24h = new Map<string, string>(); // mobile → first leadId (for 24hr dup detection)

  directMobiles.forEach((mobile, i) => {
    const leadId = directLeadIds[i] || `${source}_${i}`;
    const norm = normMobile(mobile);

    // Check duplicate in same source within 24hrs
    if (norm && seen24h.has(norm)) {
      records.push({
        id: leadId,
        name: "",
        phone: mobile,
        date,
        company,
        source,
        generatedAt: date,
        timestamp: date,
        transferTimestamp: "",
        bufferTimestamp: "",
        currentStatus: "Lost",
        transferStatus: "Not transferred",
        bufferStatus: "Not in buffer",
        crmStatus: "N/A",
        assignee: "",
        tatMin: 0,
        tat: "—",
        isDuplicate: true,
        validDuplicate: true,
        expectedDuplicateGap: true,
        inMedium: false,
        toBuffer: false,
        inBuffer: false,
        inCrm: false,
        assigned: false,
        stage: "direct",
        status: "Duplicate",
        reason: `Duplicate mobile in same source within 24hrs (original: ${seen24h.get(norm)})`,
      });
    } else {
      if (norm) seen24h.set(norm, leadId);
      // Check if this lead made it to buffer
      if (norm && !bufferMobileSet.has(norm)) {
        records.push({
          id: leadId,
          name: "",
          phone: mobile,
          date,
          company,
          source,
          generatedAt: date,
          timestamp: date,
          transferTimestamp: "",
          bufferTimestamp: "",
          currentStatus: "Lost",
          transferStatus: "Not transferred",
          bufferStatus: "Not in buffer",
          crmStatus: "N/A",
          assignee: "",
          tatMin: 0,
          tat: "—",
          isDuplicate: false,
          inMedium: false,
          toBuffer: false,
          inBuffer: false,
          inCrm: false,
          assigned: false,
          stage: "direct",
          status: "Lost",
          reason: "Lead received in Direct API but not found in Buffer (Gap 1: Direct→Medium)",
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
  const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
  const companyFilter = requestUrl.searchParams.get("company")?.toLowerCase() || "";

  try {
    const pool = await getPool();
    const scannedAt = new Date().toISOString();

    // Collect all dates seen across all queries
    const allDates = new Set<string>();
    // rows indexed by: `${company}__${source}__${date}`
    type RowKey = string;
    const rowMap = new Map<RowKey, any>();

    for (const co of COMPANY_CONFIG) {
      if (companyFilter && !co.company.toLowerCase().includes(companyFilter)) continue;

      // Query buffer + CRM + KServe + Sales for this company (once per company)
      const [bufferData, crmData, kserveData, salesData] = await Promise.all([
        queryBuffer(pool, co.bufferMatch, days),
        queryCRM(pool, co.bufferMatch, days),
        queryKServe(pool, co.companyKey, days),
        querySales(pool, co.companyKey, days),
      ]);

      for (const srcCfg of co.sources) {
        let directByDate: Awaited<ReturnType<typeof queryDirectTable>>;
        try {
          directByDate = await queryDirectTable(pool, srcCfg, days);
        } catch (err) {
          console.error(`[lead-loss] queryDirectTable failed for ${srcCfg.table}:`, err);
          continue;
        }

        for (const { date, leadIds, mobiles } of directByDate) {
          allDates.add(date);
          const key: RowKey = `${co.company}__${srcCfg.source}__${date}`;

          const bufDay = bufferData.get(date) || { leadIds: [], mobiles: [], sources: [] };
          const crmDay = crmData.get(date) || { total: 0, leadIds: [] };
          const kserveDay = kserveData.get(date) || { total: 0, leadIds: [] };
          const salesDay = salesData.get(date) || 0;

          // Filter buffer by source
          const bufSrcMobiles = bufDay.mobiles.filter(
            (_, i) => bufDay.sources[i]?.toLowerCase() === srcCfg.source.toLowerCase()
          );

          const direct = leadIds.length;
          const medium = direct; // medium = direct (same lead, goes to medium sheet)
          const duplicate = detectDuplicates(mobiles);
          const expectedDuplicateGap = duplicate;
          const directMediumGap = 0; // Direct→Medium is usually trigger-based; gap detected via buffer
          const buffer = bufDay.leadIds.length;
          const bufferTransfer = buffer;
          const mediumBufferLost = Math.max(0, direct - duplicate - buffer);
          const mediumBufferGap = mediumBufferLost;
          const crm = crmDay.total;
          const sameDayCrm = crm;
          const lateTransfer = 0;
          const masterCrmLost = Math.max(0, buffer - crm);
          const bufferCrmGap = masterCrmLost;
          const bufferToCrmGap = masterCrmLost;
          const kserve = kserveDay.total;
          const sales = salesDay;
          const assigned = kserve + sales;

          // Build lost records for popup
          const lostRecords = buildLostRecords(
            mobiles,
            leadIds,
            bufDay.mobiles,
            srcCfg.source,
            date,
            co.company
          );

          const existing = rowMap.get(key);
          if (existing) {
            // Merge if same key (e.g. Google/Website share a table)
            existing.direct += direct;
            existing.medium += medium;
            existing.duplicate += duplicate;
            existing.expectedDuplicateGap += expectedDuplicateGap;
            existing.buffer += buffer;
            existing.bufferTransfer += bufferTransfer;
            existing.mediumBufferLost += mediumBufferLost;
            existing.crm += crm;
            existing.kserve += kserve;
            existing.sales += sales;
            existing.assigned += assigned;
            existing.records.push(...lostRecords);
            existing.issues.push(...lostRecords.filter((r: any) => r.status === "Lost"));
          } else {
            rowMap.set(key, {
              id: key,
              date,
              company: co.company,
              source: srcCfg.source,
              direct,
              medium,
              directMediumGap,
              duplicate,
              expectedDuplicateGap,
              bufferTransfer,
              mediumBufferGap,
              mediumBufferLost,
              unexplainedMediumGap: mediumBufferLost,
              gap: mediumBufferLost,
              buffer,
              crm,
              sameDayCrm,
              lateTransfer,
              masterCrmLost,
              bufferCrmGap,
              bufferToCrmGap,
              assigned,
              sales,
              kserve,
              avgTatMin: 0,
              slaBreaches: 0,
              mismatch: false,
              validationErrors: [],
              records: lostRecords,
              issues: lostRecords.filter((r: any) => r.status === "Lost"),
            });
          }
        }
      }
    }

    const rows = [...rowMap.values()].sort((a, b) =>
      b.date.localeCompare(a.date) || a.company.localeCompare(b.company) || a.source.localeCompare(b.source)
    );

    // Pipeline health
    const dates = [...allDates].sort();
    const latestDate = dates[dates.length - 1] || "";
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

    // Current summary (today or last available date)
    const todayIST = toIST(new Date());
    const todayRows = rows.filter((r) => r.date === todayIST || r.date === latestDate);
    const currentSummary = {
      date: todayIST,
      crm: todayRows.reduce((s: number, r: any) => s + r.crm, 0),
      assigned: todayRows.reduce((s: number, r: any) => s + r.assigned, 0),
      kserve: todayRows.reduce((s: number, r: any) => s + r.kserve, 0),
      sales: todayRows.reduce((s: number, r: any) => s + r.sales, 0),
      unassigned: todayRows.reduce(
        (s: number, r: any) => s + Math.max(0, r.crm - r.assigned),
        0
      ),
      slaBreaches: 0,
    };

    const currentIssues = rows
      .flatMap((r: any) => r.issues || [])
      .filter((i: any) => i.date === todayIST || i.date === latestDate)
      .slice(0, 100);

    const totalLeadIds = new Set(rows.flatMap((r: any) => r.records.map((rec: any) => rec.id))).size;

    return Response.json({
      live: true,
      schemaVersion: 3,
      logicVersion: "sql-direct-v1",
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
      {
        live: false,
        mode: "SQL query failed",
        diagnostic: msg,
        scannedAt: new Date().toISOString(),
        rows: [],
      },
      { status: 503 }
    );
  }
}
