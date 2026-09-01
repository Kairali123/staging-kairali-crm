"use client";
import { useEffect, useState } from "react";

/**
 * Numeric/code decoding maps are GONE on purpose. The
 * villa_raag_client_booking_fms table already stores decoded text values
 * (e.g. booking_source = "DIRECT", source_type = "DIRECT_WALK_IN") — the
 * exact same enum strings the old GAS hook used to produce by decoding
 * numeric channel codes. So we just pass them through.
 */

function getNumeric(item: any, ...keys: string[]) {
    for (const k of keys) {
        if (!item || !(k in item)) continue;
        const raw = item[k];
        if (raw === null || raw === undefined || raw === "") continue;
        if (typeof raw === "number") {
            if (!Number.isNaN(raw)) return raw;
            continue;
        }
        const cleaned = String(raw).replace(/[^0-9.-]/g, "");
        if (cleaned === "") continue;
        const n = Number(cleaned);
        if (!Number.isNaN(n)) return n;
    }
    return undefined;
}

function getString(item: any, ...keys: string[]) {
    for (const k of keys) {
        if (!item || !(k in item)) continue;
        const v = item[k];
        if (v === null || v === undefined) continue;
        const s = String(v).trim();
        if (s !== "" && s.toUpperCase() !== "NULL") return s;
    }
    return undefined;
}

