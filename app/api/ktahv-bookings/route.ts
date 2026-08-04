import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue } from "@/lib/session";
import { getPool } from "@/lib/db";
import { parseEnv } from "util";
import AccountsTrackerPage from "@/app/accounts-tracker/page";
import { normalizeUserName } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHANNEL_MANAGERS = new Set([
    "Booking.com", "https://www.tiket.com/hotel", "https://www.roomsorder.com/hotelbookings",
    "MakeMyTrip", "Goibibo", "Airbnb.com (Channex)", "Agoda.com", "Yatra.co",
    "Travelguru", "Expedia", "A-Hotel.com", "Cleartrip.com", "Hyperguest (Cleartrip Link)",
    "EaseMyTrip.com", "DIRECT", "Agoda",
]);

const AGENTS = new Set([
    "Sadik Rehman", "Pawan Kamra", "Pushpanshu Kumar", "Harpal Singh",
    "Manoj Nair FOM", "Nishant", "Vikesh Kumar", "Vibin S", "Adharsh A", "Shyamdas S",
    "Shoukath Ali Moosa",
]);

const CONVERSION_RATES: Record<string, number> = { INR: 1, USD: 85.74, EURO: 89.26, EUR: 89.26 };

function convertCurrency(amount: number, from: string, to: string): number {
    const fromRate = CONVERSION_RATES[(from || "INR").toUpperCase()] ?? 1;
    const toRate = CONVERSION_RATES[(to || "INR").toUpperCase()] ?? 1;
    return (amount * fromRate) / toRate;
}

const NAME_ALIASES: Record<string, string> = { Shoukath: "Shoukath Ali Moosa" };

// Default objects to avoid repeated inline construction
const EMPTY_ACCOUNTS = {
    pmsStatus: "", takenBy: "", company: "", salesPersonStatus: "",
    accountsPlanned: "", accountsActual: "", accountsDelay: "", accountsDoer: "",
    accountsStatus: "", accountsReamrks: "", accountsDate: "", accountsAmount: "",
    foPlanned: "", foActual: "", foDelay: "", foDoer: "",
    foStatus: "", foReamrks: "", foDate: "", dSrc: "",
} as const;

