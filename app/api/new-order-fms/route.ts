import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// ─── Cache Config ─────────────────────────────────────────────────────────────
// Each query type gets its own cache slot
const cache: Record<string, { data: any[]; ts: number }> = {};
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return safeDate(val);
    return String(val).trim();
}

function safeDate(val: any): string {
    if (!val) return "";
    try {
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return "";
            const p = (n: number) => String(n).padStart(2, "0");
            return `${p(val.getDate())}/${p(val.getMonth() + 1)}/${val.getFullYear()} ${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`;
        }
        const str = String(val).trim();
        // Already in DD/MM/YYYY format (slashes)
        if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;
        // ISO or MySQL datetime YYYY-MM-DD HH:mm:ss
        const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):?(\d{2})?/);
        if (iso) return `${iso[3]}/${iso[2]}/${iso[1]} ${iso[4]}:${iso[5]}:${iso[6] ?? '00'}`;
        // DD-MM-YYYY HH:mm or DD-MM-YYYY HH:mm:ss (stored as string with dashes)
        const dmy = str.match(/^(\d{2})-(\d{2})-(\d{4})[\s,T]?(\d{2})?:?(\d{2})?:?(\d{2})?/);
        if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]} ${dmy[4] ?? '00'}:${dmy[5] ?? '00'}:${dmy[6] ?? '00'}`;
        return str;
    } catch {
        return "";
    }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

/**
 * gettabledata — base order row from orders_fms
 * Returns the core Order fields. The hook's buildBaseOrder() reads these.
 */
function mapBaseOrder(row: any): object {
    return {
        id: row.id ?? null,
        timestamp: safeDate(row.timestamp),
        buyer_id: safeStr(row.buyer_id),
        order_id: safeStr(row.order_id),
        client_name: safeStr(row.client_name),
        mobile: safeStr(row.mobile),
        email: safeStr(row.email),
        billing_type: safeStr(row.billing_type),
        order_type: safeStr(row.order_type),
        billing_address: safeStr(row.billing_address),
        shipping_address: safeStr(row.shipping_address),
        invoice_amount: row.invoice_amount ?? null,
        total_amount_before_discount: row.total_amount_before_discount ?? null,
        uploaded_image_link: safeStr(row.uploaded_image_link),
        payment_terms: safeStr(row.payment_terms),
        payment_collection_date: safeDate(row.payment_collection_date),
        order_taken_by: safeStr(row.order_taken_by),
        whatsapp_sms: safeStr(row.whatsapp_sms),
        pi_no: safeStr(row.pi_no),
        pi_url: safeStr(row.pi_url),
        order_status: safeStr(row.order_status),
        fms_user_name: safeStr(row.fms_user_name),
        edit_order_link: safeStr(row.edit_order_link),
        dispatch_from: safeStr(row.dispatch_from),
    };
}

/**
 * orderverifystatus — Stage 0
 * Uses root columns of orders_fms
 */
function mapOrderVerify(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        planned: safeDate(row.planned),
        actual: safeDate(row.actual),
        time_delay: safeStr(row.time_delay),
        fms_user_name: safeStr(row.fms_user_name),
        order_status: safeStr(row.order_status),
        edit_order_link: safeStr(row.edit_order_link),
        shipping_address_changed: safeStr(row.shipping_address_changed),
        updated_address: safeStr(row.updated_address),
        dispatch_from: safeStr(row.dispatch_from),
        whatsapp_status: safeStr(row.whatsapp_status),
        remarks: safeStr(row.remarks),
    };
}

/**
 * inventorydata — Stage 1
 * Uses DispatchVerFMS_* columns of orders_fms
 */
function mapInventory(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        DispatchVerFMS_planned: safeDate(row.DispatchVerFMS_planned),
        DispatchVerFMS_actual: safeDate(row.DispatchVerFMS_actual),
        DispatchVerFMS_time_delay: safeStr(row.DispatchVerFMS_time_delay),
        DispatchVerFMS_fms_users_name: safeStr(row.DispatchVerFMS_fms_users_name),
        DispatchVerFMS_order_status: safeStr(row.DispatchVerFMS_order_status),
        DispatchVerFMS_edit_order_link: safeStr(row.DispatchVerFMS_edit_order_link),
        DispatchVerFMS_delivery_note_no: safeStr(row.DispatchVerFMS_delivery_note_no),
        DispatchVerFMS_dn_url: safeStr(row.DispatchVerFMS_dn_url),
        DispatchVerFMS_dispatch_from: safeStr(row.DispatchVerFMS_dispatch_from),
        DispatchVerFMS_whatsapp_status: safeStr(row.DispatchVerFMS_whatsapp_status),
        DispatchVerFMS_transfer_to_accounts_status: safeStr(row.DispatchVerFMS_transfer_to_accounts_status),
        DispatchVerFMS_helping_ticket_status: safeStr(row.DispatchVerFMS_helping_ticket_status),
    };
}

/**
 * paymentdata — Stage 2
 * Uses AccoutsVerFMS_* columns of orders_fms
 */
function mapPayment(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        AccoutsVerFMS_planned: safeDate(row.AccoutsVerFMS_planned),
        AccoutsVerFMS_actual: safeDate(row.AccoutsVerFMS_actual),
        AccoutsVerFMS_time_delay: safeStr(row.AccoutsVerFMS_time_delay),
        AccoutsVerFMS_fms_users_name: safeStr(row.AccoutsVerFMS_fms_users_name),
        AccoutsVerFMS_order_status: safeStr(row.AccoutsVerFMS_order_status),
        AccoutsVerFMS_edit_order_link: safeStr(row.AccoutsVerFMS_edit_order_link),
        AccoutsVerFMS_invoice_no: safeStr(row.AccoutsVerFMS_invoice_no),
        AccoutsVerFMS_invoice_link: safeStr(row.AccoutsVerFMS_invoice_link),
        AccoutsVerFMS_eway_bill_no: safeStr(row.AccoutsVerFMS_eway_bill_no),
        AccoutsVerFMS_dispatch_from: safeStr(row.AccoutsVerFMS_dispatch_from),
        AccoutsVerFMS_whatsapp_status: safeStr(row.AccoutsVerFMS_whatsapp_status),
        AccoutsVerFMS_transfer_to_dispatch_fms: safeStr(row.AccoutsVerFMS_transfer_to_dispatch_fms),
        AccoutsVerFMS_transfer_to_collection_fms: safeStr(row.AccoutsVerFMS_transfer_to_collection_fms),
        AccoutsVerFMS_advance_payment_collection: safeStr(row.AccoutsVerFMS_advance_payment_collection),
        AccoutsVerFMS_helping_ticket_status: safeStr(row.AccoutsVerFMS_helping_ticket_status),
    };
}

/**
 * orderpackingdata — Stage 3
 * Uses packing_slip_fillup_generate_* columns of dispatch_fms_factory
 */
function mapPacking(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        packing_slip_fillup_generate_planned: safeDate(row.packing_slip_fillup_generate_planned),
        packing_slip_fillup_generate_actual: safeDate(row.packing_slip_fillup_generate_actual),
        packing_slip_fillup_generate_time_delay: safeStr(row.packing_slip_fillup_generate_time_delay),
        packing_slip_fillup_generate_packing_slip_form_link: safeStr(row.packing_slip_fillup_generate_packing_slip_form_link),
        packing_slip_fillup_generate_dispatch_form_courier_details: safeStr(row.packing_slip_fillup_generate_dispatch_form_courier_details),
        packing_slip_fillup_generate_dispatch_form_packing_details: safeStr(row.packing_slip_fillup_generate_dispatch_form_packing_details),
        packing_slip_fillup_generate_state: safeStr(row.packing_slip_fillup_generate_state),
        packing_slip_fillup_generate_lead_status_update: safeStr(row.packing_slip_fillup_generate_lead_status_update),
        packing_slip_fillup_generate_address_address_verify_remarks: safeStr(row.packing_slip_fillup_generate_address_address_verify_remarks),
        packing_slip_fillup_generate_post_data_to_dialer_status: safeStr(row.packing_slip_fillup_generate_post_data_to_dialer_status),
        packing_slip_fillup_generate_packing_list: safeStr(row.packing_slip_fillup_generate_packing_list),
        packing_slip_fillup_generate_packing_stickers: safeStr(row.packing_slip_fillup_generate_packing_stickers),
        packing_slip_fillup_generate_stage_allowed_users: safeStr(row.packing_slip_fillup_generate_stage_allowed_users),
    };
}

/**
 * qcverifystatusdata — Stage 4
 * Uses pre_dispatch_packaging_qc_* + debit_note_stock_replacement_qc_image_* from dispatch_fms_factory
 */
function mapQC(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        pre_dispatch_packaging_qc_planned: safeDate(row.pre_dispatch_packaging_qc_planned),
        pre_dispatch_packaging_qc_actual: safeDate(row.pre_dispatch_packaging_qc_actual),
        pre_dispatch_packaging_qc_time_delay: safeStr(row.pre_dispatch_packaging_qc_time_delay),
        pre_dispatch_packaging_qc_remarks: safeStr(row.pre_dispatch_packaging_qc_remarks),
        pre_dispatch_packaging_qc_status: safeStr(row.pre_dispatch_packaging_qc_status),
        pre_dispatch_packaging_qc_details_upload_url: safeStr(row.pre_dispatch_packaging_qc_details_upload_url),
        pre_dispatch_packaging_qc_stage_allowed_users: safeStr(row.pre_dispatch_packaging_qc_stage_allowed_users),
        debit_note_stock_replacement_qc_image_1: safeStr(row.debit_note_stock_replacement_qc_image_1),
        debit_note_stock_replacement_qc_image_2: safeStr(row.debit_note_stock_replacement_qc_image_2),
        debit_note_stock_replacement_qc_image_3: safeStr(row.debit_note_stock_replacement_qc_image_3),
    };
}

/**
 * addressreverifydata — Stage 5
 * Uses address_reverify_status_* + AddressUpdateFMS_* from orders_fms
 */
function mapAddressReverify(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        address_reverify_status_planned_crr: safeDate(row.address_reverify_status_planned_crr),
        address_reverify_status_actual_crr: safeDate(row.address_reverify_status_actual_crr),
        address_reverify_status_time_delay_crr: safeStr(row.address_reverify_status_time_delay_crr),
        address_reverify_status_address_verified_status: safeStr(row.address_reverify_status_address_verified_status),
        address_reverify_status_pincode: safeStr(row.address_reverify_status_pincode),
        address_reverify_allowed_users: safeStr(row.address_reverify_allowed_users),
        AddressUpdateFMS_shipping_address_changed_status: safeStr(row.AddressUpdateFMS_shipping_address_changed_status),
        AddressUpdateFMS_updated_shipping_address: safeStr(row.AddressUpdateFMS_updated_shipping_address),
        AddressUpdateFMS_remarks: safeStr(row.AddressUpdateFMS_remarks),
        AddressUpdateFMS_order_status: safeStr(row.AddressUpdateFMS_order_status),
    };
}

/**
 * dispatchstatusdata — Stage 6
 * Uses dispatch_to_clients_* + debit_note_stock_replacement_dispatch_image from dispatch_fms_factory
 */
function mapDispatch(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        dispatch_to_clients_planned: safeDate(row.dispatch_to_clients_planned),
        dispatch_to_clients_actual: safeDate(row.dispatch_to_clients_actual),
        dispatch_to_clients_time_delay: safeStr(row.dispatch_to_clients_time_delay),
        dispatch_to_clients_remarks: safeStr(row.dispatch_to_clients_remarks),
        dispatch_to_clients_status: safeStr(row.dispatch_to_clients_status),
        dispatch_to_clients_details_upload_url: safeStr(row.dispatch_to_clients_details_upload_url),
        dispatch_to_clients_stage_allowed_users: safeStr(row.dispatch_to_clients_stage_allowed_users),
        debit_note_stock_replacement_dispatch_image: safeStr(row.debit_note_stock_replacement_dispatch_image),
    };
}

/**
 * trackingupdatestatusdata — Stage 7
 * Uses enter_tracking_details_* from dispatch_fms_factory
 */
function mapTracking(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        enter_tracking_details_planned: safeDate(row.enter_tracking_details_planned),
        enter_tracking_details_actual: safeDate(row.enter_tracking_details_actual),
        enter_tracking_details_time_delay: safeStr(row.enter_tracking_details_time_delay),
        enter_tracking_details_tracking_url: safeStr(row.enter_tracking_details_tracking_url),
        enter_tracking_details_tracking_id: safeStr(row.enter_tracking_details_tracking_id),
        enter_tracking_details_dispatch_through: safeStr(row.enter_tracking_details_dispatch_through),
        enter_tracking_details_stage_allowed_users: safeStr(row.enter_tracking_details_stage_allowed_users),
    };
}

/**
 * stockdeductionstatusdata — Stage 8
 * Uses dispatch_to_clients_* from dispatch_fms_factory
 * Return the raw stage data and let the hook/UI decide whether it is completed.
 */
function mapStockDeduction(row: any): object {
    return {
        order_id: safeStr(row.order_id),
        dispatch_to_clients_planned: safeDate(row.dispatch_to_clients_planned),
        dispatch_to_clients_actual: safeDate(row.dispatch_to_clients_actual),
        dispatch_to_clients_time_delay: safeStr(row.dispatch_to_clients_time_delay),
        dispatch_to_clients_remarks: safeStr(row.dispatch_to_clients_remarks),
        dispatch_to_clients_status: safeStr(row.dispatch_to_clients_status),
        dispatch_to_clients_details_upload_url: safeStr(row.dispatch_to_clients_details_upload_url),
        dispatch_to_clients_stage_allowed_users: safeStr(row.dispatch_to_clients_stage_allowed_users),
    };
}

// ─── Query Definitions ────────────────────────────────────────────────────────

const QUERIES: Record<string, { sql: string; mapper: (row: any) => object }> = {

    // Base table — all orders
    gettabledata: {
        sql: `
            SELECT
                id, timestamp, buyer_id, order_id, client_name,
                mobile, email, billing_type, order_type,
                billing_address, shipping_address,
                invoice_amount, total_amount_before_discount,
                uploaded_image_link, payment_terms,
                payment_collection_date, order_taken_by,
                whatsapp_sms, pi_no, pi_url,
                order_status, fms_user_name,
                edit_order_link, dispatch_from
            FROM orders_fms
            ORDER BY id DESC
        `,
        mapper: mapBaseOrder,
    },

    // Stage 0 — Order Verify Status (orders_fms root columns)
    orderverifystatus: {
        sql: `
            SELECT
                order_id, planned, actual, time_delay,
                fms_user_name, order_status, edit_order_link,
                shipping_address_changed, updated_address,
                dispatch_from, whatsapp_status, remarks
            FROM orders_fms
            WHERE order_id IS NOT NULL AND order_id != ''
            ORDER BY id DESC
        `,
        mapper: mapOrderVerify,
    },

    // Stage 1 — Inventory Verify Status (DispatchVerFMS_* columns)
    inventorydata: {
        sql: `
            SELECT
                order_id,
                DispatchVerFMS_planned,
                DispatchVerFMS_actual,
                DispatchVerFMS_time_delay,
                DispatchVerFMS_fms_users_name,
                DispatchVerFMS_order_status,
                DispatchVerFMS_edit_order_link,
                DispatchVerFMS_delivery_note_no,
                DispatchVerFMS_dn_url,
                DispatchVerFMS_dispatch_from,
                DispatchVerFMS_whatsapp_status,
                DispatchVerFMS_transfer_to_accounts_status,
                DispatchVerFMS_helping_ticket_status
            FROM orders_fms
            WHERE DispatchVerFMS_actual IS NOT NULL
               OR DispatchVerFMS_order_status IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapInventory,
    },

    // Stage 2 — Payment Verify Status (AccoutsVerFMS_* columns)
    paymentdata: {
        sql: `
            SELECT
                order_id,
                AccoutsVerFMS_planned,
                AccoutsVerFMS_actual,
                AccoutsVerFMS_time_delay,
                AccoutsVerFMS_fms_users_name,
                AccoutsVerFMS_order_status,
                AccoutsVerFMS_edit_order_link,
                AccoutsVerFMS_invoice_no,
                AccoutsVerFMS_invoice_link,
                AccoutsVerFMS_eway_bill_no,
                AccoutsVerFMS_dispatch_from,
                AccoutsVerFMS_whatsapp_status,
                AccoutsVerFMS_transfer_to_dispatch_fms,
                AccoutsVerFMS_transfer_to_collection_fms,
                AccoutsVerFMS_advance_payment_collection,
                AccoutsVerFMS_helping_ticket_status
            FROM orders_fms
            WHERE AccoutsVerFMS_actual IS NOT NULL
               OR AccoutsVerFMS_order_status IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapPayment,
    },

    // Stage 3 — Order Packing Status (dispatch_fms_factory)
    orderpackingdata: {
        sql: `
            SELECT
                order_id,
                packing_slip_fillup_generate_planned,
                packing_slip_fillup_generate_actual,
                packing_slip_fillup_generate_time_delay,
                packing_slip_fillup_generate_packing_slip_form_link,
                packing_slip_fillup_generate_dispatch_form_courier_details,
                packing_slip_fillup_generate_dispatch_form_packing_details,
                packing_slip_fillup_generate_state,
                packing_slip_fillup_generate_lead_status_update,
                packing_slip_fillup_generate_address_address_verify_remarks,
                packing_slip_fillup_generate_post_data_to_dialer_status,
                packing_slip_fillup_generate_packing_list,
                packing_slip_fillup_generate_packing_stickers,
                packing_slip_fillup_generate_stage_allowed_users
            FROM dispatch_fms_factory
            WHERE packing_slip_fillup_generate_actual IS NOT NULL
               OR packing_slip_fillup_generate_post_data_to_dialer_status IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapPacking,
    },

    // Stage 4 — QC Verify Status (dispatch_fms_factory)
    qcverifystatusdata: {
        sql: `
            SELECT
                order_id,
                pre_dispatch_packaging_qc_planned,
                pre_dispatch_packaging_qc_actual,
                pre_dispatch_packaging_qc_time_delay,
                pre_dispatch_packaging_qc_remarks,
                pre_dispatch_packaging_qc_status,
                pre_dispatch_packaging_qc_details_upload_url,
                pre_dispatch_packaging_qc_stage_allowed_users,
                debit_note_stock_replacement_qc_image_1,
                debit_note_stock_replacement_qc_image_2,
                debit_note_stock_replacement_qc_image_3
            FROM dispatch_fms_factory
            WHERE pre_dispatch_packaging_qc_actual IS NOT NULL
               OR pre_dispatch_packaging_qc_status IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapQC,
    },

    // Stage 5 — Address ReVerify Status (orders_fms)
    addressreverifydata: {
        sql: `
            SELECT
                order_id,
                address_reverify_status_planned_crr,
                address_reverify_status_actual_crr,
                address_reverify_status_time_delay_crr,
                address_reverify_status_address_verified_status,
                address_reverify_status_pincode,
                address_reverify_allowed_users,
                AddressUpdateFMS_shipping_address_changed_status,
                AddressUpdateFMS_updated_shipping_address,
                AddressUpdateFMS_remarks,
                AddressUpdateFMS_order_status
            FROM orders_fms
            WHERE address_reverify_status_actual_crr IS NOT NULL
               OR AddressUpdateFMS_order_status IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapAddressReverify,
    },

    // Stage 6 — Dispatch Status (dispatch_fms_factory)
    dispatchstatusdata: {
        sql: `
            SELECT
                order_id,
                dispatch_to_clients_planned,
                dispatch_to_clients_actual,
                dispatch_to_clients_time_delay,
                dispatch_to_clients_remarks,
                dispatch_to_clients_status,
                dispatch_to_clients_details_upload_url,
                dispatch_to_clients_stage_allowed_users,
                debit_note_stock_replacement_dispatch_image
            FROM dispatch_fms_factory
            WHERE dispatch_to_clients_actual IS NOT NULL
               OR dispatch_to_clients_status IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapDispatch,
    },

    // Stage 7 — Tracking Update Status (dispatch_fms_factory)
    trackingupdatestatusdata: {
        sql: `
            SELECT
                order_id,
                enter_tracking_details_planned,
                enter_tracking_details_actual,
                enter_tracking_details_time_delay,
                enter_tracking_details_tracking_url,
                enter_tracking_details_tracking_id,
                enter_tracking_details_dispatch_through,
                enter_tracking_details_stage_allowed_users
            FROM dispatch_fms_factory
            WHERE enter_tracking_details_actual IS NOT NULL
               OR enter_tracking_details_tracking_id IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapTracking,
    },

    // Stage 8 — Stock Deduction Status (dispatch_fms_factory)
    // Return all relevant rows; completion is derived later from the stage values.
    stockdeductionstatusdata: {
        sql: `
            SELECT
                order_id,
                dispatch_to_clients_planned,
                dispatch_to_clients_actual,
                dispatch_to_clients_time_delay,
                dispatch_to_clients_remarks,
                dispatch_to_clients_status,
                dispatch_to_clients_details_upload_url,
                dispatch_to_clients_stage_allowed_users
            FROM dispatch_fms_factory
            WHERE dispatch_to_clients_actual IS NOT NULL
               OR dispatch_to_clients_status IS NOT NULL
               OR dispatch_to_clients_remarks IS NOT NULL
            ORDER BY id DESC
        `,
        mapper: mapStockDeduction,
    },
};

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") ?? "";
        const force = searchParams.get("force") === "1";

        // Validate type
        if (!type || !QUERIES[type]) {
            return NextResponse.json(
                { error: `Unknown type: "${type}". Valid types: ${Object.keys(QUERIES).join(", ")}` },
                { status: 400, headers: noStoreHeaders }
            );
        }

        const now = Date.now();

        // Cache check (per type)
        if (!force && cache[type] && cache[type].data.length > 0 && now - cache[type].ts < CACHE_TTL) {
            return NextResponse.json({ data: cache[type].data }, { headers: noStoreHeaders });
        }

        // Query MySQL
        const pool = await getPool();
        const connection = await pool.getConnection();
        let rows: any[];

        try {
            [rows] = await connection.execute(QUERIES[type].sql) as any[];
        } finally {
            connection.release();
        }

        const mapped = (rows as any[]).map(QUERIES[type].mapper);

        // Save to cache
        cache[type] = { data: mapped, ts: Date.now() };

        return NextResponse.json({ data: mapped }, { headers: noStoreHeaders });

    } catch (error: any) {
        console.error("[new-order-fms] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch FMS data", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
