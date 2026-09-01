"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeUserName } from "../lib/utils";

// -----------------------------------------------------
// FINAL BOOKING TYPE (ALL API FIELDS INCLUDED)
// -----------------------------------------------------
export interface Booking {
  id: string;
  bookingId: string;

  // Guest
  guestName: string;
  guestId: string;
  mobile: string;
  email: string;
  gender: string;
  billingAddress: string;
  state: string;
  district: string;
  country: string;
  countryCode: string;
  guestStatus: string;
  guestHistory: string;
  nationality: string;

  // Room
  roomNumber: string;
  roomType: string;
  roomCategory: string;

  // Dates
  checkIn: string;
  checkOut: string;
  bookingDate: string;
  createdDate: string;
  lastUpdated: string;

  // Programme
  programmeName: string;

  // Payment
  amount: number;
  discountPercent: number;
  discount: number;
  amountRecieved: number;
  totalAmountBeforeDiscount: number;
  totalAmountReceived: number;
  balance: number;
  pendingAmount: number;

  currency: string;
  originalAmount: string;
  paymentReceivedDate: string;
  paymentMode: string;
  receiptNumber: string;
  paymentLocation: string;
  collectionBy: string;
  paymentSettlementStatus: string;

  uploadScreenShot: string;
  paymentCollectionHistory: any[];
  paymentHistoryLink: string;

  // Payment Internal
  receivedAmount: number;
  receivedPercentage: number;
  paymentStatus: "pending" | "payment_pending" | "partial" | "paid";

  // Booking details
  bookingStatus: string;
  bookingType: string;
  bookingTakenBy: string;
  groupBooking: string;
  dataSource: string;

  // PI
  piLink: string;
  piNumber: string;

  // Cancel info
  cancelledRemarks: string;
  cancelledReason: string;

  // Additional booking logs
  approvalGivenDate: string;
  approvedTillDate: string;
  approvalScreenShot: string;
  approvalRemarks: string;
  approvedBy: string;

  mlsummary: string;
  editActionStatus: string;

  purposeOfStay: string;
  adults: string;
  male: string;
  female: string;
  children: string;
  repeat: string;
  clientCategory: string;
  clientType: string;
  bookerEmail: string;
  bookerPhone: string;

  // Cross-team statuses
  salesTeamStatus?: string;
  accountsVerifyStatus: string;
  paymentSettlement: string;
  frontOfficeStatus: string;
  verfiedOrNot: string;

  source: string;
  assignedTo: string;
  team: "sales" | "accounts";

  totalAmount: string;
  paidAmount: string;

  status: string;

  whatsappToClient: string;
  whatsappToStaff: string;
  emailToClient: string;
  emailToStaff: string;

  editID: string;
  doerDelay: string;
  accountsDelay: string;
  foDelay: string;
  paymentDelay: string;

  isAutoReleased: string;
  autoRelease: any;
  autoreleaseReason: string;
  autoReleasedAt: string;
  autoReleaseNotes: string;
  cancelByUserCheck: string;
  piHistoryLink: string;
  bSource: string;
  collectionHistory: any[];
  salesPersonStage: Map<string, string>;
  accountsPersonStage: Map<string, string>;
  foPersonStage: Map<string, string>;
  checkOutPersonStage: Map<string, string>;
  arrivalTime?: string
  arrivalMode?: string
  arrivalPickup?: string
  departureTime?: string
  departureMode?: string
  departurePickup?: string
  mlFinalStatus?: string
  mlRemarks?: string
  isEditedOneTime?: boolean
  checkInIdExist?: boolean
  rawItem?: any;

