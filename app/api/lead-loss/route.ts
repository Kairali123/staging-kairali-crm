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
}

async function queryDirectTable(
  pool: any,
  cfg: SourceConfig,
  days: number
): Promise<DirectEntry[]> {
  const where = cfg.sourceFilter ? `AND (${cfg.sourceFilter})` : "";
  const sql = `
    SELECT DATE(\`${cfg.dateCol}\`) AS dt,
           \`${cfg.leadIdCol}\`     AS lead_id,
           \`${cfg.mobileCol}\`     AS mobile
    FROM \`${cfg.table}\`
    WHERE \`${cfg.dateCol}\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ${where}
    ORDER BY \`${cfg.dateCol}\` ASC
  `;
  const [rows]: any[] = await pool.query(sql, [days]);

  const byDate: Record<string, { leadIds: string[]; mobiles: string[] }> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = { leadIds: [], mobiles: [] };
    byDate[dt].leadIds.push(String(r.lead_id ?? ""));
    byDate[dt].mobiles.push(normMobile(r.mobile));
  }
  return Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
}

// ─── Buffer mobile sets by date ───────────────────────────────────────────────

async function queryBuffer(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Record<string, Set<string>>> {
  const likeClause = companyMatch
    .map(() => "LOWER(sbn.Lead_Relates_to_which_company) LIKE ?")
    .join(" OR ");
  const params: any[] = [days, ...companyMatch.map((c) => `%${c}%`)];

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

// ─── CRM mobile sets by date ──────────────────────────────────────────────────

async function queryCRM(
  pool: any,
  companyMatch: string[],
  days: number
): Promise<Record<string, Set<string>>> {
  const likeClause = companyMatch
    .map(() => "LOWER(Lead_Relates_to_which_company) LIKE ?")
    .join(" OR ");
  const params: any[] = [days, ...companyMatch.map((c) => `%${c}%`)];

  const [rows]: any[] = await pool.query(
    `SELECT DATE(Timestamp_2) AS dt, Phone_Number_of_User
     FROM staging_buffer_new
     WHERE Timestamp_2 >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND (${likeClause})`,
    params
  );

  const byDate: Record<string, Set<string>> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.Phone_Number_of_User);
    if (m) byDate[dt].add(m);
  }
  return byDate;
}

// ─── KServe mobile sets by date ───────────────────────────────────────────────

async function queryKServe(
  pool: any,
  companyKey: string,
  days: number
): Promise<Record<string, Set<string>>> {
  const [rows]: any[] = await pool.query(
    `SELECT DATE(date_time) AS dt, mobile
     FROM ai_voice_leads_received
     WHERE date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND UPPER(company) = ?
       AND (sent_status = 'Sent' OR assign_to_app_sheet_or_dialer IS NOT NULL)`,
    [days, companyKey.toUpperCase()]
  );

  const byDate: Record<string, Set<string>> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.mobile);
    if (m) byDate[dt].add(m);
  }
  return byDate;
}

// ─── Sales (Dialer) mobile sets by date ──────────────────────────────────────

async function querySales(
  pool: any,
  companyKey: string,
  days: number
): Promise<Record<string, Set<string>>> {
  const [rows]: any[] = await pool.query(
    `SELECT DATE(enquiry_date_time) AS dt, mobile
     FROM dialshree_kairali_sent
     WHERE enquiry_date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND (data_source LIKE ? OR data_source LIKE ?)`,
    [days, `%${companyKey}%`, `%${companyKey.toLowerCase()}%`]
  );

  const byDate: Record<string, Set<string>> = {};
  for (const r of rows as any[]) {
    const dt = rowDate(r.dt);
    if (!byDate[dt]) byDate[dt] = new Set<string>();
    const m = normMobile(r.mobile);
    if (m) byDate[dt].add(m);
  }
  return byDate;
}

// ─── Build lost records for popup ────────────────────────────────────────────

