import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureAccountTrackerManagementColumns } from './db-init'

// ─── Date formatter → "DD/MM/YYYY" ───────────────────────────────────────────
function fmtDate(val: any): string | null {
    if (!val) return null
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    // The hook expects dd/MM/yyyy. Let's use local time strictly to avoid UTC shift.
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
}

// ─── DateTime formatter → "M/D/YYYY HH:MM:SS" ────────────────────────────────
function fmtDateTime(val: any): string | null {
    if (!val) return null
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '00')}`
}

// ─── Null-safe helpers ────────────────────────────────────────────────────────
const isNullish = (v: any) => v === null || v === undefined || v === '' || v === 'NULL' || v === 'null' || v === '-' || v === '_' || v === 'NA';
const str = (v: any) => isNullish(v) ? '_' : String(v);
const num = (v: any) => isNullish(v) ? null : Number(v);
const pass = (v: any) => isNullish(v) ? null : v;

// ─── Column → API key map ─────────────────────────────────────────────────────
function mapRow(row: any, index: number) {
    return {
        rowNumber: index + 1,
        generateTimestamp: fmtDate(row.generate_timestamp),
        reservationId: str(row.reservation_id),
        bookingDateTime: fmtDate(row.booking_date_time),
        clientName: str(row.name_of_client),
        mobile: str(row.mobile),
        email: str(row.email),
        billingAddress: str(row.billing_address),
        arrivalDate: fmtDate(row.arrival_date),
        departureDate: fmtDate(row.departure_date),
        daysOfStay: str(row.days_of_stay),
        packageType: str(row.package_type),
        programmePackageName: str(row.programme_package_name),
        roomNo: str(row.room_no),
        roomType: str(row.room_type),
        roomCategory: str(row.room_category),
        bookingStatus: str(row.booking_status),
        bookingMonth: str(row.booking_month),
        piAmountSales: num(row.pi_amount_sales),
        piUrl: str(row.pi_url),
        invoiceAmount: num(row.invoice_amount),
        additionalAmount: num(row.additional_amount),
        totalInvoiceAmount: num(row.total_invoice_amount),
        invoiceUrl: str(row.invoice_url),
        amountReceivedTotal: num(row.amount_received_bank_cash_total),
        amountProofLink: str(row.amount_received_proof_image_link),
        checkoutMonth: str(row.checkout_month),
        // Stage 1
        planned: fmtDateTime(row.stage1_planned),
        actual: fmtDateTime(row.stage1_actual),
        actualRaw: pass(row.stage1_actual),
        timeDelay: pass(row.stage1_time_delay),
        doer: pass(row.stage1_doer),
        verifyStatus: pass(row.stage1_verify_status),
        amountDifferenceReason: str(row.stage1_amount_difference_reason),
        correctName: str(row.stage1_corrected_client_name),
        remarks: str(row.stage1_remarks),
        // Stage 2
        invoiceAmountTally: num(row.stage2_invoice_amount_as_per_tally),
        totalReceivedBank: num(row.stage2_total_received_amount_bank_date),
        differenceAmt: num(row.stage2_difference_amt),
        differencePercent: num(row.stage2_difference_percent),
        managementVerify: row.management_verify === null ? null : Boolean(Number(row.management_verify)),
        managementRemarks: str(row.management_remarks),
        managementVerifiedBy: str(row.management_verified_by),
        managementVerifiedAt: fmtDateTime(row.management_verified_at),
        // Stage 3
        helpSlipCreatedStatus: pass(row.stage3_help_slip_created_status),
        helpSlipId: str(row.stage3_help_slip_id),
        helpSlipRemarks: str(row.stage3_help_slip_remarks),
        bookingtakenby: pass(row.booking_taken_by),
    }
}

export async function GET(req: NextRequest) {
    try {
        await ensureAccountTrackerManagementColumns()
        const pool = await getPool()

        const [result] = await pool.execute(`
            SELECT
                id,
                generate_timestamp, reservation_id, booking_date_time,
                name_of_client, mobile, email, billing_address,
                arrival_date, departure_date, days_of_stay,
                package_type, programme_package_name,
                room_no, room_type, room_category,
                booking_status, booking_month,
                pi_amount_sales, pi_url,
                invoice_amount, additional_amount, total_invoice_amount, invoice_url,
                amount_received_bank_cash_total, amount_received_proof_image_link,
                checkout_month, booking_taken_by,
                stage1_planned, stage1_actual, stage1_time_delay, stage1_doer,
                stage1_verify_status, stage1_amount_difference_reason,
                stage1_corrected_client_name, stage1_remarks,
                stage2_invoice_amount_as_per_tally, stage2_total_received_amount_bank_date,
                stage2_difference_amt, stage2_difference_percent,
                management_verify, management_remarks, management_verified_by, management_verified_at,
                stage3_help_slip_created_status, stage3_help_slip_id, stage3_help_slip_remarks
            FROM ktahv_account_tracker
            ORDER BY booking_date_time DESC
        `) as any[]

        const rows = result as any[]

        return NextResponse.json({
            success: true,
            data: rows.map((row: any, i: number) => mapRow(row, i)),
        })

    } catch {
        console.error('[account-tracker API] request failed')
        return NextResponse.json(
            { success: false, error: 'Failed to fetch account tracker data' },
            { status: 500 }
        )
    }
}