  // Guest tracker data (from ktahv_guest_tracker)
  guesttrackerdata?: {
    exists?: boolean;
    primary_secondary: string;
    arrivalstage: {
      arrival_planned: string;
      arrival_actual: string;
      arrival_time_delay: string;
      arrival_tickets_upload_link: string;
      confirm_guest_requests_doctor: string;
      arrival_doer_name: string;
      client_arrival_data_upload_status: string;
      arrival_boarding_pass_upload_link: string;
      client_arrival_data_upload_remarks: string;
      arrival_boarding_pass_upload_datetime: string;
      arrival_counts_st1: string;
      booking_status_if_cancelled: string;
    };
    departurestage: {
      departure_planned: string;
      departure_actual: string;
      departure_time_delay: string;
      departure_tickets_upload_link: string;
      departure_boarding_pass_upload_link: string;
      departure_doer_name: string;
      client_departure_data_upload_status: string;
      client_departure_data_upload_remarks: string;
      departure_boarding_pass_upload_datetime: string;
      departure_counts_st1: string;
    };
  };
}

export interface PendingCount {
  employeeName: string;
  newBookings: number;
  accountVerify: number;
  finalTransfer: number;
  deleteComplete: number;
}

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------
const toNumber = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(String(val).replace(/[₹$,]/g, ""));
  return isNaN(num) ? 0 : num;
};

