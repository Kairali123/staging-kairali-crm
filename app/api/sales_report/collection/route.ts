import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
    "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(req: NextRequest) {
    let conn;
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date"); // e.g. "01-08-2026" or "2026-08-01"
        const employee = searchParams.get("employee");
        const company = searchParams.get("company");

        const pool = await getPool();
        conn = await pool.getConnection();

        // Support both DD-MM-YYYY and YYYY-MM-DD format
        let formattedDate = "";
        if (date) {
            if (date.includes("-") && date.split("-")[0].length === 2) {
                // DD-MM-YYYY -> YYYY-MM-DD
                const [d, m, y] = date.split("-");
                formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
            } else {
                formattedDate = date;
            }
        }

        const conditions: string[] = [];
        const params: any[] = [];

        if (formattedDate) {
            // Sales dates are calculated in IST; payment timestamps may be stored in UTC.
            conditions.push("(DATE(p.payment_received_date) = ? OR DATE(DATE_ADD(p.payment_received_date, INTERVAL 330 MINUTE)) = ? OR DATE(DATE_ADD(p.payment_received_date, INTERVAL 1 DAY)) = ?)");
            params.push(formattedDate, formattedDate, formattedDate);
        }

        if (employee && employee !== "all") {
            const cleanEmp = employee.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
            if (cleanEmp.toLowerCase() === "unassigned") {
                // "Unassigned" (see app/api/sales_report/route.ts) is a label this
                // report invents for rows with no payment_collected_by — it never
                // exists as literal text in the DB, so the LIKE/= match below would
                // always find 0 rows and silently fall through to matching every
                // employee on the date instead (payment_collection genuinely mixes
                // null and named collectors on the same date for some companies,
                // e.g. KTAHV on 2025-03-21). Match the real condition directly.
                conditions.push("(p.payment_collected_by IS NULL OR TRIM(p.payment_collected_by) = '')");
            } else {
                conditions.push("(p.payment_collected_by LIKE ? OR p.payment_collected_by = ?)");
                params.push(`%${cleanEmp}%`, cleanEmp);
            }
        }

        if (company && company !== "all") {
            conditions.push("UPPER(TRIM(p.company)) = UPPER(TRIM(?))");
            params.push(company);
        }

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Query payment_collection
        const [rows]: any = await conn.execute(
            `
            SELECT
                p.*,
                DATE_FORMAT(p.payment_received_date, '%d-%m-%Y %H:%i') as formatted_datetime
            FROM payment_collection p
            ${whereSql}
            ORDER BY p.payment_received_date DESC
            LIMIT 500
            `,
            params
        );

        return NextResponse.json({ success: true, data: rows }, { headers });
    } catch (err: any) {
        console.error("[collection-details] error:", err);
        return NextResponse.json(
            { success: false, error: err?.message || "Internal server error" },
            { status: 500, headers }
        );
    } finally {
        if (conn) conn.release();
    }
}