const EMPTY_DELETE = {
    paymentActual: "", paymentStatus: "", paymentRemarks: "", paymentDelay: "",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

type StageRow = [
    planned: unknown, actual: unknown, delay: unknown,
    doer: unknown, status: unknown, remarks: unknown,
    amount?: unknown,
];

type EmpCounts = [number, number, number, number];

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    // This route exposes booking, guest, payment and invoice data, so it requires a
    // valid signed browser session — authenticate before touching the pool, so an
    // unauthenticated request never allocates DB connections.
    // Deliberately not authorizeApiRequest: its MEASUREMENT_API_TOKEN bearer path
    // must not grant access to KTAHV booking data.
    let session: any = null;
    try {
        const userCookie = req.cookies.get("kairali_user")?.value;
        session = userCookie ? verifySessionCookieValue(userCookie) : null;
    } catch {
        session = null;
    }
    if (!session) {
        // Generic message only — no cookie contents or validation details.
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const pool = await getPool();

    // Acquire all connections up-front; released inside each helper's finally block
    const [
        conn1, conn2, paymentConn, accountsConn,
        finaltrtfConn, deleteConn, credConn, pendConn, mainConn, guestconn, checkinconn
    ] = await Promise.all([
        pool.getConnection(), pool.getConnection(), pool.getConnection(),
        pool.getConnection(), pool.getConnection(), pool.getConnection(),
        pool.getConnection(), pool.getConnection(), pool.getConnection(),
        pool.getConnection(), pool.getConnection()
    ]);

    try {
        // Run all independent DB fetches in parallel
        const [
            bookingMaps,
            collectionHistoryLogs,
            accountsMap,
            finaltrtfMap,
            deleteMap,
            names,
            pendDataMap,
            newBookingData,
            guesttrackerdata,
            checkinidmap
        ] = await Promise.all([
            getBookingMapsOptimized(conn1, conn2),
            getCollectionHistory(paymentConn),
            getAccountsStageMap(accountsConn),
            getFinalTrtfStageMap(finaltrtfConn),
            getDeleteStageMap(deleteConn),
            getNameMapResp(credConn),
            getPendingDataMap(pendConn),
            getMainBookingsData(mainConn),
            getGuesttrackerData(guestconn),
            getcheckinids(checkinconn)
        ]);

        const { piMap, autoReleasedMap, underAutoReleasedMap } = bookingMaps;
        const currentTime = new Date();

        // ── Build employee pending-count map ─────────────────────────────────
        const empMap: Record<string, EmpCounts> = {};
        const canonicalMap: Record<string, string> = {};

        function incrementEmp(assigned: string, idx: 0 | 1 | 2 | 3) {
            if (!assigned) return;
            const name = resolveCanonicalName(assigned, names, canonicalMap, empMap);
            if (!name) return;
            if (!(name in empMap)) empMap[name] = [0, 0, 0, 0];
            empMap[name][idx]++;
        }

        function isOverdue(deadline: unknown, completion: unknown, assigned: unknown) {
            if (!deadline || completion || !assigned) return false;
            const deadlineDate = deadline instanceof Date ? deadline : parseDeadlineDate(deadline);
            return !!deadlineDate && currentTime > new Date(deadlineDate);
        }

        for (const id in pendDataMap) {
            const { deadline, completion, assigned } = pendDataMap[id];
            if (isOverdue(deadline, completion, assigned)) incrementEmp(assigned as string, 0);
        }

        for (const id in accountsMap) {
            const d = accountsMap[id];
            if (isOverdue(d.accountsPlanned, d.accountsActual, d.accountsDoer)) incrementEmp(d.accountsDoer, 1);
            if (isOverdue(d.foPlanned, d.foActual, d.foDoer)) incrementEmp(d.foDoer, 1);
        }

        for (const id in finaltrtfMap) {
            const d = finaltrtfMap[id];
            if (isOverdue(d.accountsPlanned, d.accountsActual, d.accountsDoer)) incrementEmp(d.accountsDoer, 2);
            if (isOverdue(d.foPlanned, d.foActual, d.foDoer)) incrementEmp(d.foDoer, 2);
        }

        for (const id in deleteMap) {
            const d = deleteMap[id];
            // console.log("DeleteSheet Employee:", d.foDoer, d.accountsDoer)
            if (isOverdue(d.foPlanned, d.foActual, d.foDoer)) incrementEmp(d.foDoer as string, 3);
            if (isOverdue(d.accountsPlanned, d.accountsActual, d.accountsDoer)) incrementEmp(d.accountsDoer as string, 3);
        }

        // Consolidate canonical duplicates
        const finalEmpMap: Record<string, EmpCounts> = {};
        // console.log("Employee Map", empMap)
        for (const key in empMap) {
            const finalKey = canonicalMap[key] ?? key;
            if (!(finalKey in finalEmpMap)) finalEmpMap[finalKey] = [0, 0, 0, 0];
            for (let i = 0; i < 4; i++) finalEmpMap[finalKey][i] += empMap[key][i];
        }

        const pendingCounts = Object.entries(finalEmpMap).map(([employee, counts]) => ({
            employee,
            newBookings: counts[0],
            accountsVerify: counts[1],
            finalTransfer: counts[2],
            deleteComplete: counts[3],
            total: counts[0] + counts[1] + counts[2] + counts[3],
        }));

        // ── Build bookings array ──────────────────────────────────────────────
        const bookings = newBookingData.flatMap((r: any, i: number) => {
            const resId: string = r.reservation_id;
            if (!resId) return [];
            const accountsData = accountsMap[resId] ?? EMPTY_ACCOUNTS;
            const deleteData = deleteMap[resId] ?? EMPTY_DELETE;
            const finalData = finaltrtfMap[resId] ?? EMPTY_ACCOUNTS;

            const invoiceAmtRaw = parseFloat(r.invoice_amount) || 0;
            const currency: string = r.currency || "INR";
            const payments = collectionHistoryLogs[resId] || [];
            let totalRecvRaw = 0;
            if (payments.length > 0) {
                for (const p of payments) {
                    const amt = Number(p?.receivedAmount ?? p?.[4]) || 0;
                    const pCur = String(p?.currency ?? p?.[3] ?? currency);
                    totalRecvRaw += convertCurrency(amt, pCur, currency);
                }
            } else {
                totalRecvRaw = parseFloat(r.nb_pch_total_recv_amount) || 0;
            }
            const convRate = CONVERSION_RATES[currency] ?? 1;
            const convertedAmt = convRate * invoiceAmtRaw;
            const recvPct = invoiceAmtRaw > 0 ? (totalRecvRaw / invoiceAmtRaw) * 100 : 0;

            const underAutoReleaseDate = getUnderAutoReleaseStatus(
                r.nb_bvs_action_status, r.booking_status,
                recvPct, r.nb_fbc_40_threshold_days, r.nb_fbc_100_threshold_days,
                r.nb_aphs_approved_till_date ? new Date(r.nb_aphs_approved_till_date) : "",
                new Date(r.booking_datetime), new Date(r.arrival_date),
                new Date(r.departure_date), new Date(), resId,
            );

            const cancelledCheckForUser = getStatusFast(
                resId, accountsMap, autoReleasedMap, false,
                r.nb_bvs_doer_remarks, r.nb_bvs_reason_of_cancellation,
                r.nb_bvs_actual, r.booking_status, r.narration,
                r.timestamp, r.nb_bvs_action_status,
            );

            const isAutoReleased = resId in autoReleasedMap;
            const isUnderAutoReleased = !isAutoReleased && !!underAutoReleaseDate?.status;
            let guestrow = guesttrackerdata[resId];
            let checkinidexsist = resId in checkinidmap ? true : false;
            return [{
                id: String(i + 1),
                bookingDate: parseIndianDateTime(r.booking_datetime),
                bookingId: resId,
                guestDetails: {
                    guestID: r.guest_id,
                    guestName: r.client_name,
                    mobile: r.mobile,
                    email: r.email,
                    gender: r.gender,
                    billingAddress: r.billing_address,
                    state: r.state,
                    district: r.district,
                    country: r.country,
                    countryCode: r.dial_country_code,
                    guestStatus: r.guest_status,
                    guestHistory: r.guest_history_note,
                },
                roomDetails: {
                    roomNo: r.room_no,
                    roomType: r.room_type,
                    roomCategory: r.room_category,
                },
                programeName: r.prog_pkg_name,
                arrivalDate: r.arrival_date ? new Date(r.arrival_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "long", year: "numeric" }) : "-",
                departureDate: r.departure_date ? new Date(r.departure_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "long", year: "numeric" }) : "-",
                paymentDetails: {
                    amount: convertedAmt ? Math.round(convertedAmt) : convertedAmt,
                    amountOriginal: invoiceAmtRaw ? Math.round(invoiceAmtRaw) : invoiceAmtRaw,
                    discountPercent: parseFloat(r.discount_percent) || 0,
                    amountRecieved: totalRecvRaw ? Math.round(totalRecvRaw) : totalRecvRaw,
                    totalAmountReceived: totalRecvRaw ? Math.round(totalRecvRaw) : totalRecvRaw,
                    totalAmountBeforeDiscount: parseFloat(r.total_amt_before_disc) || 0,
                    discount: parseFloat(r.discount_amount) || 0,
                    balance: parseFloat(r.balance_amount) || 0,
                    currency,
                    paymentReceivedDate: parseIndianDateTime(r.nb_pch_payment_recv_dt),
                    paymentReceived: r.nb_pch_received_amount,
                    paymentMode: r.nb_pch_payment_mode,
                    receiptNumber: r.nb_pch_receipt_txn_no,
                    paymentLocation: r.nb_pch_collection_location,
                    collectionBy: r.nb_pch_collection_by,
                    uploadedScreenshot: r.nb_pch_uploaded_screenshot,
                    pendingAmount: parseFloat(r.nb_pch_pending_amount) || 0,
                    paymentCollectionHistory: r.nb_pch_history_link,
                },
                bookingDetails: {
                    bookingStatus: getActivityStatus(resId, accountsMap),
                    bookingType: r.booking_type,
                    bookingTakenBy: normalizeUserName(r.nb_bvs_doer),
                    groupBooking: (String(r.booking_type || "").trim().toLowerCase() === "group" || (r.group_booking_count && r.group_booking_count != 0)) ? "Yes" : "No",
                    dataSource: r.data_source_auto,
                },
                piDetails: {
                    piLink: (resId in piMap && r.nb_bvs_pi_gen_status === "Edited" ? piMap[resId] : null) || r.nb_bvs_pi_link || null,
                    piNumber: r.nb_bvs_pi_number,
                },
                mlDetails: {
                    mlFinalStatus: r.nb_fbc_ml_final_status,
                    mlRemarks: r.nb_fbc_ml_remarks,
                },
                travelDetails: {
                    arrivalTime: r.arrival_time,
                    arrivalMode: r.arrival_mode ? r.arrival_mode : "-",
                    arrivalPickup: r.arrival_pickup ? r.arrival_pickup : "-",
                    departureTime: r.dept_time ? r.dept_time : "-",
                    departureMode: r.dept_mode ? r.dept_mode : "-",
                    departurePickup: r.dept_pickup ? r.dept_pickup : "-",
                },
                cancelledRemarks: r.nb_bvs_doer_remarks,
                cancelledReason: r.nb_bvs_reason_of_cancellation,
                timestamp: parseIndianDateTime(r.timestamp),
                buyerID: r.buyer_id ? r.buyer_id : "-",
                editID: r.edit_id,
                purposeOfStay: r.purpose_of_stay,
                adults: r.number_of_adults,
                male: r.number_of_male,
                female: r.number_of_female,
                children: r.number_of_children,
                repeat: r.repeat_client || "No",
                clientCategory: r.client_category,
                clientType: r.client_type,
                bookingTakenBy: normalizeUserName(r.booker_name) || "-",
                bookerEmail: r.booker_email ? r.booker_email : "-",
                bookerPhone: r.booker_phone_no ? r.booker_phone_no : '-',
                approvalGivenDate: parseIndianDateTime(r.nb_aphs_approval_given_date),
                approvedTillDate: parseIndianDateTime(r.nb_aphs_approved_till_date),
                approvedBy: normalizeUserName(r.nb_aphs_approved_by),
                approvalRemarks: r.nb_aphs_remarks,
                approvalScreenShot: r.nb_aphs_approval_screenshot,
                editActionStatus: r.nb_bvs_action_status !== "" && r.nb_bvs_actual !== "" ? r.nb_bvs_action_status : "pending",
                accountsVerifyStatus: accountsData.accountsStatus || "pending",
                paymentSettlementStatus: deleteData?.paymentStatus || "pending",
                frontOfficeStatus: accountsData.foStatus || "pending",
                receivedPercentage: recvPct,
                whatsappToClient: r.nb_pgns_wa_client_recv,
                emailToClient: r.nb_pgns_email_client_recv,
                whatsappToStaff: r.nb_pgns_wa_btu_recv,
                emailToStaff: r.nb_pgns_email_btu_recv,
                status: getStatusFast(resId, accountsMap, autoReleasedMap, true, null, null, new Date(r.nb_bvs_actual)),
                guestId: r.guest_id,
                isAutoReleased: isAutoReleased ? "Auto Released" : isUnderAutoReleased ? "Under Auto Released" : false,
                cancelByUserCheck: cancelledCheckForUser[0],
                autoReleaseReason: isAutoReleased ? autoReleasedMap[resId][24] : (underAutoReleasedMap[resId]?.[24] ?? false),
                autoReleasedAt: isAutoReleased ? autoReleasedMap[resId][33] : (underAutoReleaseDate?.status || false),
                autoReleaseNotes: isAutoReleased ? autoReleasedMap[resId][24] : (underAutoReleaseDate?.reason || false),
                piHistoryLink: r.nb_bvs_pi_link,
                bSource: foundSource(normalizeUserName(r.nb_bvs_doer), r.company_name, r.data_source_auto) || "Others",
                collectionHistory: collectionHistoryLogs[resId] ?? [],
                doerDelay: r.nb_bvs_time_delay || "",
                accountsDelay: accountsData.accountsDelay,
                foDelay: accountsData.foDelay,
                paymentDelay: deleteData.paymentDelay,
                salesPersonStage: createStageData([[
                    parseIndianDateTime(r.nb_bvs_planned), parseIndianDateTimeatual(r.nb_bvs_actual), r.nb_bvs_time_delay,
                    r.nb_bvs_doer, r.nb_bvs_action_status,
                    `${r.nb_bvs_doer_remarks ? r.nb_bvs_doer_remarks : ""} - ${r.nb_bvs_reason_of_cancellation ? r.nb_bvs_reason_of_cancellation : ""}`,
                ]]),
                accountsPersonStage: createStageData([
                    [parseIndianDateTime(accountsData?.accountsPlanned), parseIndianDateTimeatual(accountsData?.accountsActual), accountsData?.accountsDelay, accountsData?.accountsDoer, accountsData?.accountsStatus, accountsData?.accountsReamrks, accountsData?.accountsAmount],
                    [parseIndianDateTime(finalData?.accountsPlanned), parseIndianDateTimeatual(finalData?.accountsActual), finalData?.accountsDelay, finalData?.accountsDoer, finalData?.accountsStatus, finalData?.accountsReamrks, finalData?.accountsAmount],
                    [parseIndianDateTime(deleteData?.accountsPlanned), parseIndianDateTimeatual(deleteData?.accountsActual), deleteData?.accountsDelay, deleteData?.accountsDoer, deleteData?.accountsStatus, deleteData?.accountsReamrks, deleteData?.accountsAmount],
                ]),
                foPersonStage: createStageData([
                    [parseIndianDateTime(accountsData?.foPlanned), parseIndianDateTimeatual(accountsData?.foActual), accountsData?.foDelay, accountsData?.foDoer, accountsData?.foStatus, accountsData?.foReamrks],
                    [parseIndianDateTime(finalData?.foPlanned), parseIndianDateTimeatual(finalData?.foActual), finalData?.foDelay, finalData?.foDoer, finalData?.foStatus, finalData?.foReamrks],
                ]),
                checkoutPersonStage: createStageData([[
                    parseIndianDateTime(deleteData?.foPlanned), parseIndianDateTimeatual(deleteData?.foActual), deleteData?.foDelay,
                    deleteData?.foDoer, deleteData?.foStatus, deleteData?.foReamrks,
                ]]),
                guesttrackerdata: {
                    exists: !!guestrow,
                    primary_secondary: guestrow?.primary_secondary ?? "",
                    arrivalstage: {
                        arrival_planned: guestrow?.arrival_planned ?? "",
                        arrival_actual: guestrow?.arrival_actual ?? "",
                        arrival_time_delay: guestrow?.arrival_time_delay ?? "",
                        arrival_tickets_upload_link: guestrow?.arrival_tickets_upload_link ?? "",
                        confirm_guest_requests_doctor: guestrow?.confirm_guest_requests_doctor ?? "",
                        arrival_doer_name: guestrow?.arrival_doer_name ?? "",
                        client_arrival_data_upload_status: guestrow?.client_arrival_data_upload_status ?? "",
                        arrival_boarding_pass_upload_link: guestrow?.arrival_boarding_pass_upload_link ?? "",
                        client_arrival_data_upload_remarks: guestrow?.client_arrival_data_upload_remarks ?? "",
                        arrival_boarding_pass_upload_datetime: guestrow?.arrival_boarding_pass_upload_datetime ?? "",
                        arrival_counts_st1: guestrow?.arrival_counts_st1 ?? "",
                        booking_status_if_cancelled: guestrow?.booking_status_if_cancelled ?? "",
                        doctor_assigned_to_the_client: guestrow?.doctor_assigned_to_the_client ?? "",
                        special_request_or_requirement_noted: guestrow?.special_request_or_requirement_noted ?? "",
                        wheel_chair_requirement_noted: guestrow?.wheel_chair_requirement_noted ?? ""
                    },
                    departurestage: {
                        departure_planned: guestrow?.departure_planned ?? "",
                        departure_actual: guestrow?.departure_actual ?? "",
                        departure_time_delay: guestrow?.departure_time_delay ?? "",
                        departure_tickets_upload_link: guestrow?.departure_tickets_upload_link ?? "",
                        departure_boarding_pass_upload_link: guestrow?.departure_boarding_pass_upload_link ?? "",
                        departure_doer_name: guestrow?.departure_doer_name ?? "",
                        client_departure_data_upload_status: guestrow?.client_departure_data_upload_status ?? "",
                        client_departure_data_upload_remarks: guestrow?.client_departure_data_upload_remarks ?? "",
                        departure_boarding_pass_upload_datetime: guestrow?.departure_boarding_pass_upload_datetime ?? "",
                        departure_counts_st1: guestrow?.departure_counts_st1 ?? ""
                    }
                },
                checkinidexsist: checkinidexsist,
                amountConversionRatio: CONVERSION_RATES,
                isEditedOneTime: r.nb_bvs_pi_gen_status === "Edited",
            }];
        });

        return NextResponse.json({ bookings, pendingCounts, nameAliases: NAME_ALIASES });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ─── Stage helpers ────────────────────────────────────────────────────────────

function createStageData(arr: StageRow[]) {
    return Object.fromEntries(
        arr.map((v, i) => [i + 1, {
            planned: v[0] ?? "",
            actual: v[1] ?? "",
            delay: v[2] ?? "",
            doer: v[3] ?? "",
            status: v[4] ?? "",
            remarks: v[5] ?? "",
            amount: v[6] ?? "",
        }])
    );
}


// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getBookingMapsOptimized(conn1: any, conn2: any) {
    try {
        const [[autoRelease], [invoiceResult]] = await Promise.all([
            conn1.execute(`SELECT * FROM ktahv_pms_auto_release ORDER BY booking_date_time DESC`),
            conn2.execute(`SELECT booking_id, invoice_url_new FROM ktahv_invoicing_format`),
        ]);

        const piMap = buildPiMap(invoiceResult);
        const { autoReleasedMap, underAutoReleasedMap } = buildAutoAndUnderReleasedMap(autoRelease);
        return { piMap, autoReleasedMap, underAutoReleasedMap };
    } finally {
        conn1?.release();
        conn2?.release();
    }
}

