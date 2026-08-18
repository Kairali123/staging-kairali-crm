"use client"

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export interface StageDetails {
    planned?: string;
    actual?: string;
    delay?: string;
    user?: string;
    status?: string;
    [key: string]: any;
}

export interface Order {
    id: number;
    timestamp: string;
    actual: string;
    buyerId: string;
    orderId: string;
    name: string;
    mobile: string;
    email: string;
    billingType: string;
    orderType: string;
    billingAddress: string;
    shippingAddress: string;
    invoiceAmount: string;
    totalAmtBeforeDiscount: string;
    uploadedImageLink: string;
    paymentTerms: string;
    paymentCollectionDate: string;
    orderTakenBy: string;
    whatsappSMS: string;
    piLink: string;
    piUrl: string;
    orderStatus: string;
    planned: string;
    actualDelay: string;
    fmsUserName: string;
    activeStage: number;
    status?: 'Cancelled' | 'Hold' | 'Normal';
    editOrderLink?: string;
    dispatch?: string;

    advancePaymentLink?: string;
    whatsappStatus?: string;
    remarkPiHistory?: string;
    trftoDispatchStatus?: string;
    helpingTicketStatus?: string;
    expectedDispatchDate?: string;
    cod?: string;
    codConfirmationStatus?: string;
    shippingAddressChanged?: string;
    updatedAddress?: string;
    deliveryNoteNo?: string;
    dnUrlRemarks?: string;
    invoiceNo?: string;
    invoiceLink?: string;
    ewayBillNo?: string;
    ewayBillUrl?: string;

    packingStatus?: string;
    packingSlip?: string;
    packinglist?: string;
    packingsticker?: string;
    dispatchFormCourier?: string;
    dispatchFromPacking?: string;
    packingState?: string;
    updateLeadStatus?: string;
    packingRemarks?: string;

    qcStatus?: string;
    dispatchDoc?: string;
    qcImage1?: string;
    qcImage2?: string;
    qcImage3?: string;
    qcDoer?: string;
    qcRemarks?: string;

    addressVerifyStatus?: string;
    addressChanged?: string;
    newAddress?: string;
    addressRemarks?: string;
    eshopboxUpdated?: string;
    shopifyUpdated?: string;

    dispatchStatus?: string;
    dispatchRemarks?: string;
    imsStockLink?: string;
    dispatchImage?: string;

    trackingId?: string;
    dispatchThrough?: string;
    trackingUrl?: string;

    deductionStatus?: string;
    deductedBy?: string;
    deductionDate?: string;

    stages: Record<number, StageDetails>;
}

/* ─────────────────────────────────────────────
   API CONFIG
───────────────────────────────────────────── */
// const API_URL =
//     'https://script.google.com/macros/s/AKfycbwaNGxqJU1MnCFCu6oTAF4Yd-Qh2gsl2LEZ_zdndqfzSctoPs7jG7MwZSgWfzPK4qIyGQ/exec';

const API_URL = '/api/new-order-fms';

const STAGE_APIS = [
    { type: 'orderverifystatus', index: 0 },
    { type: 'inventorydata', index: 1 },
    { type: 'paymentdata', index: 2 },
    { type: 'orderpackingdata', index: 3 },
    { type: 'qcverifystatusdata', index: 4 },
    { type: 'addressreverifydata', index: 5 },
    { type: 'dispatchstatusdata', index: 6 },
    { type: 'trackingupdatestatusdata', index: 7 },
    { type: 'stockdeductionstatusdata', index: 8 },
];

const BATCH_SIZE = 100;
const FETCH_TIMEOUT_MS = 60000;


function extractDataArray(json: any): any[] {
    if (!json || typeof json !== 'object') return [];
    // Try standard `data` or `records` or `rows` first
    const primaryKeys = ['data', 'records', 'rows', 'orders', 'details'];
    for (const k of primaryKeys) {
        if (Array.isArray(json[k]) && json[k].length > 0) return json[k];
    }

    // Find the largest array (likely the main data)
    let bestKey = '';
    let maxLen = -1;

    for (const k of Object.keys(json)) {
        const val = json[k];
        if (Array.isArray(val) && k !== 'success' && !k.toLowerCase().includes('count')) {
            if (val.length > maxLen) {
                maxLen = val.length;
                bestKey = k;
            }
        }
    }

    if (bestKey) return json[bestKey];

    // Fallback: if the json itself is an array
    if (Array.isArray(json)) return json;

    return [];
}

/* ─────────────────────────────────────────────
   FETCH WITH TIMEOUT
───────────────────────────────────────────── */
async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    if (signal) {
        signal.addEventListener('abort', () => controller.abort());
    }

    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/* ─────────────────────────────────────────────
   SAFE HELPERS
───────────────────────────────────────────── */
function s(v: any): string {
    if (v === undefined || v === null) return '';
    const val = String(v).trim();
    if (val === 'undefined' || val === 'null') return '';
    return val;
}

function cleanVal(v: any): string | undefined {
    const val = s(v);
    if (!val || val === '-' || val === '—' || val === '_' || val === 'N/A' || val === '#N/A') return undefined;
    return val;
}

function fmtCurrency(val: any): string {
    if (!val) return '';
    const n = parseFloat(String(val).replace(/[^\d.]/g, ''));
    return isNaN(n) || n === 0 ? '' : `\u20B9${Math.round(n).toLocaleString('en-IN')}`;
}

/** Robustly find a value in an object using case-insensitive key matching and ignoring spaces/_ */
function findValue(obj: any, targetKey: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const normalizedTarget = targetKey.toLowerCase().replace(/[\s_-]/g, '');

    // Check direct match first
    if (obj[targetKey] !== undefined) return obj[targetKey];

    // Check normalized match
    for (const k of Object.keys(obj)) {
        if (k.toLowerCase().replace(/[\s_-]/g, '') === normalizedTarget) {
            return obj[k];
        }
    }
    return undefined;
}

