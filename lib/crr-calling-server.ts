import { getPool } from "@/lib/db";
import { autoCloseReason } from "@/lib/crr-stage-rules";
import { findCallingRowForStage, indexCallingRows, parseToShow } from "@/lib/crr-calling-rows";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EN_GB_FORMATTER = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const EN_CA_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export function formatDMYDate(val: any): string {
    if (!val) return "";

    // If it's already a clean DD-MMM-YYYY string (e.g. "06-Aug-2026")
    if (typeof val === "string") {
        const s = val.trim();
        if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(s)) {
            return s;
        }
        // If it's YYYY-MM-DD (e.g. "2026-08-06")
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, d] = s.split("-").map(Number);
            const month = MONTH_NAMES[m - 1] || "";
            return `${String(d).padStart(2, "0")}-${month}-${y}`;
        }
    }

    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);

    const parts = EN_GB_FORMATTER.formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const year = parts.find((p) => p.type === "year")?.value || "";

    return `${day}-${month}-${year}`;
}

export function formatTimestamp(val: any): string {
    if (!val) return "";
    return formatDMYDate(val);
}

export function getISTDateString(d: Date): string {
    return EN_CA_FORMATTER.format(d); // "YYYY-MM-DD"
}

export function isLockedDate(plannedVal: any, todayStr?: string): boolean {
    if (!plannedVal) return false;
    const planned = plannedVal instanceof Date ? plannedVal : new Date(plannedVal);
    if (isNaN(planned.getTime())) return false;
    const currentTodayStr = todayStr || getISTDateString(new Date());
    const plannedStr = getISTDateString(planned);
    return currentTodayStr < plannedStr;
}