function buildPiMap(data: any[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const r of data) {
        if (r.booking_id && r.invoice_url_new) {
            map[String(r.booking_id).trim()] = r.invoice_url_new;
        }
    }
    return map;
}
async function getcheckinids(checkinconn: any) {
    try {
        const [checkinrows] = await checkinconn.execute(`SELECT booking_date_time , reservation_id  FROM ktahv_checkinmasterfms WHERE booking_date_time IS NOT NULL `);
        let checkinidmap = {};
        for (let i = 0; i < checkinrows.length; i++) {
            let r = checkinrows[i];
            if (!r.booking_date_time || !r.reservation_id) continue;
            checkinidmap[String(r.reservation_id).trim()] = true;
        }
        return checkinidmap;
    } finally {
        checkinconn?.release();
    }
}
function buildAutoAndUnderReleasedMap(data: any[]) {
    const autoReleasedMap: Record<string, any> = {};
    const underAutoReleasedMap: Record<string, any> = {};

    for (const r of data) {
        if (!r.booking_date_time) continue;
        const id = r.reservation_id ? String(r.reservation_id) : null;
        if (!id) continue;

        const cancelled = r.response_from_touchq_api === "Reservations Cancelled";
        if (cancelled && (r.position === "archive" || r.auto_release_status_in_pms === "Updated")) {
            autoReleasedMap[id] = r;
        } else if (!cancelled && r.position === "main") {
            underAutoReleasedMap[id] = r;
        }
    }
    return { autoReleasedMap, underAutoReleasedMap };
}

