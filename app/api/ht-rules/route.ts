import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureTables() {
  const pool = await getPool();
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ht_automation_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rule_name VARCHAR(255) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      source_page VARCHAR(100) NOT NULL,
      source_label VARCHAR(255) NOT NULL,
      doer_name VARCHAR(255) NOT NULL,
      doer_email VARCHAR(255) NOT NULL,
      trigger_type ENUM('daily_deadline','task_incomplete') NOT NULL DEFAULT 'daily_deadline',
      trigger_time TIME NOT NULL DEFAULT '18:05:00',
      trigger_days VARCHAR(50) DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      form_url VARCHAR(1000) NOT NULL,
      form_creator_name VARCHAR(255) DEFAULT 'System Automation',
      form_creator_email VARCHAR(255) DEFAULT '',
      form_department VARCHAR(100) DEFAULT 'Admin',
      form_issue_text VARCHAR(1000) DEFAULT '',
      form_issue_level ENUM('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
      form_solution1 VARCHAR(1000) DEFAULT '',
      form_solution2 VARCHAR(1000) DEFAULT '',
      form_solution3 VARCHAR(1000) DEFAULT '',
      entry_creator_name VARCHAR(100) DEFAULT '',
      entry_creator_email VARCHAR(100) DEFAULT '',
      entry_department VARCHAR(100) DEFAULT '',
      entry_issue VARCHAR(100) DEFAULT '',
      entry_issue_level VARCHAR(100) DEFAULT '',
      entry_delegated_to VARCHAR(100) DEFAULT '',
      entry_delegated_email VARCHAR(100) DEFAULT '',
      entry_solution1 VARCHAR(100) DEFAULT '',
      entry_solution2 VARCHAR(100) DEFAULT '',
      entry_solution3 VARCHAR(100) DEFAULT '',
      cooldown_hours INT DEFAULT 20,
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ht_automation_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rule_id INT NOT NULL,
      rule_name VARCHAR(255),
      doer_name VARCHAR(255),
      doer_email VARCHAR(255),
      source_page VARCHAR(100),
      form_status ENUM('success','failed','skipped') DEFAULT 'success',
      form_response VARCHAR(500),
      error_message TEXT,
      triggered_at DATETIME DEFAULT NOW(),
      INDEX idx_rule_id (rule_id),
      INDEX idx_triggered_at (triggered_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function GET() {
  try {
    await ensureTables();
    const pool = await getPool();
    const [rows]: any[] = await pool.query("SELECT * FROM ht_automation_rules ORDER BY created_at DESC");
    return NextResponse.json({ success: true, rules: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const pool = await getPool();

    const [result]: any = await pool.query(`
      INSERT INTO ht_automation_rules (
        rule_name, is_active, source_page, source_label, doer_name, doer_email,
        trigger_type, trigger_time, trigger_days, form_url,
        form_creator_name, form_creator_email, form_department, form_issue_text, form_issue_level,
        form_solution1, form_solution2, form_solution3,
        entry_creator_name, entry_creator_email, entry_department, entry_issue, entry_issue_level,
        entry_delegated_to, entry_delegated_email, entry_solution1, entry_solution2, entry_solution3,
        cooldown_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      body.rule_name || '',
      body.is_active === undefined ? 1 : body.is_active,
      body.source_page || '',
      body.source_label || '',
      body.doer_name || '',
      body.doer_email || '',
      body.trigger_type || 'daily_deadline',
      body.trigger_time || '18:05:00',
      body.trigger_days || 'mon,tue,wed,thu,fri,sat,sun',
      body.form_url || '',
      body.form_creator_name || '',
      body.form_creator_email || '',
      body.form_department || 'Admin',
      body.form_issue_text || '',
      body.form_issue_level || 'MEDIUM',
      body.form_solution1 || '',
      body.form_solution2 || '',
      body.form_solution3 || '',
      body.entry_creator_name || '',
      body.entry_creator_email || '',
      body.entry_department || '',
      body.entry_issue || '',
      body.entry_issue_level || '',
      body.entry_delegated_to || '',
      body.entry_delegated_email || '',
      body.entry_solution1 || '',
      body.entry_solution2 || '',
      body.entry_solution3 || '',
      body.cooldown_hours || 20
    ]);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