// Loads CRR bookings with their per-stage info. `where` filters KTAHV_CRR_Process_FMS;
// shared by GET (list), POST (re-check the stage rules before saving), and CRR report loaders.
export async function loadBookings(where: string, params: any[], limit: number) {
    const pool = await getPool();
    const stageUsers: Array<{ name: string; email: string; role: string; stages: number[] }> = [];

    // 1. Explicit minimal projection — exact columns verified against KTAHV_CRR_Process_FMS schema
    const PROJECTION_SQL = `
        SELECT 
            id, timestamp, check_in_date, check_out_date, client_name, gender, mobile, 
            country, country_code, email, booking_id, days_of_stay, programme_package_name, 
            package_type, room_type, room_category, invoice_amount, booking_taken_by, mid, 
            booking_no, booking_url, uid, booking_status,
            stage1_task_done_actual,
            stage2_planned, stage2_actual, stage2_time_delay, stage2_next_visit_date,
            stage2_should_we_request_ratings, stage2_proof_of_rating, stage2_link,
            stage2_remarks, stage2_status,
            stage4_task_done_actual, stage4_remarks_for_next_visit_date,
            stage6_task_done_actual,
            stage7_task_done_actual, stage7_referals_details,
            stage8_call_date_planned, stage8_task_done_actual, stage9_doer
        FROM KTAHV_CRR_Process_FMS
    `;

    const [processRows] = await pool.query<any[]>(
        `${PROJECTION_SQL} ${where} ORDER BY id DESC LIMIT ?`,
        [...params, limit]
    );

    if (!processRows || processRows.length === 0) {
        return { data: [] as any[], stageUsers };
    }

    // 2. Collect UIDs, booking_ids, and checkin keys (bounded by processRows)
    const uids = processRows.map((r) => r.uid).filter(Boolean);
    const bookingIds = processRows.map((r) => r.booking_id).filter(Boolean);
    const checkinKeys = Array.from(
        new Set(
            processRows
                .flatMap((r) => [r.booking_id, r.booking_no, r.uid])
                .filter(Boolean)
                .map((s) => String(s).trim())
        )
    );

    // 3. Concurrently fetch all related sub-queries in parallel with explicit projections
    const [callingResult, trackerResult, trackerPart2Result, checkinResult, permResult] = await Promise.all([
        uids.length > 0
            ? pool.query<any[]>(
                `SELECT id, uid, stage_key, call_purpose, planned, actual, to_show, updated_at, timestamp,
                        status, outcome_remarks, did_they_achieve_the_outcomes_planned_for,
                        remarks_why_not_done_or_close, followup_date_for_the_welcome_call,
                        followup_date_for_the_rating, followup_date_for_the_result_and_progress,
                        followup_date_for_the_call_after_landing,
                        doer, rating_status, remarks_why_not_given_ratings, proof_of_ratings,
                        stay_feedback
                 FROM KTAHV_CRR_Calling_FMS
                 WHERE uid IN (?)
                 ORDER BY id ASC`,
                [uids]
              )
            : Promise.resolve([[]] as any),
        bookingIds.length > 0
            ? pool.query<any[]>(
                `SELECT booking_id, arrival_planned, arrival_actual, arrival_doer_name,
                        client_arrival_data_upload_remarks, departure_planned, departure_actual,
                        departure_doer_name, client_departure_data_upload_remarks,
                        doctor_assigned_to_the_client, stage11_change_the_doctor_if_required,
                        stage11_planned, stage11_actual, stage11_status, stage11_timestamp, stage11_email, updated_at,
                        stage11_to_show
                 FROM ktahv_guest_tracker
                 WHERE booking_id IN (?)`,
                [bookingIds]
              )
            : Promise.resolve([[]] as any),
        bookingIds.length > 0
            ? pool.query<any[]>(
                `SELECT id, booking_id,
                        stage5_planned, stage5_actual, stage5_time_delay, stage5_doer_name,
                        stage5_pickup_assigned_to_driver_link_arrival, stage5_assign_status,
                        stage5_assign_remarks, stage5_counts_st4, stage5_arrival_flight_details,
                        stage5_pickup_driver_name, stage5_pickup_driver_contact, stage5_pickup_location,
                        stage5_pickup_date, stage5_pickup_time, stage5_remarks_for_driver,
                        stage10_to_show,
                        stage9_planned, stage9_actual, stage9_time_delay, stage9_doer_name,
                        stage9_assigned_to_driver_link_departure, stage9_departure_assign_status,
                        stage9_departure_assign_remarks, stage9_departure_flight_details,
                        stage9_driver_name, stage9_driver_mobile, stage9_dropping_location,
                        stage9_dropping_date, stage9_dropping_time, stage9_remarks_for_driver,
                        stage9_to_show
                 FROM ktahv_guest_tracker_part2
                 WHERE booking_id IN (?)
                 ORDER BY id ASC`,
                [bookingIds]
              ).catch((e) => {
                  console.warn("[crr-calling/bookings] Failed to fetch ktahv_guest_tracker_part2:", e);
                  return [[]] as any;
              })
            : Promise.resolve([[]] as any),
        checkinKeys.length > 0
            ? pool.query<any[]>(
                `SELECT id, reservation_id, room_no,
                        stage3_planned, stage3_actual, stage3_doer_remarks, stage3_doer, stage3_time_delay,
                        stage2_qr_code_scanned_status_by_guest_or_not,
                        stage2_guest_feedback_after_scanning_ai_qr_code,
                        stage2_guest_testinomial_feedback_received_through_html_form,
                        stage2_referral_received_through_referral_html_form,
                        stage4_planned, stage4_actual, stage4_doer_remarks, stage4_doer, stage4_time_delay,
                        stage4_feedback_taking_url, stage4_feedback_report,
                        stage5_planned_referral, stage5_actual_referral, stage5_doer_remarks,
                        stage5_referral_taken_status, stage5_doer_referral, stage5_time_delay_referral
                 FROM ktahv_checkinmasterfms
                 WHERE reservation_id IN (?)`,
                [checkinKeys]
              )
            : Promise.resolve([[]] as any),
        pool.query<any[]>(
            `SELECT 
                p.email,
                p.role,
                p.crr_fms,
                u.user_name
             FROM user_role_permissions p
             LEFT JOIN userlogin u ON LOWER(TRIM(u.email_id)) = LOWER(TRIM(p.email))
             WHERE p.crr_fms IS NOT NULL AND p.crr_fms != ''`
        ).catch((e) => {
            console.warn("[crr-calling/bookings] Failed to fetch stage users:", e);
            return [[]] as any;
        }),
    ]);

    const callingRows: any[] = callingResult[0] || [];

    // 4. Build GuestTracker map
    const trackerMap = new Map<string, any>();
    const tRows = trackerResult[0] || [];
    for (const tr of tRows) {
        if (tr.booking_id) trackerMap.set(String(tr.booking_id).trim(), tr);
    }

    const trackerPart2Map = new Map<string, any>();
    const t2Rows = trackerPart2Result?.[0] || [];
    for (const tr2 of t2Rows) {
        if (tr2.booking_id) {
            const bId = String(tr2.booking_id).trim();
            trackerPart2Map.set(bId, tr2);
            trackerPart2Map.set(bId.toLowerCase(), tr2);
        }
    }

    // 5. Build CheckinMaster map
    const checkinMap = new Map<string, any>();
    const chkRows = checkinResult[0] || [];
    for (const chk of chkRows) {
        if (chk.reservation_id) {
            const raw = String(chk.reservation_id).trim();
            checkinMap.set(raw.toLowerCase(), chk);
            checkinMap.set(raw, chk);
        }
        if (chk.id) {
            checkinMap.set(String(chk.id), chk);
        }
    }

    // 5a. Build a Set of all reservation_ids currently in ktahv_checkinmasterfms (for this batch).
    const checkedInReservationIds = new Set<string>();
    for (const chk of chkRows) {
        if (chk.reservation_id) {
            checkedInReservationIds.add(String(chk.reservation_id).trim().toLowerCase());
        }
    }

    // 5b. Parse Permission-Based Stage Users
    const permRows = permResult[0] || [];
    if (permRows.length > 0) {
        const seen = new Set<string>();
        for (const p of permRows) {
            const email = String(p.email || "").trim();
            const crrFms = String(p.crr_fms || "");

            // Parse stages assigned in crr_fms column (e.g. "view, stage1, stage2, stage4, stage5, stage6, stage8")
            const assignedStages: number[] = [];
            const parts = crrFms.split(",").map((s) => s.trim().toLowerCase());
            for (const part of parts) {
                const match = part.match(/^stage(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= 1 && num <= 11) {
                        assignedStages.push(num);
                    }
                }
            }

            // Strict real name from userlogin
            const name = String(p.user_name || p.email || "").trim();
            const key = email || name;
            if (assignedStages.length > 0 && key && !seen.has(key)) {
                seen.add(key);
                stageUsers.push({
                    name,
                    email,
                    role: String(p.role || ""),
                    stages: assignedStages.sort((a, b) => a - b),
                });
            }
        }
    }

    const callingRowIndex = indexCallingRows<any>(callingRows);
    const todayStr = getISTDateString(new Date());

    // 6. Map each processRow into the standard GasBookingRow payload
    const data = processRows.map((row: any, idx: number) => {
        const uid = String(row.uid || "").trim();
        const bookingId = String(row.booking_id || "").trim();
        const tracker = trackerMap.get(bookingId) || trackerMap.get(bookingId.toLowerCase());
        const checkin =
            checkinMap.get(bookingId) ||
            checkinMap.get(bookingId.toLowerCase()) ||
            checkinMap.get(String(row.booking_no || "").trim()) ||
            checkinMap.get(String(row.booking_no || "").trim().toLowerCase()) ||
            checkinMap.get(String(row.reservation_id || "").trim()) ||
            checkinMap.get(String(row.reservation_id || "").trim().toLowerCase()) ||
            checkinMap.get(uid) ||
            checkinMap.get(uid.toLowerCase());

        const bookingTakenBy = String(row.booking_taken_by || "").trim();
        const notCheckedInYet = bookingId !== "" && !checkedInReservationIds.has(bookingId.toLowerCase());

        // Stage 1: Arrival Welcome on Pickup
        const c1 = findCallingRowForStage(callingRowIndex, uid, 1);
        const s1Planned = c1?.planned || null;
        const s1Actual = c1?.actual || row.stage1_task_done_actual || null;
        const s1ToShow = parseToShow(c1?.to_show);
        const hasS1Data = Boolean(s1Actual || (c1 && (c1.status || c1.outcome_remarks || c1.did_they_achieve_the_outcomes_planned_for)));
        const s1Saved = c1 ? {
            outcomeAchieved: c1.did_they_achieve_the_outcomes_planned_for || "",
            outcomeRemarks: c1.outcome_remarks || "",
            status: c1.status || "",
            notDoneRemarks: c1.remarks_why_not_done_or_close || "",
            followupDate: c1.followup_date_for_the_welcome_call ? formatDMYDate(c1.followup_date_for_the_welcome_call) : "",
            doer: c1.doer || "",
            stageKey: c1.stage_key || (uid ? `${uid}_Stage1` : null),
        } : null;

        // Stage 2: Guest Request & Complaint Mgmt (strictly from ktahv_checkinmasterfms stage3_*)
        const s2Planned = checkin?.stage3_planned || null;
        const s2Actual = checkin?.stage3_actual || null;
        const s2DoerRemarks = checkin?.stage3_doer_remarks || "";
        const s2Doer = checkin?.stage3_doer || "";
        const s2Saved = {
            doerRemarks: s2DoerRemarks,
            remarks: s2DoerRemarks,
            doer: s2Doer,
            timeDelay: checkin?.stage3_time_delay || "",
            qrCodeScannedStatus: checkin?.stage2_qr_code_scanned_status_by_guest_or_not || "",
            qrFeedback: checkin?.stage2_guest_feedback_after_scanning_ai_qr_code || "",
            testimonialFeedback: checkin?.stage2_guest_testinomial_feedback_received_through_html_form || "",
            referralReceived: checkin?.stage2_referral_received_through_referral_html_form || "",
            roomNo: checkin?.room_no || "",
        };

        const assignedDoctor =
            tracker?.doctor_assigned_to_the_client ||
            tracker?.stage11_change_the_doctor_if_required ||
            row.stage9_doer ||
            "Doctor";

        // Stage 3: Next Visit Planning & Confirmation (CRR Process stage2_* columns)
        const s3Planned = row.stage2_planned || null;
        const s3Actual = row.stage2_actual || null;
        const s3Status = row.stage2_status || (s3Actual ? "Done" : "");
        const s3Completed = Boolean(
            s3Actual ||
            (row.stage2_status && String(row.stage2_status).trim().toLowerCase() === "done") ||
            (row.stage2_next_visit_date && row.stage2_remarks)
        );
        const s3ActualDisplay = formatDMYDate(s3Actual) || (s3Completed ? formatDMYDate(row.stage2_actual || row.updated_at || s3Planned) : null);
        const s3Doer = assignedDoctor;
        const s3Saved = (
            row.stage2_next_visit_date ||
            row.stage2_remarks ||
            row.stage2_actual ||
            row.stage2_status ||
            row.stage2_time_delay ||
            s3Doer
        ) ? {
            nextVisitDate: row.stage2_next_visit_date ? formatDMYDate(row.stage2_next_visit_date) : "",
            remarks: row.stage2_remarks || "",
            status: s3Status,
            actualDate: formatDMYDate(s3Actual) || "",
            timeDelay: row.stage2_time_delay || "",
            shouldWeRequestRatings: row.stage2_should_we_request_ratings || "",
            proofOfRating: row.stage2_proof_of_rating || "",
            link: row.stage2_link || "",
            followupDate: "",
            doer: s3Doer,
            stageKey: uid ? `${uid}_Stage3` : null,
        } : null;

        // Stage 4: Guest Feedback & Outcome Confirmation
        const s4Planned = checkin?.stage4_planned || null;
        const s4Actual = checkin?.stage4_actual || null;
        const s4DoerRemarks = checkin?.stage4_doer_remarks || "";
        const s4Doer = checkin?.stage4_doer || "";
        const s4Saved = {
            doerRemarks: s4DoerRemarks,
            remarks: s4DoerRemarks,
            doer: s4Doer,
            timeDelay: checkin?.stage4_time_delay || "",
            feedbackTakingUrl: checkin?.stage4_feedback_taking_url || "",
            feedbackReport: checkin?.stage4_feedback_report || "",
        };

        // Stage 5: Online Rating & Review Request
        const c5 = findCallingRowForStage(callingRowIndex, uid, 5);
        const s5Planned = c5?.planned || null;
        const s5Actual = c5?.actual || row.stage4_task_done_actual || null;
        const s5ToShow = parseToShow(c5?.to_show);
        const hasS5Data = Boolean(s5Actual || (c5 && (c5.status || c5.rating_status || c5.outcome_remarks || c5.remarks_why_not_given_ratings)));
        const s5Saved = c5 ? {
            ratingStatus: c5.rating_status || "",
            notGivenRemarks: c5.remarks_why_not_given_ratings || "",
            proofFileName: c5.proof_of_ratings || "",
            outcomeAchieved: c5.did_they_achieve_the_outcomes_planned_for || "",
            outcomeRemarks: c5.outcome_remarks || "",
            status: c5.status || "",
            notDoneRemarks: c5.remarks_why_not_done_or_close || "",
            followupDate: c5.followup_date_for_the_rating ? formatDMYDate(c5.followup_date_for_the_rating) : "",
            doer: c5.doer || "",
            stageKey: c5.stage_key || (uid ? `${uid}_Stage5` : null),
        } : null;

        // Stage 6: Safe Return Confirmation
        const c6 = findCallingRowForStage(callingRowIndex, uid, 6);
        const s6Planned = c6?.planned || null;
        const s6Actual = c6?.actual || row.stage6_task_done_actual || null;
        const s6ToShow = parseToShow(c6?.to_show);
        const hasS6Data = Boolean(s6Actual || (c6 && (c6.status || c6.stay_feedback || c6.outcome_remarks)));
        const s6Saved = c6 ? {
            stayFeedback: c6.stay_feedback || "",
            outcomeAchieved: c6.did_they_achieve_the_outcomes_planned_for || "",
            outcomeRemarks: c6.outcome_remarks || "",
            status: c6.status || "",
            notDoneRemarks: c6.remarks_why_not_done_or_close || "",
            followupDate: c6.followup_date_for_the_call_after_landing ? formatDMYDate(c6.followup_date_for_the_call_after_landing) : "",
            doer: c6.doer || "",
            stageKey: c6.stage_key || (uid ? `${uid}_Stage6` : null),
        } : null;

        // Stage 7: Result Tracking & Health Progress Check
        const c7 = findCallingRowForStage(callingRowIndex, uid, 7);
        const s7Planned = c7?.planned || null;
        const s7Actual = c7?.actual || row.stage7_task_done_actual || null;
        const s7ToShow = parseToShow(c7?.to_show);
        const hasS7Data = Boolean(s7Actual || (c7 && (c7.status || c7.outcome_remarks || c7.did_they_achieve_the_outcomes_planned_for)));
        const s7Doer = c7?.doer || assignedDoctor;
        const s7Saved = c7 ? {
            outcomeAchieved: c7.did_they_achieve_the_outcomes_planned_for || "",
            outcomeRemarks: c7.outcome_remarks || "",
            status: c7.status || "",
            notDoneRemarks: c7.remarks_why_not_done_or_close || "",
            followupDate: c7.followup_date_for_the_result_and_progress ? formatDMYDate(c7.followup_date_for_the_result_and_progress) : "",
            doer: s7Doer,
            stageKey: c7.stage_key || (uid ? `${uid}_Stage7` : null),
        } : { doer: s7Doer, stageKey: uid ? `${uid}_Stage7` : null };

        // Stage 8: Referral Collection & Lead Generation
        const s8Planned = checkin?.stage5_planned_referral || null;
        const s8Actual = checkin?.stage5_actual_referral || null;
        const s8DoerRemarks = checkin?.stage5_doer_remarks || "";
        const s8ReferralTakenStatus = checkin?.stage5_referral_taken_status || "";
        const s8Doer = checkin?.stage5_doer_referral || checkin?.stage5_doer || "";
        const s8Saved = {
            referralTakenStatus: s8ReferralTakenStatus,
            doerStatus: s8ReferralTakenStatus,
            doerRemarks: s8DoerRemarks,
            remarks: s8DoerRemarks,
            doer: s8Doer,
            timeDelay: checkin?.stage5_time_delay_referral || checkin?.stage5_time_delay || "",
            stageKey: uid ? `${uid}_Stage8` : null,
        };

        const tracker2 = trackerPart2Map.get(bookingId) || trackerPart2Map.get(bookingId.toLowerCase());

        // Stage 9: Driver Assignment – Arrival Pickup
        const s9Planned = tracker2?.stage5_planned || null;
        const s9Actual = tracker2?.stage5_actual || null;
        const s9DriverName = tracker2?.stage5_pickup_driver_name && tracker2.stage5_pickup_driver_name !== bookingTakenBy ? tracker2.stage5_pickup_driver_name : "";
        const s9DriverContact = tracker2?.stage5_pickup_driver_contact || "";
        const s9PickupLocation = tracker2?.stage5_pickup_location || "";
        const s9PickupDate = tracker2?.stage5_pickup_date ? formatDMYDate(tracker2.stage5_pickup_date) : "";
        const s9PickupTime = tracker2?.stage5_pickup_time ? String(tracker2.stage5_pickup_time) : "";
        const s9Remarks = tracker2?.stage5_remarks_for_driver || "";
        const s9FlightDetails = tracker2?.stage5_arrival_flight_details || "";
        const s9AssignStatus = tracker2?.stage5_assign_status || "";
        const s9AssignRemarks = tracker2?.stage5_assign_remarks || "";
        const s9DriverLink = tracker2?.stage5_pickup_assigned_to_driver_link_arrival || "";
        const s9TimeDelay = tracker2?.stage5_time_delay || "";
        const s9DoerName = tracker2?.stage5_doer_name || "";
        const s9ToShow = parseToShow(tracker2?.stage10_to_show ?? tracker2?.stage9_to_show);

        const hasS9Data = Boolean(
            s9Actual ||
            s9DriverName ||
            s9DriverContact ||
            s9PickupLocation ||
            s9PickupDate ||
            s9PickupTime ||
            s9Remarks ||
            s9AssignStatus ||
            s9AssignRemarks
        );

        const pickupReq = (s9PickupDate || s9DriverName || s9PickupLocation) ? "yes" : "";

        const s9Saved = (tracker2 && hasS9Data) ? {
            pickupRequired: pickupReq,
            driverName: s9DriverName,
            driverContact: s9DriverContact,
            pickupFrom: s9PickupLocation,
            pickupDate: s9PickupDate,
            pickupTime: s9PickupTime,
            remarks: s9Remarks,
            assignedBy: s9DoerName || s9DriverName,
            arrivalFlightDetails: s9FlightDetails,
            assignStatus: s9AssignStatus,
            assignRemarks: s9AssignRemarks,
            driverLink: s9DriverLink,
            timeDelay: s9TimeDelay,
            doer: "",
            stageKey: uid ? `${uid}_Stage9` : null,
        } : null;

        // Stage 10: Driver Assignment – Departure Drop
        const s10Planned = tracker2?.stage9_planned || null;
        const s10Actual = tracker2?.stage9_actual || null;
        const s10DriverName = tracker2?.stage9_driver_name && tracker2.stage9_driver_name !== bookingTakenBy ? tracker2.stage9_driver_name : "";
        const s10DriverContact = tracker2?.stage9_driver_mobile || "";
        const s10DropLocation = tracker2?.stage9_dropping_location || "";
        const s10DropDate = tracker2?.stage9_dropping_date ? formatDMYDate(tracker2.stage9_dropping_date) : "";
        const s10DropTime = tracker2?.stage9_dropping_time ? String(tracker2.stage9_dropping_time) : "";
        const s10Remarks = tracker2?.stage9_remarks_for_driver || "";
        const s10FlightDetails = tracker2?.stage9_departure_flight_details || "";
        const s10AssignStatus = tracker2?.stage9_departure_assign_status || "";
        const s10AssignRemarks = tracker2?.stage9_departure_assign_remarks || "";
        const s10DriverLink = tracker2?.stage9_assigned_to_driver_link_departure || "";
        const s10TimeDelay = tracker2?.stage9_time_delay || "";
        const s10DoerName = tracker2?.stage9_doer_name || "";
        const s10ToShow = parseToShow(tracker2?.stage9_to_show);

        const hasS10Data = Boolean(
            s10Actual ||
            s10DriverName ||
            s10DriverContact ||
            s10DropLocation ||
            s10DropDate ||
            s10DropTime ||
            s10Remarks ||
            s10AssignStatus ||
            s10AssignRemarks
        );

        const dropReq = (s10DropDate || s10DriverName || s10DropLocation) ? "yes" : "";

        const s10Saved = (tracker2 && hasS10Data) ? {
            dropRequired: dropReq,
            driverName: s10DriverName,
            driverContact: s10DriverContact,
            dropTo: s10DropLocation,
            dropDate: s10DropDate,
            dropTime: s10DropTime,
            remarks: s10Remarks,
            assignedBy: s10DoerName || s10DriverName,
            departureFlightDetails: s10FlightDetails,
            departureAssignStatus: s10AssignStatus,
            departureAssignRemarks: s10AssignRemarks,
            driverLink: s10DriverLink,
            timeDelay: s10TimeDelay,
            doer: "",
            stageKey: uid ? `${uid}_Stage10` : null,
        } : null;

        // Stage 11: Guest Requirement Verification
        const s11Planned = tracker?.stage11_planned || null;
        const s11Doctor = tracker?.doctor_assigned_to_the_client || tracker?.stage11_change_the_doctor_if_required || "";
        const s11Actual = tracker?.stage11_actual || null;
        const s11ToShow = parseToShow(tracker?.stage11_to_show);
        const hasS11Data = Boolean(s11Actual || s11Doctor || tracker?.stage11_status);
        const s11Completed = (!s11Planned && !hasS11Data) ? true : Boolean(s11Actual || hasS11Data);
        const s11Saved = tracker ? {
            doctorAssignedToClient: s11Doctor,
            email: tracker?.stage11_email || "",
            timestamp: formatTimestamp(tracker?.stage11_timestamp || tracker?.updated_at),
            doctorAssignStatus: tracker?.stage11_status || (s11Doctor ? "Assigned" : ""),
            changedDoctor: tracker?.stage11_change_the_doctor_if_required || "",
            remarks: tracker?.special_request_or_requirement_noted || "",
            doer: "",
            stageKey: uid ? `${uid}_Stage11` : null,
        } : null;

        const s2Completed = Boolean(s2Actual || (s2DoerRemarks && s2DoerRemarks.trim() !== ""));
        const s2ActualDateDisplay = formatDMYDate(s2Actual) || (s2Completed ? formatDMYDate(checkin?.updated_at || checkin?.booking_date_time || s2Planned) : null);

        const s4Completed = Boolean(s4Actual || (s4DoerRemarks && s4DoerRemarks.trim() !== ""));
        const s4ActualDateDisplay = formatDMYDate(s4Actual) || (s4Completed ? formatDMYDate(checkin?.updated_at || checkin?.booking_date_time || s4Planned) : null);

        const s8Completed = Boolean(s8Actual || (s8DoerRemarks && s8DoerRemarks.trim() !== "") || (s8ReferralTakenStatus && s8ReferralTakenStatus.trim() !== ""));
        const s8ActualDateDisplay = formatDMYDate(s8Actual) || (s8Completed ? formatDMYDate(checkin?.updated_at || checkin?.booking_date_time || s8Planned) : null);

        const s9AutoClosed = autoCloseReason(s9Planned, row.check_in_date, "Check-in", todayStr);
        const s10AutoClosed = autoCloseReason(s10Planned, row.check_out_date, "Check-out", todayStr);
        const s11AutoClosed = autoCloseReason(s11Planned, row.check_in_date, "Check-in", todayStr);

        const stages = [
            { stage: 1, available: true, locked: isLockedDate(s1Planned, todayStr), plannedDate: formatDMYDate(s1Planned), completed: Boolean(s1Actual || hasS1Data), toShow: s1ToShow, submitted: hasS1Data, actualDate: formatDMYDate(s1Actual) || (hasS1Data ? formatDMYDate(c1?.updated_at || c1?.timestamp) : null), savedData: s1Saved, stageKey: c1?.stage_key || (uid ? `${uid}_Stage1` : null) },
            { stage: 2, available: true, locked: isLockedDate(s2Planned, todayStr), plannedDate: formatDMYDate(s2Planned), completed: s2Completed, actualDate: s2ActualDateDisplay, savedData: s2Saved, stageKey: uid ? `${uid}_Stage2` : null },
            { stage: 3, available: true, locked: isLockedDate(s3Planned, todayStr), plannedDate: formatDMYDate(s3Planned), completed: s3Completed, actualDate: s3ActualDisplay, savedData: s3Saved, stageKey: uid ? `${uid}_Stage3` : null },
            { stage: 4, available: true, locked: isLockedDate(s4Planned, todayStr), plannedDate: formatDMYDate(s4Planned), completed: s4Completed, actualDate: s4ActualDateDisplay, savedData: s4Saved, stageKey: uid ? `${uid}_Stage4` : null },
            { stage: 5, available: true, locked: isLockedDate(s5Planned, todayStr), plannedDate: formatDMYDate(s5Planned), completed: Boolean(s5Actual || hasS5Data), toShow: s5ToShow, submitted: hasS5Data, actualDate: formatDMYDate(s5Actual) || (hasS5Data ? formatDMYDate(c5?.updated_at || c5?.timestamp) : null), savedData: s5Saved, stageKey: c5?.stage_key || (uid ? `${uid}_Stage5` : null) },
            { stage: 6, available: true, locked: isLockedDate(s6Planned, todayStr), plannedDate: formatDMYDate(s6Planned), completed: Boolean(s6Actual || hasS6Data), toShow: s6ToShow, submitted: hasS6Data, actualDate: formatDMYDate(s6Actual) || (hasS6Data ? formatDMYDate(c6?.updated_at || c6?.timestamp) : null), savedData: s6Saved, stageKey: c6?.stage_key || (uid ? `${uid}_Stage6` : null) },
            { stage: 7, available: true, locked: isLockedDate(s7Planned, todayStr), plannedDate: formatDMYDate(s7Planned), completed: Boolean(s7Actual || hasS7Data), toShow: s7ToShow, submitted: hasS7Data, actualDate: formatDMYDate(s7Actual) || (hasS7Data ? formatDMYDate(c7?.updated_at || c7?.timestamp) : null), savedData: s7Saved, stageKey: c7?.stage_key || (uid ? `${uid}_Stage7` : null) },
            { stage: 8, available: true, locked: isLockedDate(s8Planned, todayStr), plannedDate: formatDMYDate(s8Planned), completed: s8Completed, actualDate: s8ActualDateDisplay, savedData: s8Saved, stageKey: uid ? `${uid}_Stage8` : null },
            { stage: 9, available: true, locked: isLockedDate(s9Planned, todayStr), plannedDate: formatDMYDate(s9Planned), completed: Boolean(s9Actual || hasS9Data) || Boolean(s9AutoClosed), autoClosed: s9AutoClosed, toShow: s9ToShow, submitted: hasS9Data, actualDate: formatDMYDate(s9Actual), savedData: s9Saved, stageKey: uid ? `${uid}_Stage9` : null },
            { stage: 10, available: true, locked: isLockedDate(s10Planned, todayStr), plannedDate: formatDMYDate(s10Planned), completed: Boolean(s10Actual || hasS10Data) || Boolean(s10AutoClosed), autoClosed: s10AutoClosed, toShow: s10ToShow, submitted: hasS10Data, actualDate: formatDMYDate(s10Actual), savedData: s10Saved, stageKey: uid ? `${uid}_Stage10` : null },
            { stage: 11, available: true, locked: isLockedDate(s11Planned, todayStr), plannedDate: formatDMYDate(s11Planned), completed: s11Completed || Boolean(s11AutoClosed), autoClosed: s11AutoClosed, toShow: s11ToShow, submitted: hasS11Data, actualDate: formatDMYDate(s11Actual), savedData: s11Saved, stageKey: uid ? `${uid}_Stage11` : null },
        ];

        return {
            timestamp: formatTimestamp(row.timestamp),
            checkInDate: formatDMYDate(row.check_in_date),
            checkOutDate: formatDMYDate(row.check_out_date),
            clientName: row.client_name || "",
            gender: row.gender || "",
            mobile: row.mobile || "",
            country: row.country || "",
            countryCode: row.country_code || "",
            email: row.email || "",
            bookingId: row.booking_id || "",
            daysOfStay: row.days_of_stay || 0,
            packageName: row.programme_package_name || row.package_type || "",
            roomType: row.room_type || "",
            roomCategory: row.room_category || (checkin?.room_no ? `Room ${checkin.room_no}` : ""),
            invoiceAmount: Number(row.invoice_amount) || 0,
            bookingTakenBy: row.booking_taken_by || "",
            mid: row.mid || "",
            bookingNo: row.booking_no || "",
            bookingUrl: row.booking_url || "",
            uid: row.uid || "",
            bookingStatus: row.booking_status || "Confirmed",
            rowNumber: row.id || idx + 1,
            notCheckedInYet,
            stages,
        };
    });

    // 7. Maintain not_checkedin_yet table
    void (async () => {
        try {
            const toUpsert = data.filter((d: any) => d.notCheckedInYet === true);
            const toDelete  = data.filter((d: any) => d.notCheckedInYet === false && d.bookingId);

            if (toUpsert.length > 0) {
                const upsertValues = toUpsert.map((d: any) => [
                    d.rowNumber,
                    d.bookingId,
                    d.uid || null,
                    d.clientName || null,
                    processRows.find((r: any) => r.id === d.rowNumber)?.check_in_date ?? null,
                    processRows.find((r: any) => r.id === d.rowNumber)?.check_out_date ?? null,
                    d.bookingStatus || null,
                ]);

                await pool.query(
                    `INSERT INTO not_checkedin_yet
                        (process_id, booking_id, uid, client_name, check_in_date, check_out_date, booking_status)
                     VALUES ?
                     ON DUPLICATE KEY UPDATE
                        process_id    = VALUES(process_id),
                        uid           = VALUES(uid),
                        client_name   = VALUES(client_name),
                        check_in_date = VALUES(check_in_date),
                        check_out_date = VALUES(check_out_date),
                        booking_status = VALUES(booking_status),
                        updated_at    = CURRENT_TIMESTAMP`,
                    [upsertValues]
                );
            }

            if (toDelete.length > 0) {
                const nowCheckedInIds = toDelete.map((d: any) => d.bookingId);
                await pool.query(
                    `DELETE FROM not_checkedin_yet WHERE booking_id IN (?)`,
                    [nowCheckedInIds]
                );
            }
        } catch (maintErr) {
            console.warn("[crr-calling/bookings] not_checkedin_yet maintenance error (non-fatal):", maintErr);
        }
    })();

    return { data, stageUsers };
}