async function getCollectionHistory(conn: any): Promise<Record<string, any[]>> {
    try {
        const [rows] = await conn.execute(
            `SELECT timestamp,
            booking_id,
            payment_received_date,
            currency,
            received_amount,
            receipt_number,
            payment_collected_by,
            uploaded_screenshot,
            payment_location,
            payment_mode,
            pending_amount,
            invoice_amount,
            update_status
            FROM payment_collection WHERE UPPER(company) = 'KTAHV'`
        );
        const map: Record<string, any[]> = {};
        for (const r of rows) {
            if (r.booking_id && r.update_status) {
                const key = String(r.booking_id);
                // Frontend expects each history entry as a positional array
                // (it does row[5], [...row], history[i][j]) — a raw MySQL row
                // object isn't iterable/indexable that way, so convert it here.
                (map[key] ??= []).push({
                    timestamp: r.timestamp,
                    bookingId: r.booking_id,
                    receivedDate: r.payment_received_date,
                    currency: r.currency,
                    receivedAmount: r.received_amount,
                    receiptNumber: r.receipt_number,
                    paymentCollectedBy: r.payment_collected_by,
                    screenshot: r.uploaded_screenshot,
                    paymentLocation: r.payment_location,
                    paymentMode: r.payment_mode,
                    pendingAmount: r.pending_amount,
                    invoiceAmount: r.invoice_amount,
                    updateStatus: r.update_status,
                });
            }
        }
        return map;
    } finally {
        conn?.release();
    }
}