const normalizeStatus = (s: string): any => {
  s = (s || "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("auto")) return "auto_release";
  if (s.includes("pending")) return "pending";
  return "Confirm-Verified";
};

const computePaymentStatus = (amount: number, received: number): any => {
  if (received === 0) return "payment_pending";
  if (received >= amount) return "paid";
  return "partial";
};

// SOURCE NORMALIZER
const normalizeSource = (s?: string | null) => {
  const v = (s ?? "").trim().toLowerCase();
  if (!v) return "Others";

  if (v.includes("online") || v.includes("website") || v.includes("portal") || v.includes("web"))
    return "Online Booking Engine";
  if (v.includes("ota") || v.includes("booking.com"))
    return "OTA";
  if (v.includes("agent") || v.includes("travel"))
    return "Travel Agent";
  if (v.includes("direct"))
    return "Direct Booking";

  return "Others";
};

// -----------------------------------------------------
// FINAL UPDATED HOOK — ALL API FIELDS INCLUDED
// -----------------------------------------------------
export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<PendingCount[]>([]);
  const [nameAliases, setNameAliases] = useState<{ [key: string]: string }>({});
  const [refreshToken, setRefreshToken] = useState(0);
  const refetchResolverRef = useRef<(() => void) | null>(null);

  const refetch = useCallback(() => {
    return new Promise<void>((resolve) => {
      refetchResolverRef.current = resolve;
      setRefreshToken((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const SCRIPT_URL = "/api/ktahv-bookings";
        const MAX_RETRIES = 2;
        const ATTEMPT_TIMEOUT_MS = 20000;
        let json: any = null;
        let succeeded = false;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          if (!isMounted || abortController.signal.aborted) return;

          // Per-attempt controller: a timeout aborts only this attempt, while a
          // lifecycle abort is forwarded so unmount still cancels everything.
          const attemptController = new AbortController();
          const forwardAbort = () => attemptController.abort();
          abortController.signal.addEventListener("abort", forwardAbort);
          const releaseAbortListener = () =>
            abortController.signal.removeEventListener("abort", forwardAbort);

          let attemptTimeoutId: NodeJS.Timeout | null = setTimeout(() => {
            attemptTimeoutId = null;
            attemptController.abort();
          }, ATTEMPT_TIMEOUT_MS);
          const clearAttemptTimeout = () => {
            if (attemptTimeoutId) {
              clearTimeout(attemptTimeoutId);
              attemptTimeoutId = null;
            }
          };

          try {
            const res = await fetch(SCRIPT_URL, {
              cache: "no-store",
              signal: attemptController.signal
            });
            if (res.ok) {
              // The attempt timeout stays armed across the body read, so a hung
              // response body fails this attempt too — and, like a failed fetch,
              // is retried by this same loop instead of escaping to the caller.
              json = await res.json();
              succeeded = true;
              break;
            }
          } catch (attemptErr) {
            if (!isMounted || abortController.signal.aborted) return;
            console.warn(`Fetch attempt ${attempt} failed:`, attemptErr);
          } finally {
            clearAttemptTimeout();
            releaseAbortListener();
          }

          if (attempt < MAX_RETRIES) {
            if (!isMounted) return;
            // exponential backoff: 500ms, 1s, 2s, 4s...
            await new Promise((r) => {
              timeoutId = setTimeout(() => {
                timeoutId = null;
                r(null);
              }, 500 * 2 ** (attempt - 1));
            });
          }
        }

        if (!isMounted) return;

        if (!succeeded) {
          throw new Error(`Failed to fetch bookings after ${MAX_RETRIES} attempts`);
        }

        const data = json?.bookings || [];
        setNameAliases(json?.nameAliases || {});

        const formatted: Booking[] = data.map((item: any) => {
          try {
            const amount = toNumber(item?.paymentDetails?.amount);
            const orgAmount = toNumber(item?.paymentDetails?.amountOriginal);

            const amountRecieved = toNumber(item?.paymentDetails?.amountRecieved);
            const balance = toNumber(item?.paymentDetails?.balance);
            const receivedPct =
              orgAmount > 0 ? Number(((amountRecieved / orgAmount) * 100).toFixed(2)) : 0;

            const collectionHistoryArr = item?.collectionHistory || [];

            return {
              id: item?.id || "",
              bookingId: item?.bookingId || "",

              // Guest
              guestName: item?.guestDetails?.guestName || "-",
              guestId: item?.guestDetails?.guestID || "",
              mobile: item?.guestDetails?.mobile || "",
              email: item?.guestDetails?.email || "",
              gender: item?.guestDetails?.gender || "",
              billingAddress: item?.guestDetails?.billingAddress || "",
              state: item?.guestDetails?.state || "",
              district: item?.guestDetails?.district || "",
              country: item?.guestDetails?.country || "",
              countryCode: item?.guestDetails?.countryCode || "",
              guestStatus: item?.guestDetails?.guestStatus || "",
              guestHistory: item?.guestDetails?.guestHistory || "",
              nationality: item?.guestDetails?.country || "",

              // Room
              roomNumber: item?.roomDetails?.roomNo || "",
              roomType: item?.roomDetails?.roomType || "",
              roomCategory: item?.roomDetails?.roomCategory || "",

              // Dates
              checkIn: item?.arrivalDate || "",
              checkOut: item?.departureDate || "",
              bookingDate: item?.bookingDate || "",
              createdDate: item?.bookingDate || "",
              lastUpdated: item?.timestamp || "",

              // Programme
              programmeName: item?.programeName || "-",

              // Payment
              amount,
              discountPercent: item?.paymentDetails?.discountPercent || 0,
              discount: item?.paymentDetails?.discount || 0,
              amountRecieved,
              totalAmountBeforeDiscount: toNumber(item?.paymentDetails?.totalAmountBeforeDiscount),
              totalAmountReceived: toNumber(item?.paymentDetails?.totalAmountReceived ?? amountRecieved),
              balance,
              pendingAmount: toNumber(item?.paymentDetails?.pendingAmount),
              currency: item?.paymentDetails?.currency || "",
              originalAmount: item?.paymentDetails?.amountOriginal || "",

              paymentReceivedDate: item?.paymentDetails?.paymentReceivedDate || "",
              paymentMode: item?.paymentDetails?.paymentMode || "",
              receiptNumber: item?.paymentDetails?.receiptNumber || "",
              paymentLocation: item?.paymentDetails?.paymentLocation || "",
              collectionBy: item?.paymentDetails?.collectionBy || "",

              uploadScreenShot: item?.paymentDetails?.uploadedScreenshot || "",
              paymentCollectionHistory: collectionHistoryArr,
              collectionHistory: collectionHistoryArr,
              paymentHistoryLink: item?.paymentDetails?.paymentCollectionHistory || "",

              receivedAmount: amountRecieved,
              receivedPercentage: receivedPct,
              paymentStatus: computePaymentStatus(orgAmount, amountRecieved),

              paymentSettlementStatus: amountRecieved >= orgAmount ? "Auto-Done" : item?.paymentSettlementStatus || "pending",
              // Booking Details
              bookingStatus: item?.bookingDetails?.bookingStatus || "",
              bookingType: item?.bookingDetails?.bookingType || "",
              bookingTakenBy: normalizeUserName(item?.bookingDetails?.bookingTakenBy || ""),
              groupBooking: item?.bookingDetails?.groupBooking || "",
              dataSource: item?.bookingDetails?.dataSource || "",

              // PI
              piLink: item?.piDetails?.piLink || "",
              piNumber: item?.piDetails?.piNumber || "",

              cancelledRemarks: item?.cancelledRemarks || "",
              cancelledReason: item?.cancelledReason || "",

              // Approval
              approvalGivenDate: item?.approvalGivenDate || "",
              approvedTillDate: item?.approvedTillDate || "",
              approvalScreenShot: item?.approvalScreenShot || "",
              approvalRemarks: item?.approvalRemarks || "",
              approvedBy: normalizeUserName(item?.approvedBy || ""),

              // Logs
              mlsummary: item?.mlsummary || "",
              editActionStatus: item?.editActionStatus || "pending",

              purposeOfStay: item?.purposeOfStay || "",
              adults: item?.adults || "0",
              male: item?.male || "0",
              female: item?.female || "0",
              children: item?.children || "0",
              repeat: item?.repeat || "",
              clientCategory: item?.clientCategory || "",
              clientType: item?.clientType || "",
              bookerEmail: item?.bookerEmail || "",
              bookerPhone: item?.bookerPhone || "",

              // Cross-team statuses from API
              salesTeamStatus: item?.editActionStatus || "",
              accountsVerifyStatus: item?.accountsVerifyStatus || item?.accountsVerificationStatus || "pending",
              paymentSettlement: item?.paymentSettlementStatus || "pending",
              frontOfficeStatus: item?.frontOfficeStatus || "pending",

              verfiedOrNot: item?.status || "Unverified",

              source: normalizeSource(item?.bookingDetails?.dataSource),
              assignedTo: normalizeUserName(item?.bookingDetails?.bookingTakenBy || ""),
              team: "sales",

              totalAmount: String(amount),
              paidAmount: String(amountRecieved),

              status: normalizeStatus(item?.bookingDetails?.bookingStatus),

              whatsappToClient: item?.whatsappToClient || "",
              whatsappToStaff: item?.whatsappToStaff || "",
              emailToClient: item?.emailToClient || "",
              emailToStaff: item?.emailToStaff || "",

              editID: item?.editID || "",
              isAutoReleased: item?.isAutoReleased || "",
              autoRelease: item?.autoRelease || "",
              autoreleaseReason: item?.autoReleaseReason || "",
              autoReleasedAt: item?.autoReleasedAt || "",
              autoReleaseNotes: item?.autoReleaseNotes || "",
              cancelByUserCheck: item?.cancelByUserCheck || "",
              piHistoryLink: item?.piHistoryLink || "",
              bSource: item?.bSource || "",
              doerDelay: item?.doerDelay || "",
              accountsDelay: item?.accountsDelay || "",
              foDelay: item?.foDelay || "",
              paymentDelay: item?.paymentDelay || "",
              salesPersonStage: item?.salesPersonStage || new Map<string, string>(),
              accountsPersonStage: item?.accountsPersonStage || new Map<string, string>(),
              foPersonStage: item?.foPersonStage || new Map<string, string>(),
              checkOutPersonStage: item?.checkoutPersonStage || new Map<string, string>(),
              // Travel Details
              arrivalTime: item?.travelDetails?.arrivalTime || "",
              arrivalMode: item?.travelDetails?.arrivalMode || "",
              arrivalPickup: item?.travelDetails?.arrivalPickup || "",
              departureTime: item?.travelDetails?.departureTime || "",
              departureMode: item?.travelDetails?.departureMode || "",
              departurePickup: item?.travelDetails?.departurePickup || "",

              mlFinalStatus: item?.mlDetails?.mlFinalStatus || "",
              mlRemarks: item?.mlDetails?.mlRemarks || "",
              isEditedOneTime: item?.isEditedOneTime || false,
              checkInIdExist: item?.checkinidexsist === true,
              rawItem: item,

              // Guest tracker data
              guesttrackerdata: item?.guesttrackerdata
                ? {
                  exists: item.guesttrackerdata.exists,
                  primary_secondary: item.guesttrackerdata.primary_secondary || "",
                  arrivalstage: {
                    arrival_planned: item.guesttrackerdata.arrivalstage?.arrival_planned || "",
                    arrival_actual: item.guesttrackerdata.arrivalstage?.arrival_actual || "",
                    arrival_time_delay: item.guesttrackerdata.arrivalstage?.arrival_time_delay || "",
                    arrival_tickets_upload_link: item.guesttrackerdata.arrivalstage?.arrival_tickets_upload_link || "",
                    confirm_guest_requests_doctor: item.guesttrackerdata.arrivalstage?.confirm_guest_requests_doctor || "",
                    arrival_doer_name: item.guesttrackerdata.arrivalstage?.arrival_doer_name || "",
                    client_arrival_data_upload_status: item.guesttrackerdata.arrivalstage?.client_arrival_data_upload_status || "",
                    arrival_boarding_pass_upload_link: item.guesttrackerdata.arrivalstage?.arrival_boarding_pass_upload_link || "",
                    client_arrival_data_upload_remarks: item.guesttrackerdata.arrivalstage?.client_arrival_data_upload_remarks || "",
                    arrival_boarding_pass_upload_datetime: item.guesttrackerdata.arrivalstage?.arrival_boarding_pass_upload_datetime || "",
                    arrival_counts_st1: item.guesttrackerdata.arrivalstage?.arrival_counts_st1 || "",
                    booking_status_if_cancelled: item.guesttrackerdata.arrivalstage?.booking_status_if_cancelled || "",
                  },
                  departurestage: {
                    departure_planned: item.guesttrackerdata.departurestage?.departure_planned || "",
                    departure_actual: item.guesttrackerdata.departurestage?.departure_actual || "",
                    departure_time_delay: item.guesttrackerdata.departurestage?.departure_time_delay || "",
                    departure_tickets_upload_link: item.guesttrackerdata.departurestage?.departure_tickets_upload_link || "",
                    departure_boarding_pass_upload_link: item.guesttrackerdata.departurestage?.departure_boarding_pass_upload_link || "",
                    departure_doer_name: item.guesttrackerdata.departurestage?.departure_doer_name || "",
                    client_departure_data_upload_status: item.guesttrackerdata.departurestage?.client_departure_data_upload_status || "",
                    client_departure_data_upload_remarks: item.guesttrackerdata.departurestage?.client_departure_data_upload_remarks || "",
                    departure_boarding_pass_upload_datetime: item.guesttrackerdata.departurestage?.departure_boarding_pass_upload_datetime || "",
                    departure_counts_st1: item.guesttrackerdata.departurestage?.departure_counts_st1 || "",
                  },
                }
                : undefined,
            };
          } catch {
            console.error("Failed to map booking item");
            return null;
          }
        }).filter((item: any) => item !== null);

        const pendingData = json?.pendingCounts || [];
        const pendingMap: Record<string, PendingCount> = {};
        for (const item of pendingData) {
          const rawName = item.employee || "-";
          const employeeName = normalizeUserName(rawName);
          if (!pendingMap[employeeName]) {
            pendingMap[employeeName] = {
              employeeName,
              newBookings: 0,
              accountVerify: 0,
              finalTransfer: 0,
              deleteComplete: 0,
            };
          }
          pendingMap[employeeName].newBookings += item.newBookings || 0;
          pendingMap[employeeName].accountVerify += item.accountsVerify || 0;
          pendingMap[employeeName].finalTransfer += item.finalTransfer || 0;
          pendingMap[employeeName].deleteComplete += item.deleteComplete || 0;
        }
        const formattedPending: PendingCount[] = Object.values(pendingMap);

        if (isMounted) {
          setPendingCount(formattedPending);
          setBookings(formatted);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          if (refetchResolverRef.current) {
            refetchResolverRef.current();
            refetchResolverRef.current = null;
          }
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshToken]);

  return { bookings, setBookings, pendingCount, nameAliases, loading, error, refetch };
}