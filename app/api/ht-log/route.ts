import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const rule_id = searchParams.get("rule_id");

    let query = "SELECT * FROM ht_automation_log";
    const params: any[] = [];

    if (rule_id) {
      query += " WHERE rule_id = ?";
      params.push(rule_id);
    }

    query += " ORDER BY triggered_at DESC LIMIT ?";
    params.push(limit);

    const [rows]: any[] = await pool.query(query, params);
    return NextResponse.json({ success: true, logs: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
