export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIST(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function safeDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return toIST(val);
  const s = String(val).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function normMobile(m: string | null | undefined): string {
  if (!m) return "";
  const d = String(m).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

// ─── Main GET ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const days = Math.min(
    parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10),
    90
  );

  try {
    const pool = await getPool();
    const scannedAt = new Date().toISOString();
    const todayIST = toIST(new Date());

    // ── 1. All sent leads in window ─────────────────────────────────────────
    const [sentRows]: any[] = await pool.query(
      `SELECT
         enquiry_id, name_of_client, mobile, email_id,
         website_name AS company,
         data_source,
         campaign_name,
         generate_timestamp AS sent_date,
         DATE(generate_timestamp) AS sent_day
       FROM ai_voice_leads_sent
       WHERE generate_timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY generate_timestamp DESC`,
      [days]
    );

    // ── 2. All received leads in window ─────────────────────────────────────
    const [recvRows]: any[] = await pool.query(
      `SELECT DISTINCT initial_id AS enquiry_id
       FROM ai_voice_leads_received
       WHERE date_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [days]
    );
    const receivedSet = new Set<string>(
      (recvRows as any[]).map((r: any) => String(r.enquiry_id))
    );

    // ── 3. KServe settings for lost threshold ───────────────────────────────
    let lostDays = 2; // default: leads older than 2 days without return = lost
    try {
      const [ks]: any[] = await pool.query(
        "SELECT lost_days FROM kserve_settings WHERE id = 1"
      );
      if (ks?.[0]?.lost_days) lostDays = Number(ks[0].lost_days);
    } catch {}

    // ── 4. Build per-date per-company rows ──────────────────────────────────
    // Key: date|company|source
    const rowMap = new Map<string, any>();

    for (const r of sentRows as any[]) {
      const date = safeDate(r.sent_day);
      if (!date) continue;
      const company = String(r.company || "Unknown").trim();
      const source = String(r.data_source || "Unknown").trim();
      const key = `${date}|${company}|${source}`;
      const isReceived = receivedSet.has(String(r.enquiry_id));
      const daysDiff = Math.floor(
        (Date.now() - new Date(date + "T00:00:00Z").getTime()) / 86400000
      );
      const isLost = !isReceived && daysDiff >= lostDays;

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          id: key,
          date,
          company,
          source,
          direct: 0,      // total sent
          received: 0,    // returned from kserve
          lost: 0,        // confirmed lost (>lostDays, no return)
          pending: 0,     // sent, no return yet but within lostDays window
          // for page.tsx compatibility
          medium: 0, directMediumGap: 0, duplicate: 0, expectedDuplicateGap: 0,
          bufferTransfer: 0, mediumBufferGap: 0, mediumBufferLost: 0,
          unexplainedMediumGap: 0, gap: 0, buffer: 0, crm: 0,
          sameDayCrm: 0, lateTransfer: 0, masterCrmLost: 0,
          bufferCrmGap: 0, bufferToCrmGap: 0, assigned: 0, sales: 0, kserve: 0,
          avgTatMin: 0, slaBreaches: 0, mismatch: false, validationErrors: [],
          records: [], issues: [],
        });
      }
      const row = rowMap.get(key)!;
      row.direct++;
      row.medium = row.direct;

      if (isReceived) {
        row.received++;
        row.crm++;
        row.buffer++;
        row.sameDayCrm++;
        row.assigned++;
        row.kserve++;
      } else if (isLost) {
        row.lost++;
        row.masterCrmLost++;
        row.bufferCrmGap++;
        row.bufferToCrmGap++;
        row.mediumBufferLost++;
        row.unexplainedMediumGap++;
        row.gap++;
        // Build issue record
        row.issues.push({
          id: String(r.enquiry_id),
          name: String(r.name_of_client || ""),
          phone: String(r.mobile || ""),
          email: String(r.email_id || ""),
          date,
          company,
          source,
          generatedAt: safeDate(r.sent_date),
          timestamp: safeDate(r.sent_date),
          transferTimestamp: "", bufferTimestamp: "",
          currentStatus: "Lost",
          transferStatus: "Not transferred",
          bufferStatus: "Not in KServe",
          crmStatus: "N/A",
          assignee: "", tatMin: 0, tat: "—",
          isDuplicate: false,
          inMedium: false, toBuffer: false, inBuffer: false,
          inCrm: false, assigned: false,
          stage: "kserve_sent",
          status: "Lost",
          reason: `Lead sent to KServe on ${date} but no result received after ${daysDiff} day(s).`,
        });
        row.records.push(row.issues[row.issues.length - 1]);
      } else {
        row.pending++;
        // within lostDays — still time to return
      }
    }

    // ── 5. Sort: newest first ───────────────────────────────────────────────
    const rows = Array.from(rowMap.values()).sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.company.localeCompare(b.company) ||
        a.source.localeCompare(b.source)
    );

    // ── 6. Summary stats ────────────────────────────────────────────────────
    const allDates = [...new Set(rows.map((r) => r.date))].sort();
    const latestDate = allDates[allDates.length - 1] ?? todayIST;
    const trackingLagDays =
      Math.floor(
        (Date.now() - new Date(latestDate + "T00:00:00Z").getTime()) / 86400000
      );

    const todayRows = rows.filter((r) => r.date === todayIST);

    const currentSummary = {
      date: todayIST,
      direct: todayRows.reduce((s, r) => s + r.direct, 0),
      received: todayRows.reduce((s, r) => s + r.received, 0),
      lost: todayRows.reduce((s, r) => s + r.lost, 0),
      pending: todayRows.reduce((s, r) => s + r.pending, 0),
      crm: todayRows.reduce((s, r) => s + r.crm, 0),
      assigned: todayRows.reduce((s, r) => s + r.kserve, 0),
      kserve: todayRows.reduce((s, r) => s + r.kserve, 0),
      sales: 0,
      unassigned: 0,
      slaBreaches: 0,
    };

    const totalLost = rows.reduce((s, r) => s + r.lost, 0);
    const totalSent = rows.reduce((s, r) => s + r.direct, 0);

    return NextResponse.json({
      live: true,
      schemaVersion: 4,
      logicVersion: "kserve-sql-v4",
      mode: "Live KServe SQL",
      crmMode: `KServe SQL · Lost threshold: ${lostDays}d`,
      scannedAt,
      lostDays,
      rows,
      pipelineHealth: {
        checklistLastDate: latestDate,
        masterLatestDate: todayIST,
        trackingLagDays,
        stageTrackingCurrent: trackingLagDays <= 1,
        message:
          trackingLagDays <= 1
            ? "Live SQL data — KServe pipeline tracking is current."
            : `Latest data: ${latestDate} (${trackingLagDays}d lag)`,
      },
      currentSummary,
      currentIssues: rows
        .flatMap((r) => r.issues as any[])
        .filter((i) => i.date === todayIST || i.date === latestDate)
        .slice(0, 200),
      validation: {
        rows: rows.length,
        mismatches: 0,
        leadIds: totalSent,
        totalLost,
        totalSent,
        lostRate: totalSent > 0 ? Math.round((totalLost / totalSent) * 100) : 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown DB error";
    console.error("[lead-loss-v4]", msg);
    return NextResponse.json(
      {
        live: false,
        mode: "SQL Error",
        diagnostic: msg,
        scannedAt: new Date().toISOString(),
        rows: [],
      },
      { status: 503 }
    );
  }
}