async function getAccountsStageMap(conn: any): Promise<Record<string, any>> {
    try {
        const [rows] = await conn.execute(`
            SELECT
                av.reservation_id,
                av.av_apcs_planned,    av.av_apcs_actual,   av.av_apcs_delay,
                av.av_apcs_doer,       av.av_apcs_pay_recv_status,
                av.av_apcs_actual_recv_amt, av.av_apcs_remarks,
                av.av_fobr_planned,    av.av_fobr_actual,   av.av_fobr_time_delay,
                av.av_fobr_doer_name,  av.av_fobr_release_pass_status,
                av.av_fobr_pms_block_status, av.av_fobr_remarks,
                nb.booking_status, nb.booking_taken_by, nb.company_name, nb.data_source_auto,
                nbs.nb_bvs_action_status
            FROM ktahv_bookings_fms_v3_av_AccountsVerify_frontoffice av
            LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON av.reservation_id = nb.reservation_id
            LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs ON av.reservation_id = nbs.reservation_id
        `);

        return buildAccountsMap(rows, {
            accountsPlanned: "av_apcs_planned", accountsActual: "av_apcs_actual",
            accountsDelay: "av_apcs_delay", accountsDoer: "av_apcs_doer",
            accountsStatus: "av_apcs_pay_recv_status", accountsReamrks: "av_apcs_remarks",
            accountsDate: "av_apcs_actual", accountsAmount: "av_apcs_actual_recv_amt",
            foPlanned: "av_fobr_planned", foActual: "av_fobr_actual",
            foDelay: "av_fobr_time_delay", foDoer: "av_fobr_doer_name",
            foReamrks: "av_fobr_remarks", foDate: "av_fobr_actual",
            foStatusA: "av_fobr_release_pass_status", foStatusB: "av_fobr_pms_block_status",
        });
    } finally {
        conn?.release();
    }
}

async function getFinalTrtfStageMap(conn: any): Promise<Record<string, any>> {
    try {
        const [rows] = await conn.execute(`
            SELECT
                ft.reservation_id,
                ft.ft_ppv_planned,     ft.ft_ppv_actual,    ft.ft_ppv_time_delay,
                ft.ft_ppv_doer_name,   ft.ft_ppv_payment_recv_status, ft.ft_ppv_remarks,
                ft.ft_ppv_actual_recv_amount,
                ft.ft_fpbr_planned,    ft.ft_fpbr_actual,   ft.ft_fpbr_time_delay,
                ft.ft_fpbr_doer_name,  ft.ft_fpbr_release_status,
                ft.ft_fpbr_pms_block_status, ft.ft_fpbr_remarks,
                nb.booking_status, nb.booking_taken_by, nb.company_name, nb.data_source_auto,
                nbs.nb_bvs_action_status
            FROM ktahv_bookings_fms_v3_ft_final_transfer ft
            LEFT JOIN ktahv_bookings_fms_v3_part1 nb ON ft.reservation_id = nb.reservation_id
            LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs ON ft.reservation_id = nbs.reservation_id
        `);

        return buildAccountsMap(rows, {
            accountsPlanned: "ft_ppv_planned", accountsActual: "ft_ppv_actual",
            accountsDelay: "ft_ppv_time_delay", accountsDoer: "ft_ppv_doer_name",
            accountsStatus: "ft_ppv_payment_recv_status", accountsReamrks: "ft_ppv_remarks",
            accountsDate: "ft_ppv_actual", accountsAmount: "ft_ppv_actual_recv_amount",
            foPlanned: "ft_fpbr_planned", foActual: "ft_fpbr_actual",
            foDelay: "ft_fpbr_time_delay", foDoer: "ft_fpbr_doer_name",
            foReamrks: "ft_fpbr_remarks", foDate: "ft_fpbr_actual",
            foStatusA: "ft_fpbr_release_status", foStatusB: "ft_fpbr_pms_block_status",
        });
    } finally {
        conn?.release();
    }
}

/** Shared mapper for AccountsVerify and FinalTransfer stage maps */
function buildAccountsMap(rows: any[], col: Record<string, string>): Record<string, any> {
    const map: Record<string, any> = {};
    for (const r of rows) {
        if (!r.reservation_id) continue;
        map[String(r.reservation_id)] = {
            pmsStatus: r.booking_status || "",
            takenBy: r.booking_taken_by || "",
            company: r.company_name || "",
            salesPersonStatus: r.nb_bvs_action_status || "",
            accountsPlanned: r[col.accountsPlanned] || "",
            accountsActual: r[col.accountsActual] || "",
            accountsDelay: r[col.accountsDelay] || "",
            accountsDoer: r[col.accountsDoer] || "",
            accountsStatus: r[col.accountsStatus] || "",
            accountsReamrks: r[col.accountsReamrks] || "",
            accountsDate: r[col.accountsDate] || "",
            accountsAmount: r[col.accountsAmount] || "",
            foPlanned: r[col.foPlanned] || "",
            foActual: r[col.foActual] || "",
            foDelay: r[col.foDelay] || "",
            foDoer: r[col.foDoer] || "",
            foStatus: r[col.foStatusA] && r[col.foStatusB] ? `${r[col.foStatusA]}-${r[col.foStatusB]}` : "",
            foReamrks: r[col.foReamrks] || "",
            foDate: r[col.foDate] || "",
            dSrc: r.data_source_auto || "",
        };
    }
    return map;
}

