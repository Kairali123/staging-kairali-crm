import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

async function getPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();

    const [configRows]: any[] = await pool.query("SELECT * FROM helpdesk_config LIMIT 1");
    if (!configRows.length || !configRows[0].is_active || !configRows[0].form_url) {
      return NextResponse.json({ message: "Helpdesk automation is disabled or not configured." });
    }
    const config = configRows[0];
    const triggerHours = config.trigger_hours || 1;

    const [lostLeads]: any[] = await pool.query(`
      SELECT 
        s.enquiry_id, s.name_of_client, s.mobile, s.email_id, s.data_source, s.website_name AS company, s.generate_timestamp
      FROM ai_voice_leads_sent s FORCE INDEX (idx_generate_timestamp)
      LEFT JOIN ai_voice_leads_received r FORCE INDEX (idx_initial_id) ON s.enquiry_id = r.initial_id
      LEFT JOIN helpdesk_tickets_created t ON s.enquiry_id = t.enquiry_id
      WHERE s.generate_timestamp >= DATE_SUB(NOW(), INTERVAL 2 DAY)
        AND s.generate_timestamp <= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND r.initial_id IS NULL
        AND t.enquiry_id IS NULL
    `, [triggerHours]);

    if (lostLeads.length === 0) {
      return NextResponse.json({ message: "No new lost leads to ticket." });
    }

    let createdCount = 0;
    const results = [];

    for (const lead of lostLeads) {
      const formData = new URLSearchParams();
      if (config.entry_lead_id) formData.append(config.entry_lead_id, lead.enquiry_id);
      if (config.entry_name) formData.append(config.entry_name, lead.name_of_client || "Unknown");
      if (config.entry_phone) formData.append(config.entry_phone, lead.mobile || "");
      if (config.entry_email) formData.append(config.entry_email, lead.email_id || "");
      if (config.entry_source) formData.append(config.entry_source, lead.data_source || "");
      if (config.entry_company) formData.append(config.entry_company, lead.company || "");
      if (config.entry_issue) formData.append(config.entry_issue, `Lead sent at ${lead.generate_timestamp} but never reached CRM after ${triggerHours} hours (Automated lost trigger).`);

      try {
        const response = await fetch(config.form_url, {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        if (response.ok || response.type === "opaque") {
          await pool.query(
            "INSERT INTO helpdesk_tickets_created (enquiry_id, lead_id, company, source) VALUES (?, ?, ?, ?)",
            [lead.enquiry_id, lead.enquiry_id, lead.company, lead.data_source]
          );
          createdCount++;
          results.push({ lead_id: lead.enquiry_id, status: "success" });
        } else {
          results.push({ lead_id: lead.enquiry_id, status: "failed", reason: response.statusText });
        }
      } catch (err: any) {
        results.push({ lead_id: lead.enquiry_id, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: lostLeads.length, 
      created: createdCount,
      results
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
