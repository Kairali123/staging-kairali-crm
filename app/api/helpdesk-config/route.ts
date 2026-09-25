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

export async function GET() {
  try {
    const pool = await getPool();
    const [rows]: any[] = await pool.query("SELECT * FROM helpdesk_config LIMIT 1");
    if (rows.length === 0) {
      return NextResponse.json({ config: null });
    }
    return NextResponse.json({ config: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = await getPool();

    await pool.query(`
      UPDATE helpdesk_config SET 
        form_url = ?, entry_lead_id = ?, entry_name = ?, entry_phone = ?, 
        entry_email = ?, entry_source = ?, entry_company = ?, entry_issue = ?,
        is_active = ?, trigger_hours = ?
      WHERE id = 1
    `, [
      body.form_url || '', body.entry_lead_id || '', body.entry_name || '', body.entry_phone || '',
      body.entry_email || '', body.entry_source || '', body.entry_company || '', body.entry_issue || '',
      body.is_active ? 1 : 0, body.trigger_hours || 1
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