async function getDeleteStageMap(conn: any): Promise<Record<string, any>> {
    try {
        const [rows] = await conn.execute(`
            SELECT
                reservation_id,
                dcpv_planned,  dcpv_actual,  dcpv_time_delay,
                dcpv_doer_name, dcpv_payment_upload_status, dcpv_remarks,
                dc_afpv_planned, dc_afpv_actual, dc_afpv_time_delay,
                dc_afpv_doer_name, dc_afpv_payment_received_status, dc_afpv_remarks,
                dc_afpv_actual_received_amount
            FROM ktahv_bookings_fms_v3_dc_delete_complete
        `);

        const map: Record<string, any> = {};
        for (const r of rows) {
            if (!r.reservation_id) continue;
            map[String(r.reservation_id)] = {
                foPlanned: r.dcpv_planned || "",
                foActual: r.dcpv_actual || "",
                foDelay: r.dcpv_time_delay || "",
                foDoer: r.dcpv_doer_name || "",
                foStatus: r.dcpv_payment_upload_status || "",
                foReamrks: r.dcpv_remarks || "",
                accountsPlanned: r.dc_afpv_planned || "",
                accountsActual: r.dc_afpv_actual || "",
                accountsDelay: r.dc_afpv_time_delay || "",
                accountsDoer: r.dc_afpv_doer_name || "",
                accountsStatus: r.dc_afpv_payment_received_status || "",
                accountsReamrks: r.dc_afpv_remarks || "",
                accountsAmount: r.dc_afpv_actual_received_amount || "",
                paymentActual: r.dcpv_payment_upload_status || "",
                paymentStatus: r.dcpv_payment_upload_status ? "Done" : r.dcpv_payment_upload_status,
                paymentRemarks: r.dcpv_remarks || "",
                paymentDelay: r.dcpv_time_delay || "",
            };
        }
        return map;
    } finally {
        conn?.release();
    }
}

async function getNameMapResp(conn: any): Promise<Record<string, string>> {
    try {
        const [rows] = await conn.execute(`SELECT name, password FROM ktahv_bk_cred`);
        const names: Record<string, string> = {};
        for (const r of rows) {
            if (r.name && r.password) names[String(r.password)] = r.name;
        }
        return names;
    } finally {
        conn?.release();
    }
}

async function getPendingDataMap(conn: any): Promise<Record<string, any>> {
    try {
        const [rows] = await conn.execute(`
            SELECT reservation_id, nb_bvs_planned, nb_bvs_actual, nb_bvs_doer
            FROM ktahv_bookings_fms_v3_nb_booking_verification_stage
        `);
        const map: Record<string, any> = {};
        for (const r of rows) {
            if (!r.reservation_id) continue;
            map[String(r.reservation_id)] = {
                deadline: r.nb_bvs_planned || null,
                completion: r.nb_bvs_actual || null,
                assigned: r.nb_bvs_doer || null,
            };
        }
        return map;
    } finally {
        conn?.release();
    }
}

async function getMainBookingsData(conn: any): Promise<any[]> {
    try {
        const [rows] = await conn.execute(`
            SELECT nb.*,
                nbs.nb_bvs_action_status, nbs.nb_bvs_doer_remarks, nbs.nb_bvs_actual,
                nbs.nb_bvs_reason_of_cancellation, nbs.nb_bvs_doer, nbs.nb_bvs_pi_gen_status,
                nbs.nb_bvs_pi_number, nbs.nb_bvs_pi_link, nbs.nb_bvs_time_delay, nbs.nb_bvs_planned
            FROM ktahv_bookings_fms_v3_part1 nb
            LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs
                ON nb.reservation_id = nbs.reservation_id
            ORDER BY timestamp DESC
        `);
        return rows;
    } finally {
        conn?.release();
    }
}
async function getGuesttrackerData(guestconn: any): Promise<any[]> {
    try {
        const [rows] = await guestconn.execute(`
            SELECT 
            gt.booking_id,
            gt.primary_secondary,
            gt.arrival_planned,
            gt.arrival_actual,
            gt.arrival_time_delay,
            gt.arrival_tickets_upload_link,
            gt.confirm_guest_requests_doctor,
            gt.arrival_doer_name,
            gt.client_arrival_data_upload_status,
            gt.arrival_boarding_pass_upload_link,
            gt.client_arrival_data_upload_remarks,
            gt.arrival_boarding_pass_upload_datetime,
            gt.arrival_counts_st1,
            gt.booking_status_if_cancelled,
            gt.departure_planned,
            gt.departure_actual,
            gt.departure_time_delay,
            gt.departure_tickets_upload_link,
            gt.departure_boarding_pass_upload_link,
            gt.departure_doer_name,
            gt.client_departure_data_upload_status,
            gt.client_departure_data_upload_remarks,
            gt.departure_boarding_pass_upload_datetime,
            gt.departure_counts_st1,
            gt.wheel_chair_requirement_noted,
            gt.special_request_or_requirement_noted,
            gt.doctor_assigned_to_the_client
            FROM ktahv_guest_tracker gt
            LEFT JOIN ktahv_bookings_fms_v3_part1 nb
            ON nb.reservation_id = gt.booking_id COLLATE utf8mb4_unicode_ci
            `);
        let datamap = {};
        for (let i = 0; i < rows.length; i++) {
            let r = rows[i];
            datamap[String(r.booking_id).trim()] = {
                primary_secondary: r.primary_secondary,
                arrival_planned: r.arrival_planned,
                arrival_actual: r.arrival_actual,
                arrival_time_delay: r.arrival_time_delay,
                arrival_tickets_upload_link: r.arrival_tickets_upload_link,
                confirm_guest_requests_doctor: r.confirm_guest_requests_doctor,
                arrival_doer_name: r.arrival_doer_name,
                client_arrival_data_upload_status: r.client_arrival_data_upload_status,
                arrival_boarding_pass_upload_link: r.arrival_boarding_pass_upload_link,
                client_arrival_data_upload_remarks: r.client_arrival_data_upload_remarks,
                arrival_boarding_pass_upload_datetime: r.arrival_boarding_pass_upload_datetime,
                arrival_counts_st1: r.arrival_counts_st1,
                booking_status_if_cancelled: r.booking_status_if_cancelled,
                departure_planned: r.departure_planned,
                departure_actual: r.departure_actual,
                departure_time_delay: r.departure_time_delay,
                departure_tickets_upload_link: r.departure_tickets_upload_link,
                departure_boarding_pass_upload_link: r.departure_boarding_pass_upload_link,
                departure_doer_name: r.departure_doer_name,
                client_departure_data_upload_status: r.client_departure_data_upload_status,
                client_departure_data_upload_remarks: r.client_departure_data_upload_remarks,
                departure_boarding_pass_upload_datetime: r.departure_boarding_pass_upload_datetime,
                departure_counts_st1: r.departure_counts_st1,
                doctor_assigned_to_the_client: r.doctor_assigned_to_the_client,
                special_request_or_requirement_noted: r.special_request_or_requirement_noted,
                wheel_chair_requirement_noted: r.wheel_chair_requirement_noted
            }

        }
        return datamap;
    } finally {
        guestconn?.release();
    }
}
// ─── Pure helpers ─────────────────────────────────────────────────────────────

