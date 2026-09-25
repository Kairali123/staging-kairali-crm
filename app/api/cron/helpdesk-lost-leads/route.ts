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
  // Can be triggered by Vercel Cron or manually
  try {
    const pool = await getPool();

    // 1. Get config
    const [configRows]: any[] = await pool.query("SELECT * FROM helpdesk_config LIMIT 1");
    if (!configRows.length || !configRows[0].is_active || !configRows[0].form_url) {
      return NextResponse.json({ message: "Helpdesk automation is disabled or not configured." });
    }
    const config = configRows[0];

    // 2. Find lost leads (sent > 1 hr ago, not received, not already ticketed, within last 2 days)
    // We look at the last 2 days to catch any failures, but only those older than 1 hour.
    const [lostLeads]: any[] = await pool.query(`
      SELECT 
        s.enquiry_id, s.name_of_client, s.mobile, s.email_id, s.data_source, s.website_name AS company, s.generate_timestamp
      FROM ai_voice_leads_sent s FORCE INDEX (idx_generate_timestamp)
      LEFT JOIN ai_voice_leads_received r FORCE INDEX (idx_initial_id) ON s.enquiry_id = r.initial_id
      LEFT JOIN helpdesk_tickets_created t ON s.enquiry_id = t.enquiry_id
      WHERE s.generate_timestamp >= DATE_SUB(NOW(), INTERVAL 2 DAY)
        AND s.generate_timestamp <= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        AND r.initial_id IS NULL
        AND t.enquiry_id IS NULL
      LIMIT 50
    `);

    if (lostLeads.length === 0) {
      return NextResponse.json({ message: "No new lost leads to process." });
    }

    const processed = [];
    const errors = [];

    // 3. Submit to Google Form and log
    for (const lead of lostLeads) {
      try {
        const formData = new URLSearchParams();
        if (config.entry_lead_id) formData.append(config.entry_lead_id, lead.enquiry_id || '');
        if (config.entry_name) formData.append(config.entry_name, lead.name_of_client || '');
        if (config.entry_phone) formData.append(config.entry_phone, lead.mobile || '');
        if (config.entry_email) formData.append(config.entry_email, lead.email_id || '');
        if (config.entry_source) formData.append(config.entry_source, lead.data_source || '');
        if (config.entry_company) formData.append(config.entry_company, lead.company || '');
        if (config.entry_issue) formData.append(config.entry_issue, 'Lead lost/delayed transfer after 1 hour');

        const response = await fetch(config.form_url, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });

        if (response.ok) {
          await pool.query("INSERT INTO helpdesk_tickets_created (enquiry_id) VALUES (?)", [lead.enquiry_id]);
          processed.push(lead.enquiry_id);
        } else {
          errors.push({ id: lead.enquiry_id, error: response.statusText });
        }
      } catch (e: any) {
        errors.push({ id: lead.enquiry_id, error: e.message });
      }
    }

    return NextResponse.json({
      message: `Processed ${processed.length} help tickets. ${errors.length} errors.`,
      processed,
      errors
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
