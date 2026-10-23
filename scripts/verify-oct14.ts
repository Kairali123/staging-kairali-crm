/**
 * Quick verification script for 14-Oct-2026 reconciliation issues.
 * Run: npx tsx --env-file=.env.local scripts/verify-oct14.ts
 */
import { getPool } from "../lib/db";

async function run() {
  const pool = await getPool();
  const DATE = "2026-10-14";

  // ─── 1. VillaRaag Facebook: check if lead_id 1662622948532302 is in buffer ───
  console.log("\n=== 1. VillaRaag Facebook 21st lead (empty mobile) ===");
  const [fb21] = await pool.query(
    `SELECT lead_id, mobile FROM villa_raag_facebook_ppc_api WHERE DATE(date_time) = ? ORDER BY date_time`,
    [DATE]
  );
  console.log(`Direct Facebook leads on ${DATE}: ${(fb21 as any[]).length}`);
  const emptyMobiles = (fb21 as any[]).filter((r: any) => !r.mobile || r.mobile.trim() === "");
  console.log(`  → With empty mobile: ${emptyMobiles.length}`, emptyMobiles.map((r: any) => r.lead_id));

  const leadIds = (fb21 as any[]).map((r: any) => r.lead_id);
  const [inBuf] = await pool.query(
    `SELECT lead_id, Mobile FROM master_buffer WHERE lead_id IN (?) AND DATE(Date_Time) BETWEEN ? AND DATE_ADD(?, INTERVAL 2 DAY)`,
    [leadIds, DATE, DATE]
  );
  console.log(`  → Found in master_buffer: ${(inBuf as any[]).length}`);

  const [inSBN] = await pool.query(
    `SELECT sbn.Lead_id FROM staging_buffer_new sbn WHERE sbn.Lead_id IN (?)`,
    [leadIds]
  );
  console.log(`  → Found in staging_buffer_new: ${(inSBN as any[]).length}`);

  // ─── 2. Email Parser — VillaRaag (9 expected) ─────────────────────────────
  console.log("\n=== 2. Email Parser VillaRaag count ===");
  const [epVilla] = await pool.query(
    `SELECT reference_gmail_message_id, s4_route_business_unit, received_at
     FROM email_parser_info_mails
     WHERE DATE(received_at) = ?
       AND (s4_route_business_unit LIKE '%villa%' OR s4_route_business_unit LIKE '%raag%')`,
    [DATE]
  );
  console.log(`  VillaRaag email parser count: ${(epVilla as any[]).length}`);

  // ─── 3. Email Parser — KTAHV (2 expected) ─────────────────────────────────
  console.log("\n=== 3. Email Parser KTAHV count ===");
  const [epKTAHV] = await pool.query(
    `SELECT reference_gmail_message_id, s4_route_business_unit, received_at
     FROM email_parser_info_mails
     WHERE DATE(received_at) = ?
       AND (s4_route_business_unit LIKE '%healing village%' OR s4_route_business_unit LIKE '%ktahv%')`,
    [DATE]
  );
  console.log(`  KTAHV email parser count: ${(epKTAHV as any[]).length}`, (epKTAHV as any[]).map((r: any) => r.reference_gmail_message_id));

  // ─── 4. Email Parser — KAPL ───────────────────────────────────────────────
  console.log("\n=== 4. Email Parser KAPL count ===");
  const [epKAPL] = await pool.query(
    `SELECT reference_gmail_message_id, s4_route_business_unit, received_at
     FROM email_parser_info_mails
     WHERE DATE(received_at) = ?
       AND (s4_route_business_unit LIKE '%product%' OR s4_route_business_unit LIKE '%kapl%' OR s4_route_business_unit LIKE '%kappl%')`,
    [DATE]
  );
  console.log(`  KAPL email parser count: ${(epKAPL as any[]).length}`);

  // ─── 5. Bulk WhatsApp — KTAHV 2 specific wamids ───────────────────────────
  console.log("\n=== 5. Bulk WhatsApp KTAHV (2 specific wamids) ===");
  const wamids = [
    "wamid.HBgMOTE2Mzk0NDM5MzY1FQIAEhggQUNGMjAyNjU0NTAzMEI3MkVERDEyRjc4RTBFMTk2MzUA",
    "wamid.HBgMOTE5NDUwNTA5Mjg5FQIAEhggQTVDOTA4QTJFNTk3NkVENEZEM0E1QkUyRDkwM0Q1RTMA",
  ];
  const [bwKTAHV] = await pool.query(
    `SELECT source_id, date_time, new_category, website_name, remarks
     FROM bulk_whatsapp_reply_enquiry_generation
     WHERE source_id IN (?)`,
    [wamids]
  );
  console.log(`  KTAHV bulk WhatsApp count: ${(bwKTAHV as any[]).length}`);
  for (const r of bwKTAHV as any[]) {
    console.log(`    source_id: ${r.source_id?.substring(0, 60)}... category: ${r.new_category} website: ${r.website_name}`);
  }

  // ─── 6. KTAHV IVR duplicate leads ─────────────────────────────────────────
  console.log("\n=== 6. KTAHV IVR duplicate leads check ===");
  const dupLeadIds = ["a47c15db-6cb3-4b8f-a2f6-c9f67b3e17f2", "7d32f813-9b45-4cbc-af75-4537f2e03603"];
  const [ivrDup] = await pool.query(
    `SELECT lead_id, mobile, date_time FROM ivr_lead_api_knowrality WHERE lead_id IN (?)`,
    [dupLeadIds]
  );
  console.log(`  Found in IVR direct table: ${(ivrDup as any[]).length}`, (ivrDup as any[]).map((r: any) => ({ lead_id: r.lead_id, mobile: r.mobile })));

  const [ivrDupBuf] = await pool.query(
    `SELECT lead_id, Mobile FROM master_buffer WHERE lead_id IN (?)`,
    [dupLeadIds]
  );
  console.log(`  Found in master_buffer: ${(ivrDupBuf as any[]).length}`, (ivrDupBuf as any[]).map((r: any) => r.lead_id));

  // ─── 7. Priyasharma AI — KTAHV timestamp column check ────────────────────
  console.log("\n=== 7. Priyasharma AI for KTAHV ===");
  const [psKTAHV] = await pool.query(
    `SELECT lead_id, src, phone, lead_relates_to_which_company,
            timestamp, chat_created_date_time,
            COALESCE(timestamp, chat_created_date_time) AS eff_date
     FROM kairali_chatbase_leads_api_priya_sharma
     WHERE DATE(COALESCE(timestamp, chat_created_date_time)) = ?
       AND (
         LOWER(lead_relates_to_which_company) LIKE '%healing village%' OR
         LOWER(lead_relates_to_which_company) LIKE '%ktahv%' OR
         LOWER(lead_relates_to_which_company) LIKE '%ayurvedic center%' OR
         LOWER(lead_relates_to_which_company) LIKE '%ayurvedic centre%'
       )`,
    [DATE]
  );
  console.log(`  KTAHV Priyasharma leads: ${(psKTAHV as any[]).length}`);
  const bySource: Record<string, number> = {};
  for (const r of psKTAHV as any[]) {
    const s = r.src || "(null)";
    bySource[s] = (bySource[s] || 0) + 1;
  }
  console.log("  By src:", bySource);

  // ─── 8. TAT test: VillaRaag Facebook ──────────────────────────────────────
  console.log("\n=== 8. VillaRaag Facebook TAT test ===");
  const [tatRows] = await pool.query(
    `SELECT DATE(src.date_time) AS dt,
            src.date_time AS arrival_time,
            COALESCE(mb.actual_time, sbn.gpt_Extraction_Status, sbn.Timestamp_2, sbn.Sent_status) AS assign_time
     FROM villa_raag_facebook_ppc_api src
     LEFT JOIN master_buffer mb ON mb.lead_id COLLATE utf8mb4_general_ci = src.lead_id COLLATE utf8mb4_general_ci
     LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id COLLATE utf8mb4_general_ci = src.lead_id COLLATE utf8mb4_general_ci
     WHERE DATE(src.date_time) = ?
       AND (sbn.Assign_To_MR_Main IS NOT NULL AND sbn.Assign_To_MR_Main != '')`,
    [DATE]
  );
  console.log(`  TAT rows matched: ${(tatRows as any[]).length}`);
  for (const r of tatRows as any[]) {
    const arrv = r.arrival_time ? new Date(r.arrival_time) : null;
    const asgn = r.assign_time ? new Date(r.assign_time) : null;
    const diff = arrv && asgn ? Math.round((asgn.getTime() - arrv.getTime()) / 60000) : null;
    console.log(`    arrival: ${r.arrival_time} assign: ${r.assign_time} tat_min: ${diff}`);
  }

  await (pool as any).end?.();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