/* ─────────────────────────────────────────────
   DATE / TIME HELPERS
   Handles both DD/MM/YYYY and M/D/YYYY formats
───────────────────────────────────────────── */
function parseCustomDate(raw: string): Date {
    if (!raw || raw.trim() === '' || raw === '—') return new Date(NaN);
    const str = raw.trim();

    const parts = str.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '';
    const dp = datePart.split('/');

    if (dp.length === 3) {
        const p0 = parseInt(dp[0], 10);
        const p1 = parseInt(dp[1], 10);
        const p2 = parseInt(dp[2], 10);

        // route.ts always outputs DD/MM/YYYY from MySQL via safeDate().
        // Only treat as MM/DD/YYYY if p0 is unambiguously a month (p0 <= 12)
        // AND p1 > 12 (meaning p1 cannot be a month, so p1 must be a day → M/D/YYYY).
        // In all other cases (including ambiguous p0 <= 12, p1 <= 12), default to DD/MM/YYYY.
        let d: number, m: number, y: number;
        if (dp[2].length === 4) {
            y = p2;
            if (p1 > 12) {
                // p1 can't be a month → must be M/D/YYYY (Google Sheets style)
                m = p0; d = p1;
            } else {
                // Default: DD/MM/YYYY (MySQL / route.ts output)
                d = p0; m = p1;
            }
        } else {
            // Fallback: DD/MM/YY
            d = p0; m = p1; y = p2;
        }

        const date = new Date(y, m - 1, d);
        if (timePart) {
            const tp = timePart.split(':');
            date.setHours(parseInt(tp[0], 10) || 0, parseInt(tp[1], 10) || 0, parseInt(tp[2], 10) || 0, 0);
        }
        return date;
    }

    return new Date(str);
}

function formatDate(raw: any): string {
    const str = s(raw);
    if (!str || str === '—') return '—';
    try {
        const d = parseCustomDate(str);
        if (isNaN(d.getTime())) return str;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
    } catch {
        return str;
    }
}

function formatDelay(a: string, p: string): string {
    if (!a || !p || a === '—' || p === '—') return '—';
    const da = parseCustomDate(a);
    const dp2 = parseCustomDate(p);
    if (isNaN(da.getTime()) || isNaN(dp2.getTime())) return '—';
    const diff = da.getTime() - dp2.getTime();
    const sign = diff < 0 ? '-' : '';
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const sec = Math.floor((abs % 60000) / 1000);
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}


function resolveOrderId(item: any, knownIds?: Set<string>): string {
    if (!item) return '';

    // Direct fields (common field names)
    // const idFields = [
    //     'orderId', 'orderid', 'OrderId', 'ORDER_ID', 'oid', 'OID', 'Oid',
    //     'piNo', 'pino', 'PINo', 'PI_No', 'pi_no',
    //     'id', 'ID', 'Id', 'rowIndex'
    // ];

    const idFields = [
        'orderId', 'orderid', 'OrderId', 'ORDER_ID', 'order_id',
        'oid', 'OID', 'Oid',
        'piNo', 'pino', 'PINo', 'PI_No', 'pi_no',
        'id', 'ID', 'Id', 'rowIndex'
    ];

    for (const f of idFields) {
        const v = s(item[f]);
        // Order IDs like OID_123 or even numeric strings > 2 digits
        if (v.length >= 3) {
            const upper = v.toUpperCase();
            if (!knownIds || knownIds.has(upper)) return upper;

            // Check for common patterns like OID_123, IN123, SO123
            const m = upper.match(/(OID_|IN|SO|ORD)\d+/);
            if (m && (!knownIds || knownIds.has(m[0]))) return m[0];
        }
    }

    // OID_ in URL fields
    const urlFields = ['piUrl', 'piurl', 'piLink', 'pilink', 'editOrderLink', 'editorderlink', 'url', 'link'];
    for (const f of urlFields) {
        const v = s(item[f]);
        if (v) {
            const m = v.match(/OID_\d+/i);
            if (m) {
                const oid = m[0].toUpperCase();
                if (!knownIds || knownIds.has(oid)) return oid;
            }
        }
    }

    // Deep scan all values
    if (knownIds) {
        for (const val of Object.values(item)) {
            if (val === null || val === undefined) continue;
            const vStr = String(val).trim().toUpperCase();

            // Exact match
            if (knownIds.has(vStr)) return vStr;

            // Pattern match inside string
            const m = vStr.match(/(OID_|IN|SO|ORD)\d+/);
            if (m && knownIds.has(m[0])) return m[0];
        }
    }

    return '';
}