function normalizeName(name: unknown): string {
    if (!name || String(name).trim() === "") return "";
    return String(name)
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function resolveCanonicalName(
    rawName: string,
    names: Record<string, string>,
    canonicalMap: Record<string, string>,
    empMap: Record<string, EmpCounts>,
): string {
    const resolved = names[rawName] ?? rawName;
    const normalized = normalizeUserName(resolved);
    if (!normalized) return "";
    if (normalized in canonicalMap) return canonicalMap[normalized];

    // New name is a prefix of an existing canonical → alias to it
    for (const existing in canonicalMap) {
        const canon = canonicalMap[existing];
        if (canon.toLowerCase().startsWith(normalized.toLowerCase()) && canon.length > normalized.length) {
            canonicalMap[normalized] = canon;
            return canon;
        }
    }

    // New name is longer and starts with an existing canonical → promote it
    for (const existing in canonicalMap) {
        const canon = canonicalMap[existing];
        if (normalized.toLowerCase().startsWith(canon.toLowerCase()) && normalized.length > canon.length) {
            // Remap all aliases pointing to the old canonical
            for (const k in canonicalMap) {
                if (canonicalMap[k] === canon) canonicalMap[k] = normalized;
            }
            // Merge empMap counts
            if (canon in empMap) {
                empMap[normalized] ??= [0, 0, 0, 0];
                for (let i = 0; i < 4; i++) empMap[normalized][i] += empMap[canon][i];
                delete empMap[canon];
            }
            canonicalMap[normalized] = normalized;
            return normalized;
        }
    }

    canonicalMap[normalized] = normalized;
    return normalized;
}

function getUnderAutoReleaseStatus(
    salesStatus: string, pmsStatus: string, receivedPercentage: number,
    th40: number, th100: number,
    approvalTill: Date | "",
    bookingDate: Date, checkIn: Date, checkOut: Date,
    today: Date, _resId: string,
) {
    const EXCLUDED_STATUSES = new Set(["Booking Cancelled", "Complimentary", "Voucher"]);

    if (EXCLUDED_STATUSES.has(salesStatus) || pmsStatus === "Cancelled") {
        return { status: false, reason: "Booking status is excluded (Cancelled/Complimentary/Voucher)" };
    }

    if (checkIn <= today || checkOut <= today) {
        return { status: false, reason: "Stay has already started or ended" };
    }

    const bookingPlus4Days = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate() + 4);

    const approvalExpiry: Date | "" = approvalTill instanceof Date
        ? new Date(approvalTill.getFullYear(), approvalTill.getMonth(), approvalTill.getDate() + 1)
        : "";

    if (bookingPlus4Days > today) {
        return { status: false, reason: "Booking is within 4-day grace period (booking date + 4 days is still in future)" };
    }

    if (approvalTill !== "" && approvalTill >= today) {
        return { status: false, reason: "Management approval is still valid" };
    }

    if (th40 <= 0 && receivedPercentage < 40) {
        const checkInMinus40 = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate() + 5);
        const releaseDate = new Date(Math.max(bookingPlus4Days.getTime(), approvalExpiry ? approvalExpiry.getTime() : 0, checkInMinus40.getTime()));
        return { status: releaseDate, reason: `Payment received (${receivedPercentage || 0}%) is below 40% threshold and 40% payment deadline has passed` };
    }

    if (th100 < 30 && receivedPercentage < 99) {
        const checkInMinus30 = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() - 30);
        const releaseDate = new Date(Math.max(bookingPlus4Days.getTime(), approvalExpiry ? approvalExpiry.getTime() : 0, checkInMinus30.getTime()));
        return { status: releaseDate, reason: `Full payment (${receivedPercentage || 0}%) not received and check-in is within 30 days` };
    }

    return { status: false, reason: "Booking does not meet auto-release criteria" };
}

