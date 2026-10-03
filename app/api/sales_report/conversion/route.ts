import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: NextRequest) {
  let conn: any;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const employee = searchParams.get("employee");
    const company = searchParams.get("company");
    const type = searchParams.get("type") || "actual";

    const pool = await getPool();
    conn = await pool.getConnection();

    let formattedDate = date || "";
    if (formattedDate && formattedDate.split("-")[0]?.length === 2) {
      const [day, month, year] = formattedDate.split("-");
      formattedDate = `${year}-${month}-${day}`;
    }

    const conditions: string[] = [];
    const params: any[] = [];
    if (formattedDate) {
      conditions.push("DATE(c.date_and_time) = ?");
      params.push(formattedDate);
    }
    if (employee && employee !== "all") {
      const cleanEmployee = employee.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
      conditions.push("(c.sales_person_name LIKE ? OR c.sales_person_name = ?)");
      params.push(`%${cleanEmployee}%`, cleanEmployee);
    }
    if (company && company !== "all") {
      conditions.push("c.company = ?");
      params.push(company);
    }

    const [rows]: any = await conn.execute(`
      SELECT c.*,
             DATE_FORMAT(c.date_and_time, '%d-%m-%Y %H:%i') AS formatted_datetime
      FROM conversion_updates_employeewise c
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY c.date_and_time DESC
      LIMIT 500
    `, params);

    const data = rows.filter((row: any) => {
      const status = String(row.booking_status ?? "").trim().toLowerCase();
      const cancelled = status === "cancelled" || status === "booking cancelled";
      const verified = Number(row.is_verified) === 1;
      const returnId = String(row.return_id ?? "").trim();
      const source = String(row.verified_source ?? "");

      if (type === "actual") {
        return ((row.company === "KTAHV" || row.company === "VILLARAAG") && verified && status === "confirmed") ||
          (row.company === "KAPPL" && verified && status === "confirmed" && returnId === "" && source !== "Sample Order");
      }
      if (type === "unverified") {
        return !cancelled && !verified && source !== "Sample Order" &&
          !((row.company === "KTAHV" && ["complimentary", "voucher"].includes(status)) ||
            (row.company === "VILLARAAG" && ["no show", "complimentary", "voucher"].includes(status)));
      }
      return (row.company === "KTAHV" && (cancelled || status === "no show")) ||
        (row.company === "KAPPL" && verified && returnId !== "");
    });

    return NextResponse.json({ success: true, data }, { headers });
  } catch (error: any) {
    console.error("[sales-report-conversion] error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500, headers });
  } finally {
    conn?.release();
  }
}
