import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// ─── Types (matches InvoiceHistoryPopup's InvoiceRow) ─────────────────────────

interface InvoiceRow {
    bookingId: string;
    rowNumber: number;
    invoiceNumber: string;
    invoiceUrl: string;
    timesGenerated: number;
    piDate: string;
    editByPMS: boolean;
    editByHTMLForm: boolean;
    editBy: string;
    invoiceAmount: number;
}

interface InvoiceFormatDbRow {
    booking_id: string | null;
    sheet_row_number: number | null;
    invoice_number: string | null;
    invoice_url_new: string | null;
    invoice_url: string | null;
    how_many_times_generated: number | null;
    edit_date: Date | string | null;
    edit_from: string | null;
    edit_by: string | null;
    invoice_amount: number | string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPiDate(value: Date | string | null): string {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);

    // IST formatting: dd-MM-yy HH:mm:ss (matches old GAS Utilities.formatDate output)
    const istString = d.toLocaleString("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    // en-GB gives "dd/mm/yy, HH:mm:ss" -> convert to "dd-MM-yy HH:mm:ss"
    return istString.replace(",", "").replace(/\//g, "-");
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const bookingId = searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json(
                { error: "bookingId query parameter is required" },
                { status: 400 }
            );
        }

        const pool = await getPool();

        const [rows] = await pool.query(
            `SELECT
                booking_id,
                sheet_row_number,
                invoice_number,
                invoice_url_new,
                invoice_url,
                how_many_times_generated,
                edit_date,
                edit_from,
                edit_by,
                invoice_amount
             FROM ktahv_invoicing_format
             WHERE booking_id = ?
             ORDER BY sheet_row_number ASC`,
            [bookingId]
        );

        const dbRows = rows as InvoiceFormatDbRow[];

        const invoiceRows: InvoiceRow[] = dbRows.map((row) => {
            const editFrom = String(row.edit_from ?? "").toLowerCase();

            return {
                bookingId: row.booking_id ?? "",
                rowNumber: row.sheet_row_number ?? 0,
                invoiceNumber: row.invoice_number ?? "",
                // invoice_url_new is the field that was historically shown as the clickable link
                invoiceUrl: row.invoice_url_new || row.invoice_url || "",
                timesGenerated: row.how_many_times_generated ?? 0,
                piDate: formatPiDate(row.edit_date),
                editByPMS: editFrom.indexOf("pms") > -1,
                editByHTMLForm: editFrom.indexOf("edit") > -1,
                editBy: row.edit_by ?? "",
                invoiceAmount: row.invoice_amount ? Number(row.invoice_amount) : 0,
            };
        });

        return NextResponse.json({ rows: invoiceRows });
    } catch (error) {
        console.error("Error fetching invoice history:", error);
        return NextResponse.json(
            { error: "Failed to fetch invoice history" },
            { status: 500 }
        );
    }
}