export function useActiveVillaBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchBookings() {
            try {
                const res = await fetch("/api/villa-bookings");
                if (!res.ok) throw new Error("Failed to fetch villa bookings");
                const data = await res.json();

                const formatted = data.map((item: any, index: number) => {
                    const invoiceAmount = getNumeric(item, "invoice_amount") ?? 0;

                    // ASSUMPTION confirmed from sample rows: total_received_amount is the
                    // authoritative "amount actually received" field. `total_payments`
                    // looked like it sometimes mirrors invoice_amount instead of the
                    // amount paid (saw a row with total_payments = invoice_amount but
                    // total_received_amount = 0 and pending_amount = full invoice) —
                    // so total_payments is intentionally NOT used for receivedAmount.
                    const receivedAmount = getNumeric(item, "total_received_amount") ?? 0;

                    // ---- Status normalization ----
                    // Confirmed format from sample data: booking_status = "Cancelled"
                    // (Title Case, plain English — no numeric codes). Matching is done
                    // case-insensitively via includes(), so casing variations are safe.
                    const statusRaw = (getString(item, "booking_status") || "").toLowerCase();
                    let status: string;
                    if (statusRaw.includes("cancel")) status = "cancelled";
                    else if (statusRaw.includes("no show")) status = "No Show";
                    else if (statusRaw.includes("hold")) status = "hold";
                    else if (statusRaw.includes("confirm")) status = "confirmed";
                    else status = "pending";

                    const percentReceived = getNumeric(item, "percent_received_amount") ??
                        (invoiceAmount === 0
                            ? (receivedAmount > 0 ? 100 : 0)
                            : Math.round((receivedAmount / invoiceAmount) * 100));

                    const paymentStatus =
                        percentReceived >= 100 ? "paid" : percentReceived > 0 ? "partial" : "pending";

                    // ---- Booking source normalization ----
                    // Confirmed: booking_source comes through as "DIRECT" (matches the old
                    // CHANNELS enum names). page.tsx does exact-string checks in a few
                    // places (b.source === "Direct Booking", === "OTA", === "Travel Agent"),
                    // so map the known channel names the same way the old hook did and pass
                    // anything unrecognized straight through unchanged.
                    const sourceRaw = (getString(item, "booking_source") || "").toUpperCase();
                    let source: string;
                    if (sourceRaw === "DIRECT" || sourceRaw === "OFFLINE_AGENT") {
                        source = "Direct Booking";
                    } else if (sourceRaw === "BOOKING_ENGINE") {
                        source = "Online Booking Engine";
                    } else if (sourceRaw === "OTA") {
                        source = "OTA";
                    } else {
                        source = getString(item, "booking_source") || "API Import";
                    }

                    const sourceType = getString(item, "source_type") || "";

                    // ---- Pay at hotel ----
                    // Confirmed format: "Yes" / "No" (Title Case).
                    const payAtHotelRaw = (getString(item, "pay_at_hotel") || "").toLowerCase();
                    const payAtHotel =
                        payAtHotelRaw === "yes" || payAtHotelRaw === "true" || payAtHotelRaw === "1"
                            ? true
                            : payAtHotelRaw === "no" || payAtHotelRaw === "false" || payAtHotelRaw === "0"
                                ? false
                                : undefined;

                    // ---- Complimentary ----
                    // All sample rows had this NULL, so the non-empty format is unconfirmed.
                    // Handles boolean-style strings and falls back to the raw value otherwise.
                    const compRaw = (getString(item, "complimentary_status") || "").toLowerCase();
                    const complimentary =
                        compRaw === "" ? null
                            : ["yes", "true", "1"].includes(compRaw) ? true
                                : ["no", "false", "0"].includes(compRaw) ? false
                                    : getString(item, "complimentary_status");

                    // ---- Single payment record ----
                    // This table stores one cumulative payment snapshot per booking row,
                    // not a full installment history (full history lives behind
                    // payment_collection_history_link). So derivedPaymentRecords in
                    // page.tsx will only ever show 0 or 1 entries here.
                    const receivedAmountSingle = getNumeric(item, "received_amount");
                    const paymentRecords = receivedAmountSingle
                        ? [{
                            amount: receivedAmountSingle,
                            method: getString(item, "payment_mode") || "Unknown",
                            date: item["payment_received_datetime"] || item["booking_date_time"] || "",
                            receiptNumber: getString(item, "receipt_transaction_number"),
                            collectedBy: getString(item, "payment_collection_by"),
                        }]
                        : [];

                    const id = String(
                        (getString(item, "unique_id") ||
                            getString(item, "booking_id") ||
                            getString(item, "reservation_number") ||
                            "") + "-" + index
                    );

                    return {
                        id,
                        bookingId: getString(item, "booking_id") || "",
                        reservationNo: getString(item, "reservation_number") || "",
                        bookingDateTime: item["booking_date_time"] || "",

                        guestName: getString(item, "name_of_client") || "",
                        bookerName: getString(item, "name_of_the_booker") || "",
                        mobile: getString(item, "mobile") || "",
                        email: getString(item, "guest_email") || "",
                        country: getString(item, "country") || "",

                        checkIn: item["arrival_date"] || "",
                        checkInTime: item["check_in_time"] || "",
                        checkOut: item["departure_date"] || "",
                        checkOutTime: item["check_out_time"] || "",
                        lengthOfStay: getNumeric(item, "length_of_stay", "total_room_nights"),

                        mealPlan: getString(item, "meal_plan_type", "meal_plans") || "",
                        plan: getString(item, "meal_plan_type", "meal_plans") || "",

                        villaType: "Villa Raag",
                        villaNumber: getString(item, "room_no") || "N/A",
                        roomName: getString(item, "room_category") || "N/A",
                        roomCategory: getString(item, "room_category") || "",
                        noOfRooms: getNumeric(item, "no_of_rooms"),
                        totalPax: getNumeric(item, "total_pax", "number_of_adults") ?? 0,

                        amount: invoiceAmount,
                        receivedAmount,
                        totalRoomCost: getNumeric(item, "room_price"),
                        addonsTotal: getNumeric(item, "add_ons_price"),
                        outletRevenue: getNumeric(item, "outlet_price"),
                        discountTotal: Math.abs(getNumeric(item, "discount_amount") ?? 0),
                        taxesAmount: getNumeric(item, "taxes"),
                        subTotalAmount: getNumeric(item, "subtotal"),
                        netPayable: getNumeric(item, "net_payable_a") ?? invoiceAmount,
                        finalTotalAmount: invoiceAmount,
                        paymentsAmount: receivedAmount,
                        netPaymentsByGuest: getNumeric(item, "net_payable_by_guest"),
                        netPayableAtHotel: getNumeric(item, "net_payable_a"),

                        invoiceNumber: getString(item, "invoice_number") || "",
                        invoiceUrl: getString(item, "invoice_url") || "",
                        InvoiceHistoryLink: getString(item, "invoice_history_url") || "",
                        PaymentCollectionHistoryLink: getString(item, "payment_collection_history_link") || "",
                        cancellationRemarks: getString(item, "cancellation_remarks") || "",

                        approvedTillDate: "",
                        status,
                        assignedTo: getString(item, "booking_taken_by") || "",
                        salesperson: getString(item, "booking_taken_by") || "",
                        contactNumber: getString(item, "mobile") || "",
                        team: "sales",
                        createdDate: item["booking_date_time"] || "",
                        lastUpdated: item["last_edit_date"] || "",
                        lastModifiedOn: item["last_edit_date"] || "",
                        lastModifiedBy: getString(item, "last_modified_by") || "",

                        source,
                        sourceType,
                        bookingSubSource: sourceType,
                        bookingType: getString(item, "booking_type") || "",

                        paymentStatus,
                        receivedPercentage: percentReceived,
                        payAtHotel,
                        complimentary,
                        complimentaryStatus: getString(item, "complimentary_status") || "",

                        salesTeamStatus:
                            status === "cancelled" ? "completed"
                                : status === "hold" ? "on_hold"
                                    : status === "confirmed" ? "completed"
                                        : "pending",
                        accountsVerifyStatus:
                            status === "cancelled" ? "booking_cancelled"
                                : paymentStatus === "paid" ? "payment_verified"
                                    : "pending",
                        frontOfficeStatus:
                            status === "cancelled" ? "booking_cancelled"
                                : status === "confirmed" ? "pms_verified_done"
                                    : "pending",
                        paymentSettlementStatus:
                            status === "cancelled" ? "booking_cancelled"
                                : paymentStatus === "paid" ? "full_payment_received"
                                    : paymentStatus === "partial" ? "partial_payment"
                                        : "pending",

                        totalAmount: String(invoiceAmount || 0),
                        paidAmount: String(receivedAmount || 0),
                        paymentRecords,
                    };
                });

                setBookings(formatted);
            } catch (err: any) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        fetchBookings();
    }, []);

    return { bookings, loading, error, setBookings };
}