/* ─────────────────────────────────────────────
   BUILD BASE ORDER from gettabledata row
───────────────────────────────────────────── */
function buildBaseOrder(item: any, oid: string): Order {
    const rawStatus = s(item.orderStatus ?? item.orderstatus ?? item.orderstaus ?? item.order_status).toLowerCase();
    const hasEditLink = item.editOrderLink && String(item.editOrderLink).toLowerCase() !== 'no' && item.editOrderLink !== '-' && item.editOrderLink !== '—';

    return {
        id: typeof item.id === 'number' ? item.id : (typeof item.rowIndex === 'number' ? item.rowIndex : Math.random()),
        timestamp: formatDate(item.timestamp),
        actual: '—',
        buyerId: s(item.buyerId ?? item.buyerid ?? item.buyer_id),
        orderId: oid,
        name: s(item.clientName ?? item.client_name ?? item.name) || 'Unknown',
        mobile: s(item.mobile),
        email: s(item.email),
        billingType: s(item.billingType ?? item.billingtype ?? item.billing_type),
        orderType: s(item.orderType ?? item.ordertype ?? item.order_type),
        billingAddress: s(item.billingAddress ?? item.billingaddress ?? item.billing_address),
        shippingAddress: s(item.shippingAddress ?? item.shippingaddress ?? item.shipping_address),
        invoiceAmount: fmtCurrency(item.invoiceAmount ?? item.invoiceamount ?? item.invoice_amount),
        totalAmtBeforeDiscount: fmtCurrency(item.totalAmountBeforeDiscount ?? item.totalamountbeforediscount ?? item.total_amount_before_discount),
        uploadedImageLink: s(item.uploadedImageLink ?? item.uploadedimagelink ?? item.uploaded_image_link),
        paymentTerms: s(item.paymentTerms ?? item.paymentterms ?? item.payment_terms),
        paymentCollectionDate: formatDate(item.paymentCollectionDate ?? item.paymentcollectiondate ?? item.payment_collection_date),
        orderTakenBy: s(item.orderTakenBy ?? item.ordertakenby ?? item.order_taken_by),
        whatsappSMS: s(item.whatsappSMS ?? item.whatsappsms ?? item.whatsapp_sms) || 'Pending',
        piLink: s(item.piNo ?? item.pino ?? item.pi_no),
        piUrl: s(item.piUrl ?? item.piurl ?? item.pi_url),
        orderStatus: s(item.orderStatus ?? item.orderstatus ?? item.orderstaus ?? item.order_status),
        planned: '—',
        actualDelay: '—',
        fmsUserName: s(item.fmsUserName ?? item.fms_user_name ?? item.username),
        activeStage: 0,
        status: ((rawStatus === 'edit order' && hasEditLink) || rawStatus.includes('cancel')) ? 'Cancelled' : rawStatus.includes('hold') ? 'Hold' : 'Normal',
        editOrderLink: s(item.editOrderLink ?? item.edit_order_link ?? item.editorder),
        dispatch: s(item.dispatch ?? item.dispatch_from ?? item.dispatchfrom ?? item.dispactfrom),
        qcImage1: s(findValue(item, 'qcimage1')),
        qcImage2: s(findValue(item, 'qcimage2')),
        qcImage3: s(findValue(item, 'qcimage3')),
        stages: {},
    };
}

