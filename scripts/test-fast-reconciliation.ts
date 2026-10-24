import { getPool } from "../lib/db";

async function testFastReconciliation() {
  const pool = await getPool();
  const days = 15;
  const start = Date.now();

  console.log("1. Running unified buffer query for", days, "days...");
  const [bufferRows]: any[] = await pool.query(`
    SELECT DATE(mb.Date_Time) AS dt,
           mb.Date_Time AS arrival_time,
           mb.Mobile,
           mb.lead_id,
           sbn.Lead_Relates_to_which_company,
           sbn.Assign_To_MR_Main,
           COALESCE(mb.actual_time, sbn.gpt_Extraction_Status, sbn.Timestamp_2, sbn.Sent_status) AS assign_time
    FROM master_buffer mb
    LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
    WHERE mb.Date_Time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
  `, [days + 2]);
  console.log(`Buffer query took ${Date.now() - start}ms. Total rows: ${bufferRows.length}`);

  // Test VillaRaag Facebook direct
  const [fbRows]: any[] = await pool.query(`
    SELECT lead_id, mobile, date_time
    FROM villa_raag_facebook_ppc_api
    WHERE DATE(date_time) = '2026-10-14'
  `);
  console.log(`VillaRaag Facebook direct on 14-Oct: ${fbRows.length}`);

  // Check matching
  const bufLeadIds = new Set(bufferRows.map((r: any) => String(r.lead_id ?? "").trim()).filter(Boolean));
  const bufMobiles = new Set(bufferRows.map((r: any) => String(r.Mobile ?? "").replace(/\D/g, "").slice(-10)).filter(Boolean));
  const assignTimes = new Map<string, number>();
  for (const r of bufferRows) {
    const lid = String(r.lead_id ?? "").trim();
    if (lid && r.assign_time && r.Assign_To_MR_Main) {
      assignTimes.set(lid, new Date(r.assign_time).getTime());
    }
  }

  let matchedBuf = 0;
  let totalTatSec = 0;
  let tatCount = 0;
  for (const fb of fbRows) {
    const lid = String(fb.lead_id ?? "").trim();
    const mob = String(fb.mobile ?? "").replace(/\D/g, "").slice(-10);
    const inBuf = (lid && bufLeadIds.has(lid)) || (mob && bufMobiles.has(mob));
    if (inBuf) matchedBuf++;

    const arrv = new Date(fb.date_time).getTime();
    const asgn = assignTimes.get(lid);
    if (asgn && arrv) {
      const diffSec = Math.floor((asgn - arrv) / 1000);
      if (diffSec >= 0 && diffSec <= 86400) {
        totalTatSec += diffSec;
        tatCount++;
      }
    }
  }

  console.log(`Matched buffer count: ${matchedBuf} / ${fbRows.length}`);
  const avgTatSec = tatCount > 0 ? Math.round(totalTatSec / tatCount) : 0;
  const hours = Math.floor(avgTatSec / 3600);
  const mins = Math.floor((avgTatSec % 3600) / 60);
  const secs = avgTatSec % 60;
  const tatFmt = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  console.log(`Calculated TAT for Facebook: ${tatFmt} (${tatCount} leads counted)`);

  process.exit(0);
}

testFastReconciliation().catch(err => {
  console.error(err);
  process.exit(1);
});