function buildLostRecords(
  directMobiles: string[],
  directLeadIds: string[],
  bufSet: Set<string>,
  crmSet: Set<string>,
  source: string,
  date: string,
  company: string
): any[] {
  const records: any[] = [];
  const seen24h = new Map<string, string>();

  directMobiles.forEach((mobile, i) => {
    const leadId = directLeadIds[i] ?? `${source}_${i}`;
    const norm = normMobile(mobile);

    if (norm && seen24h.has(norm)) {
      records.push({
        id: leadId, name: "", phone: mobile, date, company, source,
        generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
        currentStatus: "Lost", transferStatus: "Not transferred",
        bufferStatus: "Not in buffer", crmStatus: "N/A",
        assignee: "", tatMin: 0, tat: "—",
        isDuplicate: true, validDuplicate: true, expectedDuplicateGap: true,
        inMedium: false, toBuffer: false, inBuffer: false, inCrm: false, assigned: false,
        stage: "direct", status: "Duplicate",
        reason: "Duplicate mobile in same source within 24hrs",
      });
    } else {
      if (norm) seen24h.set(norm, leadId);
      const inBuf = norm ? bufSet.has(norm) : false;
      const inCrm = norm ? crmSet.has(norm) : false;

      if (!inBuf) {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Lost", transferStatus: "Not transferred",
          bufferStatus: "Not in buffer", crmStatus: "N/A",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: false, toBuffer: false,
          inBuffer: false, inCrm: false, assigned: false,
          stage: "direct", status: "Lost",
          reason: "Lead received in Direct API but not found in Buffer (Gap 1: Direct→Medium)",
        });
      } else if (!inCrm) {
        records.push({
          id: leadId, name: "", phone: mobile, date, company, source,
          generatedAt: date, timestamp: date, transferTimestamp: date, bufferTimestamp: date,
          currentStatus: "Lost", transferStatus: "Transferred",
          bufferStatus: "In Buffer", crmStatus: "Not in CRM",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false, inMedium: true, toBuffer: true,
          inBuffer: true, inCrm: false, assigned: false,
          stage: "buffer", status: "Lost",
          reason: "Lead found in Buffer but missing from CRM (Gap 2: Medium→CRM)",
        });
      }
    }
  });
  return records;
}

// ─── Main GET handler ─────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const days = Math.min(parseInt(requestUrl.searchParams.get("days") ?? "31", 10), 90);
  const companyFilter = (requestUrl.searchParams.get("company") ?? "").toLowerCase();

  try {
    const pool = await getPool();
    const scannedAt = new Date().toISOString();
    const allDates = new Set<string>();
    const rowMap: Record<string, any> = {};

    for (const co of COMPANY_CONFIG) {
      if (companyFilter && !co.company.toLowerCase().includes(companyFilter)) continue;

      const [bufferData, crmData, kserveData, salesData] = await Promise.all([
        queryBuffer(pool, co.bufferMatch, days),
        queryCRM(pool, co.bufferMatch, days),
        queryKServe(pool, co.companyKey, days),
        querySales(pool, co.companyKey, days),
      ]);

      for (const srcCfg of co.sources) {
        let directByDate: DirectEntry[];
        try {
          directByDate = await queryDirectTable(pool, srcCfg, days);
        } catch (err) {
          console.error(`[lead-loss] queryDirectTable failed for ${srcCfg.table}:`, err);
          continue;
        }

        for (const { date, leadIds, mobiles } of directByDate) {
          allDates.add(date);
          const key = `${co.company}__${srcCfg.source}__${date}`;

          const bufSet: Set<string> = bufferData[date] ?? new Set<string>();
          const crmSet: Set<string> = crmData[date] ?? new Set<string>();
          const kvSet: Set<string> = kserveData[date] ?? new Set<string>();
          const sSet: Set<string> = salesData[date] ?? new Set<string>();

          const direct = leadIds.length;
          const duplicate = detectDuplicates(mobiles);

          // Intersection: count how many unique direct mobiles are in each stage
          let buffer = 0, crm = 0, kserve = 0, sales = 0;
          const seen = new Set<string>();
          for (const raw of mobiles) {
            const m = normMobile(raw);
            if (!m || seen.has(m)) continue;
            seen.add(m);
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

          const lostRecords = buildLostRecords(
            mobiles, leadIds, bufSet, crmSet, srcCfg.source, date, co.company
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
            existing.crm += crm;
            existing.kserve += kserve;
            existing.sales += sales;
            existing.assigned += assigned;
            existing.records.push(...lostRecords);
            existing.issues.push(...lostRecords.filter((r: any) => r.status === "Lost"));
          } else {
            rowMap[key] = {
              id: key, date, company: co.company, source: srcCfg.source,
              direct, medium, directMediumGap, duplicate, expectedDuplicateGap,
              bufferTransfer, mediumBufferGap, mediumBufferLost,
              unexplainedMediumGap: mediumBufferLost, gap: mediumBufferLost,
              buffer, crm, sameDayCrm, lateTransfer, masterCrmLost,
              bufferCrmGap, bufferToCrmGap, assigned, sales, kserve,
              avgTatMin: 0, slaBreaches: 0, mismatch: false, validationErrors: [],
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