/* ─────────────────────────────────────────────
   APPLY STAGE DATA onto matching Order
───────────────────────────────────────────── */
function applyStageData(order: Order, item: any, stageIdx: number): void {
    const actual = formatDate(item.actual ?? item.actualtime ?? item.actualTime ?? item.actual_time ?? item.Actual);
    const planned = formatDate(item.planned ?? item.plannedtime ?? item.plannedTime ?? item.planned_time ?? item.Planned);
    const existing: StageDetails = order.stages[stageIdx] ?? {};

    const rawDelay = s(item.timedelay ?? item.delay ?? item.timeDelay ?? item.TimeDelay);
    const delay = rawDelay || formatDelay(actual, planned) || s(existing.delay) || '—';

    const status = s(
        item.status ??
        item.orderstaus ??
        item.orderStatus ??
        item.orderstatus ??
        item.qcstatus ??
        item.packingstatus ??
        item.addressverifystatus ??
        item.dispatchstatus ??
        item.deductionstatus ??
        item.order_status ??
        existing.status ??
        ''
    );

    // Capture global order fields if present in any stage
    const editLink = s(findValue(item, 'editOrderLink') ?? findValue(item, 'editorder'));
    if (editLink && editLink !== 'No' && editLink !== '-' && editLink !== '—') {
        order.editOrderLink = editLink;
    }
    const os = s(findValue(item, 'orderStatus') ?? findValue(item, 'orderstatus'));
    if (os) order.orderStatus = os;


    const base: StageDetails = {
        ...existing,
        planned: planned !== '—' ? planned : (existing.planned ?? '—'),
        actual: actual !== '—' ? actual : (existing.actual ?? '—'),
        delay,
        status,
        user: s(existing.user),
    };

    /* Stage 0 — Order Verify Status */
    // if (stageIdx === 0) {
    //     base.user = s(item.orderTakenBy ?? item.ordertakenby ?? item.order_taken_by ?? item.fmsUserName ?? item.username ?? item.fmsusername ?? existing.user);
    //     base.dispatch = s(item.dispatch ?? item.dispatchfrom ?? item.dispactfrom ?? item.dispatchFrom ?? item.dispatch_from ?? existing.dispatch);
    //     base.whatsappSMS = s(item.whatsappSMS ?? item.whatsappstatus ?? item.whatsappstaus ?? item.whatsapp_status ?? existing.whatsappSMS);
    //     base.remarkpihistory = s(item.remarkpihistory ?? existing.remarkpihistory);
    //     base.shippingaddresschanged = s(item.shippingaddresschanged ?? existing.shippingaddresschanged);
    //     base.updatedaddress = s(item.updatedaddress ?? existing.updatedaddress);
    //     base.piUrl = s(item.piUrl ?? item.piurl ?? existing.piUrl);
    //     base.invoiceAmount = s(item.invoiceAmount ?? item.invoiceamount ?? existing.invoiceAmount);
    //     base.orderTakenBy = s(item.orderTakenBy ?? item.ordertakenby ?? existing.orderTakenBy);

    //     if (actual !== '—') order.actual = actual;
    //     if (planned !== '—') order.planned = planned;
    //     if (actual !== '—' && planned !== '—') order.actualDelay = formatDelay(actual, planned);
    // }

    if (stageIdx === 0) {
        base.user = s(item.fms_user_name ?? item.orderTakenBy ?? item.ordertakenby ?? item.fmsUserName ?? item.username ?? existing.user);
        base.dispatch = s(item.dispatch_from ?? item.dispatch ?? item.dispatchfrom ?? item.dispatchFrom ?? existing.dispatch);
        base.whatsappSMS = s(item.whatsapp_status ?? item.whatsappSMS ?? item.whatsappstatus ?? item.whatsappstaus ?? existing.whatsappSMS);
        base.remarkpihistory = s(item.remarks ?? item.remarkpihistory ?? existing.remarkpihistory);
        base.shippingaddresschanged = s(item.shipping_address_changed ?? item.shippingaddresschanged ?? existing.shippingaddresschanged);
        base.updatedaddress = s(item.updated_address ?? item.updatedaddress ?? existing.updatedaddress);
        base.piUrl = s(item.piUrl ?? item.pi_url ?? item.piurl ?? existing.piUrl);
        base.invoiceAmount = s(item.invoiceAmount ?? item.invoiceamount ?? existing.invoiceAmount);
        base.orderTakenBy = s(item.order_taken_by ?? item.orderTakenBy ?? item.ordertakenby ?? existing.orderTakenBy);

        if (actual !== '—') order.actual = actual;
        if (planned !== '—') order.planned = planned;
        if (actual !== '—' && planned !== '—') order.actualDelay = formatDelay(actual, planned);
    }



    /* Stage 1 — Inventory Verify Status */
    // if (stageIdx === 1) {
    //     base.user = s(item.doer ?? item.fmsUserName ?? item.username ?? item.fmsusername ?? item.fms_user_name ?? existing.user);
    //     base.deliverynoteno = s(item.deliverynoteno ?? item.deliveryNoteNo ?? item.delivery_note_no ?? existing.deliverynoteno);
    //     base.dnurlremarks = s(item.dnurlremarks ?? item.dnUrlRemarks ?? item.dn_url_remarks ?? existing.dnurlremarks);
    //     base.dispatchfrom = s(item.dispatchfrom ?? item.dispatch ?? item.dispatchFrom ?? item.dispatch_from ?? existing.dispatchfrom);
    //     base.whatsappstaus = s(item.whatsappstaus ?? item.whatsappstatus ?? item.whatsapp_status ?? existing.whatsappstaus);
    //     order.deliveryNoteNo = cleanVal(item.deliverynoteno) ?? order.deliveryNoteNo;
    //     order.dnUrlRemarks = cleanVal(item.dnurlremarks) ?? order.dnUrlRemarks;
    // }

    if (stageIdx === 1) {
        base.user = s(item.DispatchVerFMS_fms_users_name ?? item.doer ?? item.fmsUserName ?? item.username ?? existing.user);
        base.status = s(item.DispatchVerFMS_order_status ?? item.status ?? existing.status);
        base.deliverynoteno = s(item.DispatchVerFMS_delivery_note_no ?? item.deliverynoteno ?? item.deliveryNoteNo ?? existing.deliverynoteno);
        base.dnurlremarks = s(item.DispatchVerFMS_dn_url ?? item.dnurlremarks ?? item.dnUrlRemarks ?? existing.dnurlremarks);
        base.dispatchfrom = s(item.DispatchVerFMS_dispatch_from ?? item.dispatchfrom ?? item.dispatch ?? existing.dispatchfrom);
        base.whatsappstaus = s(item.DispatchVerFMS_whatsapp_status ?? item.whatsappstaus ?? item.whatsappstatus ?? existing.whatsappstaus);
        base.planned = formatDate(item.DispatchVerFMS_planned ?? item.planned) !== '—' ? formatDate(item.DispatchVerFMS_planned ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.DispatchVerFMS_actual ?? item.actual) !== '—' ? formatDate(item.DispatchVerFMS_actual ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.DispatchVerFMS_time_delay ?? item.timedelay ?? existing.delay);
        order.deliveryNoteNo = cleanVal(item.DispatchVerFMS_delivery_note_no ?? item.deliverynoteno) ?? order.deliveryNoteNo;
        order.dnUrlRemarks = cleanVal(item.DispatchVerFMS_dn_url ?? item.dnurlremarks) ?? order.dnUrlRemarks;
    }

    /* Stage 2 — Payment Verify Status */
    // if (stageIdx === 2) {
    //     base.user = s(item.doer ?? item.fmsUserName ?? item.username ?? item.fmsusername ?? item.fms_user_name ?? existing.user);
    //     base.invoiceno = s(item.invoiceno ?? item.invoiceNo ?? item.invoice_no ?? existing.invoiceno);
    //     base.invoicelink = s(item.invoicelink ?? item.invoiceLink ?? item.invoice_link ?? existing.invoicelink);
    //     base.ewaybill = s(item.ewaybill ?? item.ewayBillNo ?? item.eway_bill_no ?? existing.ewaybill);
    //     base.dispactfrom = s(item.dispactfrom ?? item.dispatch ?? item.dispatchFrom ?? item.dispatch_from ?? existing.dispactfrom);
    //     base.whatsappstaus = s(item.whatsappstaus ?? item.whatsappstatus ?? item.whatsapp_status ?? existing.whatsappstaus);
    //     order.invoiceNo = cleanVal(item.invoiceno) ?? order.invoiceNo;
    //     order.invoiceLink = cleanVal(item.invoicelink) ?? order.invoiceLink;
    //     order.ewayBillNo = cleanVal(item.ewaybill) ?? order.ewayBillNo;
    // }

    if (stageIdx === 2) {
        base.user = s(item.AccoutsVerFMS_fms_users_name ?? item.doer ?? item.fmsUserName ?? item.username ?? existing.user);
        base.status = s(item.AccoutsVerFMS_order_status ?? item.status ?? existing.status);
        base.invoiceno = s(item.AccoutsVerFMS_invoice_no ?? item.invoiceno ?? item.invoiceNo ?? existing.invoiceno);
        base.invoicelink = s(item.AccoutsVerFMS_invoice_link ?? item.invoicelink ?? item.invoiceLink ?? existing.invoicelink);
        base.ewaybill = s(item.AccoutsVerFMS_eway_bill_no ?? item.ewaybill ?? item.ewayBillNo ?? existing.ewaybill);
        base.dispactfrom = s(item.AccoutsVerFMS_dispatch_from ?? item.dispactfrom ?? item.dispatch ?? existing.dispactfrom);
        base.whatsappstaus = s(item.AccoutsVerFMS_whatsapp_status ?? item.whatsappstaus ?? item.whatsappstatus ?? existing.whatsappstaus);
        base.planned = formatDate(item.AccoutsVerFMS_planned ?? item.planned) !== '—' ? formatDate(item.AccoutsVerFMS_planned ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.AccoutsVerFMS_actual ?? item.actual) !== '—' ? formatDate(item.AccoutsVerFMS_actual ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.AccoutsVerFMS_time_delay ?? item.timedelay ?? existing.delay);
        order.invoiceNo = cleanVal(item.AccoutsVerFMS_invoice_no ?? item.invoiceno) ?? order.invoiceNo;
        order.invoiceLink = cleanVal(item.AccoutsVerFMS_invoice_link ?? item.invoicelink) ?? order.invoiceLink;
        order.ewayBillNo = cleanVal(item.AccoutsVerFMS_eway_bill_no ?? item.ewaybill) ?? order.ewayBillNo;
    }

    /* Stage 3 — Order Packing Status */
    // if (stageIdx === 3) {
    //     base.user = s(item.doer ?? item.fmsUserName ?? item.username ?? item.fmsusername ?? item.fms_user_name ?? existing.user);
    //     base.packingSlipFormLink = s(item.packingSlipFormLink ?? item.packingslipformlink ?? item.packing_slip_form_link ?? existing.packingSlipFormLink);
    //     base.dispatchformcourier = s(item.dispatchformcourier ?? item.dispatch_form_courier ?? existing.dispatchformcourier);
    //     base.dispatchfrompacking = s(item.dispatchfrompacking ?? item.dispatch_from_packing ?? existing.dispatchfrompacking);
    //     base.state = s(item.state ?? existing.state);
    //     base.updateleadstatus = s(item.updateleadstatus ?? item.update_lead_status ?? existing.updateleadstatus);
    //     base.dipatachremarks = s(item.dipatachremarks ?? item.dispatch_remarks ?? existing.dipatachremarks);
    //     base.packingstatus = s(item.packingstatus ?? item.packing_status ?? (actual !== '—' ? 'Completed' : '') ?? existing.packingstatus);
    //     order.packingStatus = cleanVal(base.packingstatus) ?? cleanVal(item.orderStatus) ?? cleanVal(item.orderstatus) ?? order.packingStatus;
    //     order.packinglist = cleanVal(item.packinglist) ?? order.packinglist;
    //     order.packingsticker = cleanVal(item.packingsticker) ?? order.packingsticker;
    // }

    if (stageIdx === 3) {
        base.user = s(item.packing_slip_fillup_generate_stage_allowed_users ?? item.doer ?? item.fmsUserName ?? existing.user);
        base.packingSlipFormLink = s(item.packing_slip_fillup_generate_packing_slip_form_link ?? item.packingSlipFormLink ?? existing.packingSlipFormLink);
        base.dispatchformcourier = s(item.packing_slip_fillup_generate_dispatch_form_courier_details ?? item.dispatchformcourier ?? existing.dispatchformcourier);
        base.dispatchfrompacking = s(item.packing_slip_fillup_generate_dispatch_form_packing_details ?? item.dispatchfrompacking ?? existing.dispatchfrompacking);
        base.state = s(item.packing_slip_fillup_generate_state ?? item.state ?? existing.state);
        base.updateleadstatus = s(item.packing_slip_fillup_generate_lead_status_update ?? item.updateleadstatus ?? existing.updateleadstatus);
        base.dipatachremarks = s(item.packing_slip_fillup_generate_address_address_verify_remarks ?? item.dipatachremarks ?? existing.dipatachremarks);
        base.packingstatus = s(item.packing_slip_fillup_generate_post_data_to_dialer_status ?? item.packingstatus ?? existing.packingstatus ?? (actual !== '—' ? 'Completed' : ''));
        base.planned = formatDate(item.packing_slip_fillup_generate_actual ?? item.planned) !== '—' ? formatDate(item.packing_slip_fillup_generate_actual ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.packing_slip_fillup_generate_actual ?? item.actual) !== '—' ? formatDate(item.packing_slip_fillup_generate_actual ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.packing_slip_fillup_generate_time_delay ?? item.timedelay ?? existing.delay);
        order.packingStatus = cleanVal(base.packingstatus) ?? cleanVal(item.orderStatus) ?? order.packingStatus;
        order.packinglist = cleanVal(item.packing_slip_fillup_generate_packing_list ?? item.packinglist) ?? order.packinglist;
        order.packingsticker = cleanVal(item.packing_slip_fillup_generate_packing_stickers ?? item.packingsticker) ?? order.packingsticker;
    }

    /* Stage 4 — QC Verify Status */
    // if (stageIdx === 4) {
    //     base.user = s(item.qcdoername ?? item.qc_doer_name ?? item.doer ?? item.fmsUserName ?? item.username ?? item.fmsusername ?? existing.user);
    //     base.remarks = s(item.remarks ?? item.qcRemarks ?? item.qc_remarks ?? existing.remarks);
    //     base.qcstatus = s(item.qcstatus ?? item.qc_status ?? existing.qcstatus);
    //     base.qcstatusuploadurl = s(item.qcstatusuploadurl ?? item.qc_status_upload_url ?? existing.qcstatusuploadurl);
    //     base.whatsappstaus = s(item.whatsappstaus ?? item.whatsappstatus ?? item.whatsapp_status ?? existing.whatsappstaus);
    //     base.qcdoername = s(findValue(item, 'qcdoername') ?? existing.qcdoername);
    //     base.qcimage1 = s(findValue(item, 'qcimage1') ?? existing.qcimage1);
    //     base.qcimage2 = s(findValue(item, 'qcimage2') ?? existing.qcimage2);
    //     base.qcimage3 = s(findValue(item, 'qcimage3') ?? existing.qcimage3);
    //     order.qcImage1 = cleanVal(base.qcimage1) ?? order.qcImage1;
    //     order.qcImage2 = cleanVal(base.qcimage2) ?? order.qcImage2;
    //     order.qcImage3 = cleanVal(base.qcimage3) ?? order.qcImage3;
    //     order.qcStatus = cleanVal(findValue(item, 'qcstatus')) ?? cleanVal(findValue(item, 'orderstatus')) ?? order.qcStatus;
    //     order.qcRemarks = cleanVal(findValue(item, 'remarks')) ?? order.qcRemarks;
    // }

    /* Stage 4 — QC Verify Status */
    if (stageIdx === 4) {
        base.user = s(item.pre_dispatch_packaging_qc_stage_allowed_users ?? item.qcdoername ?? item.doer ?? item.fmsUserName ?? existing.user);
        base.remarks = s(item.pre_dispatch_packaging_qc_remarks ?? item.remarks ?? item.qcRemarks ?? existing.remarks);
        base.qcstatus = s(item.pre_dispatch_packaging_qc_status ?? item.qcstatus ?? existing.qcstatus);
        base.qcstatusuploadurl = s(item.pre_dispatch_packaging_qc_details_upload_url ?? item.qcstatusuploadurl ?? existing.qcstatusuploadurl);
        base.planned = formatDate(item.pre_dispatch_packaging_qc_planned ?? item.planned) !== '—' ? formatDate(item.pre_dispatch_packaging_qc_planned ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.pre_dispatch_packaging_qc_actual ?? item.actual) !== '—' ? formatDate(item.pre_dispatch_packaging_qc_actual ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.pre_dispatch_packaging_qc_time_delay ?? item.timedelay ?? existing.delay);
        base.qcimage1 = s(item.debit_note_stock_replacement_qc_image_1 ?? findValue(item, 'qcimage1') ?? existing.qcimage1);
        base.qcimage2 = s(item.debit_note_stock_replacement_qc_image_2 ?? findValue(item, 'qcimage2') ?? existing.qcimage2);
        base.qcimage3 = s(item.debit_note_stock_replacement_qc_image_3 ?? findValue(item, 'qcimage3') ?? existing.qcimage3);
        order.qcImage1 = cleanVal(base.qcimage1) ?? order.qcImage1;
        order.qcImage2 = cleanVal(base.qcimage2) ?? order.qcImage2;
        order.qcImage3 = cleanVal(base.qcimage3) ?? order.qcImage3;
        order.qcStatus = cleanVal(item.pre_dispatch_packaging_qc_status ?? item.qcstatus) ?? order.qcStatus;
        order.qcRemarks = cleanVal(item.pre_dispatch_packaging_qc_remarks ?? item.remarks) ?? order.qcRemarks;
    }
    /* Stage 5 — Address ReVerify Status */
    // if (stageIdx === 5) {
    //     base.user = s(item.doer ?? item.doername ?? item.fmsUserName ?? item.username ?? item.fmsusername ?? existing.user);
    //     base.addresschanged = s(item.shippingaddresschanged ?? item.addresschanged ?? existing.addresschanged);
    //     base.newaddress = s(item.updatedshippingaddress ?? item.newaddress ?? item.updatedaddress ?? existing.newaddress);
    //     base.eshopboxupdated = s(item.eshopboxupdated ?? existing.eshopboxupdated);
    //     base.shopifyupdated = s(item.shopifyupdated ?? existing.shopifyupdated);
    //     base.remarks = s(item.remarks ?? existing.remarks);
    //     order.addressVerifyStatus = cleanVal(item.orderstaus) ?? cleanVal(item.addressverifystatus) ?? order.addressVerifyStatus;
    // }

    /* Stage 5 — Address ReVerify Status */
    if (stageIdx === 5) {
        base.user = s(item.address_reverify_allowed_users ?? item.AddressUpdateFMS_fms_users_name ?? item.doer ?? item.fmsUserName ?? existing.user);
        base.status = s(item.address_reverify_status_address_verified_status ?? item.AddressUpdateFMS_order_status ?? item.status ?? existing.status);
        base.addresschanged = s(item.AddressUpdateFMS_shipping_address_changed_status ?? item.shippingaddresschanged ?? existing.addresschanged);
        base.newaddress = s(item.AddressUpdateFMS_updated_shipping_address ?? item.updatedshippingaddress ?? item.newaddress ?? existing.newaddress);
        base.remarks = s(item.AddressUpdateFMS_remarks ?? item.remarks ?? existing.remarks);
        base.planned = formatDate(item.address_reverify_status_planned_crr ?? item.planned) !== '—' ? formatDate(item.address_reverify_status_planned_crr ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.address_reverify_status_actual_crr ?? item.actual) !== '—' ? formatDate(item.address_reverify_status_actual_crr ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.address_reverify_status_time_delay_crr ?? item.timedelay ?? existing.delay);
        order.addressVerifyStatus = cleanVal(item.address_reverify_status_address_verified_status ?? item.AddressUpdateFMS_order_status) ?? order.addressVerifyStatus;
    }

    /* Stage 6 — Dispatch Status */
    // if (stageIdx === 6) {
    //     base.user = s(item.doer ?? item.fmsUserName ?? item.username ?? existing.user);
    //     base.dispatchstatus = s(item.dispatchstatus ?? existing.dispatchstatus);
    //     base.remarks = s(item.remarks ?? existing.remarks);
    //     base.dispatchstatusuploadurl = s(item.dispatchstatusuploadurl ?? existing.dispatchstatusuploadurl);
    //     base.dispatchimage = s(item.dispatchimage ?? existing.dispatchimage);
    //     order.dispatchStatus = cleanVal(item.dispatchstatus) ?? order.dispatchStatus;
    // }

    /* Stage 6 — Dispatch Status */
    /* Stage 6 — Dispatch Status */
    if (stageIdx === 6) {
        base.user = s(item.dispatch_to_clients_stage_allowed_users ?? item.doer ?? item.fmsUserName ?? existing.user);
        base.dispatchstatus = s(item.dispatch_to_clients_status ?? item.dispatchstatus ?? existing.dispatchstatus);
        base.remarks = s(item.dispatch_to_clients_remarks ?? item.remarks ?? existing.remarks);
        base.dispatchstatusuploadurl = s(item.dispatch_to_clients_details_upload_url ?? item.dispatchstatusuploadurl ?? existing.dispatchstatusuploadurl);
        base.dispatchimage = s(item.debit_note_stock_replacement_dispatch_image ?? item.dispatchimage ?? existing.dispatchimage);
        base.planned = formatDate(item.dispatch_to_clients_planned ?? item.planned) !== '—' ? formatDate(item.dispatch_to_clients_planned ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.dispatch_to_clients_actual ?? item.actual) !== '—' ? formatDate(item.dispatch_to_clients_actual ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.dispatch_to_clients_time_delay ?? item.timedelay ?? existing.delay);
        order.dispatchStatus = cleanVal(item.dispatch_to_clients_status ?? item.dispatchstatus) ?? order.dispatchStatus;
    }

    /* Stage 7 — Tracking Update Status */
    // if (stageIdx === 7) {
    //     base.user = s(item.doer ?? item.fmsUserName ?? item.username ?? existing.user);
    //     base.trackingid = s(item.trackingid ?? existing.trackingid);
    //     base.dispatchthrough = s(item.dispatchthrough ?? existing.dispatchthrough);
    //     base.trackingurl = s(item.trackingurl ?? existing.trackingurl);
    //     order.trackingId = cleanVal(item.trackingid) ?? order.trackingId;
    // }

    /* Stage 7 — Tracking Update Status */
    if (stageIdx === 7) {
        base.user = s(item.enter_tracking_details_stage_allowed_users ?? item.doer ?? item.fmsUserName ?? existing.user);
        base.trackingid = s(item.enter_tracking_details_tracking_id ?? item.trackingid ?? existing.trackingid);
        base.dispatchthrough = s(item.enter_tracking_details_dispatch_through ?? item.dispatchthrough ?? existing.dispatchthrough);
        base.trackingurl = s(item.enter_tracking_details_tracking_url ?? item.trackingurl ?? existing.trackingurl);
        base.planned = formatDate(item.enter_tracking_details_planned ?? item.planned) !== '—' ? formatDate(item.enter_tracking_details_planned ?? item.planned) : existing.planned ?? '—';
        base.actual = formatDate(item.enter_tracking_details_actual ?? item.actual) !== '—' ? formatDate(item.enter_tracking_details_actual ?? item.actual) : existing.actual ?? '—';
        base.delay = s(item.enter_tracking_details_time_delay ?? item.timedelay ?? existing.delay);
        order.trackingId = cleanVal(item.enter_tracking_details_tracking_id ?? item.trackingid) ?? order.trackingId;
    }

    /* Stage 8 — Stock Deduction Status */
    // if (stageIdx === 8) {
    //     base.user = s(item.doer ?? item.fmsUserName ?? item.username ?? item.deductedBy ?? item.deductedby ?? existing.user);
    //     base.deductedby = s(item.deductedby ?? item.deductedBy ?? item.doer ?? existing.deductedby);
    //     base.deductionstatus = s(item.deductionstatus ?? item.status ?? (actual !== '—' ? 'Completed' : '') ?? existing.deductionstatus);
    //     base.deductiondate = s(item.deducteddate ?? item.deductionDate ?? item.deductiondate ?? actual ?? existing.deductiondate);
    //     base.remarks = s(item.remarks ?? existing.remarks);

    //     order.deductionStatus = cleanVal(base.deductionstatus) ?? order.deductionStatus;
    //     order.deductedBy = cleanVal(base.deductedby) ?? order.deductedBy;
    //     order.deductionDate = cleanVal(base.deductiondate) ?? order.deductionDate;
    // }


    /* Stage 8 — Stock Deduction Status */
    if (stageIdx === 8) {
        const stockActual = formatDate(item.dispatch_to_clients_actual ?? item.actual);
        const stockActualFilled = stockActual !== '—' && stockActual !== '';
        const stockRemarks = s(item.dispatch_to_clients_remarks ?? item.remarks ?? existing.remarks);
        const isStockDeducted = stockRemarks.toUpperCase() === 'STOCK DEDUCTED';

        base.user = s(item.dispatch_to_clients_stage_allowed_users ?? item.doer ?? item.fmsUserName ?? item.username ?? existing.user);
        base.deductedby = s(item.dispatch_to_clients_stage_allowed_users ?? item.deductedby ?? item.deductedBy ?? existing.deductedby);
        base.deductionstatus = stockActualFilled
            ? 'Completed'
            : isStockDeducted
                ? 'Completed'
                : s(item.deductionstatus ?? item.status ?? existing.deductionstatus);
        base.deductiondate = stockActual !== '—' ? stockActual : s(item.deducteddate ?? item.deductiondate ?? existing.deductiondate);
        base.remarks = stockRemarks;
        base.planned = formatDate(item.dispatch_to_clients_planned ?? item.planned) !== '—' ? formatDate(item.dispatch_to_clients_planned ?? item.planned) : existing.planned ?? '—';
        base.actual = stockActualFilled ? stockActual : (existing.actual ?? '—');
        base.delay = s(item.dispatch_to_clients_time_delay ?? item.timedelay ?? existing.delay);

        order.deductionStatus = cleanVal(base.deductionstatus) ?? order.deductionStatus;
        order.deductedBy = cleanVal(base.deductedby) ?? order.deductedBy;
        order.deductionDate = cleanVal(base.deductiondate) ?? order.deductionDate;
    }
    order.stages[stageIdx] = base;

    // Update order-level status and active stage
    const sl = status.toLowerCase();
    if (sl.includes('cancel')) {
        order.status = 'Cancelled';
    } else if (sl.includes('hold')) {
        order.status = 'Hold';
    } else if (stageIdx === 0 && sl.includes('ok to dispatch')) {
        // If it was hold but now it's ok, reset to normal
        if (order.status === 'Hold') order.status = 'Normal';
    }

    // activeStage heuristic
    if (sl.includes('dispatch') || sl.includes('ok to dispatch'))
        order.activeStage = Math.max(order.activeStage, 6);
    else if (sl.includes('qc'))
        order.activeStage = Math.max(order.activeStage, 4);
    else if (sl.includes('packing'))
        order.activeStage = Math.max(order.activeStage, 3);
    else if (sl.includes('payment'))
        order.activeStage = Math.max(order.activeStage, 2);
    else if (sl.includes('inventory'))
        order.activeStage = Math.max(order.activeStage, 1);
}

