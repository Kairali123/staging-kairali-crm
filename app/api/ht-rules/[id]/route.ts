import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = await getPool();
    const [rows]: any[] = await pool.query("SELECT * FROM ht_automation_rules WHERE id = ?", [params.id]);
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, rule: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const pool = await getPool();

    await pool.query(`
      UPDATE ht_automation_rules SET 
        rule_name = ?, is_active = ?, source_page = ?, source_label = ?, doer_name = ?, doer_email = ?,
        trigger_type = ?, trigger_time = ?, trigger_days = ?, form_url = ?,
        form_creator_name = ?, form_creator_email = ?, form_department = ?, form_issue_text = ?, form_issue_level = ?,
        form_solution1 = ?, form_solution2 = ?, form_solution3 = ?,
        entry_creator_name = ?, entry_creator_email = ?, entry_department = ?, entry_issue = ?, entry_issue_level = ?,
        entry_delegated_to = ?, entry_delegated_email = ?, entry_solution1 = ?, entry_solution2 = ?, entry_solution3 = ?,
        cooldown_hours = ?
      WHERE id = ?
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
      body.cooldown_hours || 20,
      params.id
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pool = await getPool();
    await pool.query("DELETE FROM ht_automation_rules WHERE id = ?", [params.id]);
    await pool.query("DELETE FROM ht_automation_log WHERE rule_id = ?", [params.id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