function getStatusFast(
    resId: string, map: Record<string, any>, autoReleasedMap: Record<string, any>,
    flag: boolean | true,
    salesPersonRemark: string | null, salesPersonReason: string | null,
    salesPersonDoneDate: string | null, pmsStatusNew?: string,
    pmsRemarks?: string, pmsActualReceived?: string, salesPersonSt?: string,
) {
    const d = map[resId];


    if (flag) {
        if (!d) return 'Unverified';
        return (d.pmsStatus != "Cancelled" &&
            ((d.salesPersonStatus == "Edit Required" || d.salesPersonStatus == "Complimentary" || d.salesPersonStatus == "Voucher") && d.salesPersonStatus !== "" && salesPersonDoneDate != "") &&
            ((d.accountsStatus == "Payment Not Received But Approval Taken" || d.accountsStatus == "Payment Received" || d.accountsStatus == "Complimentary" || d.accountsStatus == "Voucher") && d.accountsActual != "") &&
            ((d.foStatus == "PASS-No Action" || d.foStatus == "Complimentary-No Action" || d.foStatus == "Voucher-No Action") && d.foActual != "")) ? 'Confirm-Verified' : 'Unverified';
    } else {
        if (!d) {
            if (salesPersonSt == "Booking Cancelled") {
                return ["Cancelled", salesPersonDoneDate, salesPersonRemark];
            } else if (pmsStatusNew == "Cancelled") {
                return ["Cancelled", pmsActualReceived, pmsRemarks];
            }
            return ['pending', null, null];
        }

        let cancelDate = null;
        let cancelRemarks = null;

        if (d.pmsStatus == "Cancelled") {
            cancelDate = pmsActualReceived || null;
            cancelRemarks = pmsRemarks || "";
        } else if (d.salesPersonStatus === "Booking Cancelled") {
            cancelDate = salesPersonDoneDate || null;
            cancelRemarks = salesPersonRemark || "";
        } else if (d.accountsStatus === "Booking Cancelled") {
            cancelDate = d.accountsDate || null;
            cancelRemarks = d.accountsReamrks || "";
        } else if (d.foStatus.indexOf("Cancelled") > -1) {
            cancelDate = d.foDate || null;
            cancelRemarks = d.foReamrks || "";
        }

        return (((d.pmsStatus == "Cancelled") ||
            (d.salesPersonStatus === "Booking Cancelled") ||
            (d.accountsStatus === "Booking Cancelled") ||
            (d.foStatus.indexOf("Cancelled") > -1)) &&
            !(resId in autoReleasedMap))
            ? ["Cancelled", cancelDate, cancelRemarks]
            : ["Active", null, null];
    }
}

function getActivityStatus(resId: string, map: Record<string, any>): string {
    var d = map[resId];
    if (!d) return 'pending';
    return d.pmsStatus == "Cancelled" || d.salesPersonStatus === "Booking Cancelled" || d.accountsStatus === "Booking Cancelled" || d.foStatus.toString().indexOf("Booking Cancelled") > -1 ? "Cancelled" : "Active";
}

function foundSource(salePerson: string, company: string, dsrc: string): string {
    if (company === "Online Reservation") return "Online Reservation";
    if (CHANNEL_MANAGERS.has(company)) return "OTA";
    if (dsrc === "Travel Agent") return "Travel Agent";
    if (dsrc === "Reference" || dsrc === "Referral") return "Referral";
    if (AGENTS.has(salePerson)) return "Offline";
    return "Others";
}

/**
 * Parses the same date shapes parseIndianDateTime/parseIndianDateTimeatual accept
 * (a Date instance, a "DD/MM/YYYY[ HH:MM:SS]" string, or anything Date() can fall
 * back on) into an actual Date object, instead of the formatted display string
 * those two return. Used by isOverdue, which needs something it can compare with `>`.
 */
function parseDeadlineDate(value: unknown): Date | null {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (value == null || value === "") return null;
    if (typeof value === "number") return null;

    const str = String(value).trim();
    if (!str) return null;

    // Handles "DD/MM/YYYY HH:MM:SS" or "MM/DD/YYYY" formats
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
    if (m) {
        const p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), yr = parseInt(m[3], 10);
        const hr = parseInt(m[4] ?? "0", 10), min = parseInt(m[5] ?? "0", 10), sec = parseInt(m[6] ?? "0", 10);
        const [month, day] = p1 > 12 ? [p2 - 1, p1] : [p1 - 1, p2];
        const parsed = new Date(yr, month, day, hr, min, sec);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
}

function getISTParts(d: Date): Record<string, string> {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(d);
    return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

function parseIndianDateTime(value: unknown): string | null {
    let d: Date | null = null;

    if (value instanceof Date) {
        d = isNaN(value.getTime()) ? null : value;
    } else if (value == null || value === "") {
        d = null;
    } else if (typeof value === "number") {
        d = null; // epoch-style not supported
    } else {
        const str = String(value).trim();
        if (!str) return null;

        const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
        if (m) {
            const p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), yr = parseInt(m[3], 10);
            const hr = parseInt(m[4] ?? "0", 10), min = parseInt(m[5] ?? "0", 10), sec = parseInt(m[6] ?? "0", 10);
            // Disambiguate day/month: whichever exceeds 12 must be the day
            const [month, day] = p1 > 12 ? [p2 - 1, p1] : [p1 - 1, p2];
            const parsed = new Date(yr, month, day, hr, min, sec);
            d = isNaN(parsed.getTime()) ? null : parsed;
        } else {
            const fallback = new Date(str);
            d = isNaN(fallback.getTime()) ? null : fallback;
        }
    }

    if (!d) return null;
    const map = getISTParts(d);
    return `${map.month}/${map.day}/${map.year} ${map.hour}:${map.minute}:${map.second}`;
}

function parseIndianDateTimeatual(value: unknown): string | null {
    let d: Date | null = null;

    if (value instanceof Date) {
        d = isNaN(value.getTime()) ? null : value;
    } else if (value == null || value === "") {
        d = null;
    } else if (typeof value === "number") {
        d = null; // epoch-style not supported
    } else {
        const str = String(value).trim();
        if (!str) return null;

        const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
        if (m) {
            const p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), yr = parseInt(m[3], 10);
            const hr = parseInt(m[4] ?? "0", 10), min = parseInt(m[5] ?? "0", 10), sec = parseInt(m[6] ?? "0", 10);
            // Disambiguate day/month: whichever exceeds 12 must be the day
            const [month, day] = p1 > 12 ? [p2 - 1, p1] : [p1 - 1, p2];
            const parsed = new Date(yr, month, day, hr, min, sec);
            d = isNaN(parsed.getTime()) ? null : parsed;
        } else {
            const fallback = new Date(str);
            d = isNaN(fallback.getTime()) ? null : fallback;
        }
    }

    if (!d) return null;
    const map = getISTParts(d);
    return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}:${map.second}`;
}