/* ─────────────────────────────────────────────
   HOOK
───────────────────────────────────────────── */
export function useNewOrderFMS() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchingStageIndex, setFetchingStageIndex] = useState<number | null>(null);

    const fetchVersion = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchOrders = useCallback(async () => {
        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const version = ++fetchVersion.current;
        setLoading(true);
        setError(null);
        setFetchingStageIndex(null);

        try {

            let baseRes: Response;
            try {
                baseRes = await fetchWithTimeout(`${API_URL}?type=gettabledata`, controller.signal);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                throw new Error(`Network error: ${e?.message ?? 'timeout or CORS'}`);
            }

            if (!baseRes.ok) throw new Error(`API HTTP error: ${baseRes.status}`);

            let baseJson: any;
            try {
                baseJson = await baseRes.json();
            } catch {
                throw new Error('API returned invalid JSON');
            }

            // Extract data array — do NOT hard-fail on success:false
            const baseRows = extractDataArray(baseJson);

            if (!Array.isArray(baseRows) || baseRows.length === 0) {
                throw new Error(
                    baseJson?.message ??
                    baseJson?.error ??
                    'Base API returned no data. Check the API URL or Google Sheets permissions.'
                );
            }

            // Build ordersMap keyed by UPPERCASE orderId e.g. "OID_34728"
            // Rows with blank/null order_id fall back to "ROW_<db_id>" so no rows are dropped.
            const ordersMap = new Map<string, Order>();
            for (const item of baseRows) {
                if (controller.signal.aborted) return;
                if (!item || typeof item !== 'object') continue;
                const oid = resolveOrderId(item) || (item.id != null ? `ROW_${item.id}` : '');
                if (!oid) continue;
                if (ordersMap.has(oid)) continue;
                ordersMap.set(oid, buildBaseOrder(item, oid));
            }

            if (ordersMap.size === 0) {
                if (version === fetchVersion.current) {
                    setOrders([]);
                    setLoading(false);
                }
                return;
            }

            // RENDER BASE DATA IMMEDIATELY
            if (version === fetchVersion.current) {
                setOrders(Array.from(ordersMap.values()));
                setLoading(false);
            }


            const allOrderIds = Array.from(ordersMap.keys()).sort((a, b) => {
                const oa = ordersMap.get(a);
                const ob = ordersMap.get(b);
                if (!oa || !ob) return 0;
                const da = parseCustomDate(oa.timestamp).getTime();
                const db = parseCustomDate(ob.timestamp).getTime();
                return db - da; // Latest first
            });

            const knownIds = new Set(allOrderIds);

            // BATCH LOADING LOOP
            // for (let i = 0; i < allOrderIds.length; i += BATCH_SIZE) {
            //     if (version !== fetchVersion.current || controller.signal.aborted) return;

            // const batch = allOrderIds//.slice(i, i + BATCH_SIZE);
            // const batchIds: Record<string, boolean> = {};
            // for (const id of batch) batchIds[id] = true;
            //const idsParam = encodeURIComponent(JSON.stringify(batchIds));

            for (const stage of STAGE_APIS) {
                if (version !== fetchVersion.current || controller.signal.aborted) return;
                setFetchingStageIndex(stage.index);

                const url = `${API_URL}?type=${stage.type}`;//&ids=${idsParam}`;

                try {
                    const res = await fetchWithTimeout(url, controller.signal);
                    if (!res.ok) continue;

                    let json: any;
                    try { json = await res.json(); } catch { continue; }

                    const rows = extractDataArray(json);
                    if (!Array.isArray(rows) || rows.length === 0) continue;

                    let mapChanged = false;
                    for (const item of rows) {
                        if (controller.signal.aborted) return;
                        if (!item || typeof item !== 'object') continue;
                        const oid = resolveOrderId(item, knownIds);
                        if (!oid) continue;
                        const order = ordersMap.get(oid);
                        if (!order) continue;

                        const updatedOrder = { ...order, stages: { ...order.stages } };
                        applyStageData(updatedOrder, item, stage.index);
                        ordersMap.set(oid, updatedOrder);
                        mapChanged = true;
                    }

                    if (mapChanged && version === fetchVersion.current) {
                        setOrders(Array.from(ordersMap.values()));
                    }
                } catch (e: any) {
                    if (e.name === 'AbortError') return;
                    console.error(`[FMS] Stage "${stage.type}" batch  error:`, e);
                }
            }

            // Small breathing room for UI thread between batches
            await new Promise(r => {
                const t = setTimeout(r, 60);
                controller.signal.addEventListener('abort', () => clearTimeout(t));
            });
            // }

            // Final safeguard update
            if (version === fetchVersion.current) {
                setOrders(Array.from(ordersMap.values()));
            }

        } catch (err: any) {
            if (err.name === 'AbortError' || version !== fetchVersion.current) return;
            console.error('[FMS] fetchOrders error:', err);
            setError(s(err?.message) || 'Failed to load data');
        } finally {
            if (version === fetchVersion.current) {
                setLoading(false);
                setFetchingStageIndex(null);
            }
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchOrders]);

    return { orders, loading, error, fetchingStageIndex, refresh: fetchOrders };
}
