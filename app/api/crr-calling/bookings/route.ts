import { NextRequest, NextResponse } from "next/server";
import {
    getPermissions,
    getSessionUserResult,
    hasAdminRole,
    hasAnyPermission,
    hasPermission,
} from "@/lib/authz";

import { getPool } from "@/lib/db";

const GAS_BOOKINGS_URL =
    // "https://script.google.com/macros/s/AKfycbzG_1Y18INn0l0mNXoPtNH50s24WjpGq_WIGeKkUcWcMWELSvcK7cHmxtS4iUmiel6eqA/exec";
    "https://script.google.com/macros/s/AKfycbyzNdrB-UocDp-Q_RX8rXBs3Bnm4D6nfGa1BN2BEvbRWQ5fSbrYkSirFT0iQujRFRBmcw/exec";

const UPSTREAM_TIMEOUT_MS = 90_000;

// Force dynamic execution — bookings/calls change frequently
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ServerBookingsCache {
    data: any[];
    stageUsers: any[];
    timestamp: number;
}
let serverCache: ServerBookingsCache | null = null;
const CACHE_TTL_MS = 60_000;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDMYDate(val: any): string {
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

    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const year = parts.find((p) => p.type === "year")?.value || "";

    return `${day}-${month}-${year}`;
}

function parseToShow(val: any): boolean {
    if (val === true || val === 1) return true;
    if (typeof val === "string") {
        const lower = val.trim().toLowerCase();
        return lower === "true" || lower === "1";
    }
    return false;
}

function formatTimestamp(val: any): string {
    if (!val) return "";
    return formatDMYDate(val);
}

function getISTDateString(d: Date): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return formatter.format(d); // "YYYY-MM-DD"
}

function isLockedDate(plannedVal: any): boolean {
    if (!plannedVal) return true;
    const planned = plannedVal instanceof Date ? plannedVal : new Date(plannedVal);
    if (isNaN(planned.getTime())) return true;
    const todayStr = getISTDateString(new Date());
    const plannedStr = getISTDateString(planned);
    return todayStr < plannedStr;
}

// Ensure that "Actual / Done" dates cannot be in the future (today or past only)
function isValidActualDate(val: any): boolean {
    if (!val) return false;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return false;
    const todayStr = getISTDateString(new Date());
    const dateStr = getISTDateString(d);
    return dateStr <= todayStr;
}

function filterActualDate(val: any): any {
    if (!val) return null;
    return isValidActualDate(val) ? val : null;
}

const DOCTOR_EMAIL_MAP: Record<string, string> = {
    "Dr Deepu John": "drdeepu@ktahv.com",
    "Ashikha Raj": "ashikha@ktahv.com",
    "Dr. Rahul R": "drrahul@ktahv.com",
    "Dr. Akhila Oommen": "drakhila@ktahv.com",
    "ANAGHA S": "anagha@ktahv.com",
};

function getDoctorEmail(doctorName?: string | null): string {
    if (!doctorName) return "doctor@ktahv.com";
    if (DOCTOR_EMAIL_MAP[doctorName]) return DOCTOR_EMAIL_MAP[doctorName];
    if (doctorName.includes("@")) return doctorName;
    const slug = doctorName.toLowerCase().replace(/^dr\.?\s*/i, "").trim().replace(/\s+/g, ".");
    return slug ? `${slug}@ktahv.com` : "doctor@ktahv.com";
}

export async function GET(req: NextRequest) {
    try {
        const session = getSessionUserResult(req);

        if (session.state === "missing") {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 401 }
            );
        }

        if (session.state === "invalid") {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 401 }
            );
        }

        const user = session.user;
        const permissions = getPermissions(user);

        const isAdmin =
            hasAnyPermission(user, ["fms.admin"]) ||
            hasAdminRole(user, "raw");

        const hasReadPermission =
            isAdmin ||
            hasAnyPermission(user, ["crr_fms.view", "fms.view", "bookings.view"]) ||
            permissions.some((p) => p.startsWith("crr_fms.stage"));

        if (!hasReadPermission) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403 }
            );
        }

        const now = Date.now();
        if (serverCache && (now - serverCache.timestamp) < CACHE_TTL_MS) {
            return NextResponse.json(
                {
                    success: true,
                    count: serverCache.data.length,
                    data: serverCache.data,
                    stageUsers: serverCache.stageUsers,
                    cached: true,
                },
                {
                    headers: {
                        "Cache-Control": "private, no-cache, no-transform",
                    },
                }
            );
        }

        const pool = await getPool();

        // Run all queries in parallel for lightning-fast execution (< 1s)
        const [
            [processRows],
            [callingRows],
            [tRows],
            [chkRows],
            [permRows],
        ] = await Promise.all([
            pool.query<any[]>(`
                SELECT 
                    id, timestamp, check_in_date, check_out_date, client_name, gender, mobile, country, country_code, email,
                    booking_id, days_of_stay, programme_package_name, package_type, room_type, room_category, invoice_amount,
                    booking_taken_by, mid, booking_no, booking_url, uid, booking_status,
                    stage1_call_date_planned, stage1_task_done_actual,
                    stage2_planned, stage2_actual, stage2_next_visit_date, stage2_remarks, stage9_doer,
                    stage4_rating_request_call_date_planned, stage4_task_done_actual, stage4_remarks_for_next_visit_date,
                    stage6_call_date_planned, stage6_task_done_actual,
                    stage7_call_date_planned, stage7_task_done_actual, stage7_referals_details,
                    stage8_call_date_planned, stage8_task_done_actual
                FROM KTAHV_CRR_Process_FMS 
                ORDER BY id DESC
            `),
            pool.query<any[]>(
                `SELECT id, uid, call_purpose, planned, actual, to_show, did_they_achieve_the_outcomes_planned_for, outcome_remarks, status, remarks_why_not_done_or_close, followup_date_for_the_welcome_call, doer, rating_status, remarks_why_not_given_ratings, proof_of_ratings, followup_date_for_the_rating, stay_feedback, followup_date_for_the_result_and_progress, updated_at, timestamp FROM KTAHV_CRR_Calling_FMS ORDER BY id ASC`
            ),
            pool.query<any[]>(
                `SELECT booking_id, doctor_assigned_to_the_client, special_request_or_requirement_noted, arrival_doer_name, arrival_planned, arrival_actual, client_arrival_data_upload_remarks, departure_doer_name, departure_planned, departure_actual, client_departure_data_upload_remarks, created_at, updated_at FROM ktahv_guest_tracker`
            ),
            pool.query<any[]>(`
                SELECT 
                    id, reservation_id, mobile, room_no,
                    stage3_planned, stage3_actual, stage3_doer_remarks, stage3_doer, stage3_time_delay,
                    stage2_qr_code_scanned_status_by_guest_or_not, stage2_guest_feedback_after_scanning_ai_qr_code,
                    stage2_guest_testinomial_feedback_received_through_html_form, stage2_referral_received_through_referral_html_form,
                    stage4_planned, stage4_actual, stage4_doer_remarks, stage4_doer, stage4_time_delay,
                    stage4_feedback_taking_url, stage4_feedback_report,
                    stage5_planned_referral, stage5_actual_referral, stage5_referral_taken_status, stage5_doer_referral, stage5_doer_remarks, stage5_time_delay_referral,
                    updated_at, booking_date_time
                FROM ktahv_checkinmasterfms 
                ORDER BY id DESC
            `),
            pool.query<any[]>(
                `SELECT 
                    p.email,
                    p.role,
                    p.crr_fms,
                    u.user_name
                 FROM user_role_permissions p
                 LEFT JOIN userlogin u ON LOWER(TRIM(u.email_id)) = LOWER(TRIM(p.email))
                 WHERE p.crr_fms IS NOT NULL AND p.crr_fms != ''`
            ),
        ]);

        if (!processRows || processRows.length === 0) {
            return NextResponse.json({ success: true, count: 0, data: [] });
        }

        // Build trackerMap in memory
        const trackerMap = new Map<string, any>();
        if (tRows) {
            for (const tr of tRows) {
                if (tr.booking_id) {
                    const raw = String(tr.booking_id).trim();
                    trackerMap.set(raw, tr);
                    trackerMap.set(raw.toLowerCase(), tr);
                }
            }
        }

        // Build checkinMap in memory
        const normalizeKey = (k: any) => String(k || "").toLowerCase().replace(/[\s\-_]+/g, "").trim();
        const checkinMap = new Map<string, any>();
        if (chkRows) {
            for (const chk of chkRows) {
                // Normalize stage5 alias keys if present
                if (chk.stage5_planned_referral && !chk.stage5_planned) chk.stage5_planned = chk.stage5_planned_referral;
                if (chk.stage5_doer_referral && !chk.stage5_doer) chk.stage5_doer = chk.stage5_doer_referral;
                if (chk.stage5_time_delay_referral && !chk.stage5_time_delay) chk.stage5_time_delay = chk.stage5_time_delay_referral;

                if (chk.reservation_id) {
                    const raw = String(chk.reservation_id).trim();
                    const norm = normalizeKey(raw);
                    const spaceVar = raw.replace(/-/g, " ").trim();
                    const dashVar = raw.replace(/\s+/g, "-").trim();
                    const numMatch = raw.match(/\d+/);
                    const num = numMatch ? numMatch[0] : "";

                    const keysToAdd = [
                        raw,
                        raw.toLowerCase(),
                        norm,
                        spaceVar,
                        spaceVar.toLowerCase(),
                        dashVar,
                        dashVar.toLowerCase(),
                        num,
                        num ? `ktahv-pms-${num}` : "",
                        num ? `pms-${num}` : "",
                    ];
                    for (const k of keysToAdd) {
                        if (k && !checkinMap.has(k)) {
                            checkinMap.set(k, chk);
                        }
                    }
                }
                if (chk.mobile) {
                    const cleanM = String(chk.mobile).replace(/\D/g, "").slice(-10);
                    if (cleanM && !checkinMap.has(cleanM)) {
                        checkinMap.set(cleanM, chk);
                    }
                }
            }
        }

        // Build stageUsers in memory
        const stageUsers: Array<{ name: string; email: string; role: string; stages: number[] }> = [];
        if (permRows && permRows.length > 0) {
            const seen = new Set<string>();
            for (const p of permRows) {
                const email = String(p.email || "").trim();
                const crrFms = String(p.crr_fms || "");

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

        // Build CrrCalling pre-indexed lookup by UID -> purpose keyword in O(1)
        const callingMap = new Map<string, { welcome?: any; rating?: any; return?: any; result?: any }>();
        for (const row of callingRows) {
            if (!row.uid) continue;
            const k = String(row.uid).trim();
            let entry = callingMap.get(k);
            if (!entry) {
                entry = {};
                callingMap.set(k, entry);
            }
            const purpose = String(row.call_purpose || "").toLowerCase();
            if (purpose.includes("welcome call")) {
                entry.welcome = row;
            } else if (purpose.includes("call after landing, seek feedback") || purpose.includes("rating")) {
                entry.rating = row;
            } else if (purpose.includes("time to return") || purpose.includes("safe return")) {
                entry.return = row;
            } else if (purpose.includes("result and progress")) {
                entry.result = row;
            }
        }

        // 6. Map each processRow into the standard GasBookingRow payload
        const data = processRows.map((row: any, idx: number) => {
            const uid = String(row.uid || "").trim();
            const bookingId = String(row.booking_id || "").trim();
            const tracker = trackerMap.get(bookingId) || trackerMap.get(bookingId.toLowerCase()) || trackerMap.get(normalizeKey(bookingId));
            const num = String(bookingId || row.booking_no || "").match(/\d+/)?.[0] || "";
            const cleanMobile = String(row.mobile || "").replace(/\D/g, "").slice(-10);

            const checkin =
                checkinMap.get(bookingId) ||
                checkinMap.get(bookingId.toLowerCase()) ||
                checkinMap.get(normalizeKey(bookingId)) ||
                checkinMap.get(String(row.booking_no || "").trim()) ||
                checkinMap.get(String(row.booking_no || "").trim().toLowerCase()) ||
                checkinMap.get(normalizeKey(row.booking_no)) ||
                (num ? checkinMap.get(num) : null) ||
                (num ? checkinMap.get(`ktahv-pms-${num}`) : null) ||
                (num ? checkinMap.get(`pms-${num}`) : null) ||
                (cleanMobile ? checkinMap.get(cleanMobile) : null);

            const cCalling = callingMap.get(uid);

            const bookingTakenBy = String(row.booking_taken_by || "").trim();

            // Stage 1: Arrival Welcome on Pickup (CrrCalling / CrrProcess)
            const c1 = cCalling?.welcome;
            const s1Planned = c1?.planned || row.stage1_call_date_planned || row.check_in_date || null;
            const s1Actual = c1?.actual || row.stage1_task_done_actual || null;
            const s1ToShow = parseToShow(c1?.to_show);
            const hasS1Data = Boolean(s1Actual || (c1 && (c1.status || c1.outcome_remarks || c1.did_they_achieve_the_outcomes_planned_for)));
            const s1Saved = c1 ? {
                outcomeAchieved: c1.did_they_achieve_the_outcomes_planned_for || "",
                outcomeRemarks: c1.outcome_remarks || "",
                status: c1.status || "",
                notDoneRemarks: c1.remarks_why_not_done_or_close || "",
                followupDate: c1.followup_date_for_the_welcome_call ? formatDMYDate(c1.followup_date_for_the_welcome_call) : "",
                doer: c1.doer || bookingTakenBy,
            } : (bookingTakenBy ? { doer: bookingTakenBy } : null);

            // Stage 2: Guest Request & Complaint Mgmt (Trigger: During Stay / Check-in to Check-out)
            // Note: In Checkedin Master FMS, STAGE-3 header maps to Stage 2: Guest Request & QR Code
            const s2PlannedFromCheckin =
                checkin?.stage3_planned ||
                checkin?.stage_3_planned ||
                checkin?.stage3_planned_date ||
                checkin?.stage2_planned ||
                checkin?.stage_2_planned ||
                null;

            const s2ActualFromCheckin =
                checkin?.stage3_actual ||
                checkin?.stage_3_actual ||
                checkin?.stage3_task_done_actual ||
                checkin?.stage3_actual_date ||
                checkin?.stage2_actual ||
                checkin?.stage_2_actual ||
                null;

            const s2DoerRemarks =
                checkin?.stage3_doer_remarks ||
                checkin?.stage_3_doer_remarks ||
                checkin?.stage3_remarks ||
                checkin?.stage2_doer_remarks ||
                "";

            const s2Doer =
                checkin?.stage3_doer ||
                checkin?.stage_3_doer ||
                checkin?.stage3_doer_name ||
                checkin?.stage2_doer ||
                "";

            const s2TimeDelay =
                checkin?.stage3_time_delay ||
                checkin?.stage_3_time_delay ||
                "";

            // CRITICAL FIX: Never fall back to row.stage2_planned or row.stage2_actual or row.stage2_remarks
            // because those belong to Stage 3 (Doctor Next Visit Planning, Check-out + 1 day = 31 Jul 2026)!
            // Stage 2 trigger is "During Stay" -> defaults to row.check_in_date
            const s2Planned = s2PlannedFromCheckin || row.check_in_date || row.stage1_call_date_planned || null;
            const s2Actual = s2ActualFromCheckin || null;

            const s2Saved = {
                doerRemarks: s2DoerRemarks,
                remarks: s2DoerRemarks,
                doer: s2Doer,
                timeDelay: s2TimeDelay,
                qrCodeScannedStatus: checkin?.stage2_qr_code_scanned_status_by_guest_or_not || checkin?.stage_2_qr_code_scanned_status_by_guest_or_not || "",
                qrFeedback: checkin?.stage2_guest_feedback_after_scanning_ai_qr_code || checkin?.stage_2_guest_feedback_after_scanning_ai_qr_code || "",
                testimonialFeedback: checkin?.stage2_guest_testinomial_feedback_received_through_html_form || "",
                referralReceived: checkin?.stage2_referral_received_through_referral_html_form || "",
                roomNo: checkin?.room_no || "",
            };

            // Stage 3: Next Visit Planning & Confirmation (Doctor: Dr. Rahul R from stage9_doer)
            // Planned: Strictly Col AI (stage2_planned) | Actual: Strictly Col AJ (stage2_actual)
            const s3Planned = row.stage2_planned || null;
            const s3Actual = row.stage2_actual || null;
            const s3Saved = (row.stage2_next_visit_date || row.stage9_doer || tracker?.doctor_assigned_to_the_client || bookingTakenBy) ? {
                nextVisitDate: row.stage2_next_visit_date ? formatDMYDate(row.stage2_next_visit_date) : "",
                remarks: row.stage2_remarks || "",
                followupDate: "",
                doer: row.stage9_doer || tracker?.doctor_assigned_to_the_client || bookingTakenBy,
            } : null;

            // Stage 4: Guest Feedback & Outcome Confirmation (strictly from ktahv_checkinmasterfms stage4_*)
            const s4Planned = checkin?.stage4_planned || row.stage4_rating_request_call_date_planned || row.check_out_date || null;
            const s4Actual = checkin?.stage4_actual || row.stage4_task_done_actual || null;
            const s4DoerRemarks = checkin?.stage4_doer_remarks || row.stage4_remarks_for_next_visit_date || "";
            const s4Doer = checkin?.stage4_doer || "";
            const s4Saved = {
                doerRemarks: s4DoerRemarks,
                remarks: s4DoerRemarks,
                doer: s4Doer,
                timeDelay: checkin?.stage4_time_delay || "",
                feedbackTakingUrl: checkin?.stage4_feedback_taking_url || "",
                feedbackReport: checkin?.stage4_feedback_report || "",
            };

            // Stage 5: Online Rating & Review Request (CrrCalling / CrrProcess Col AU)
            const c5 = cCalling?.rating;
            const s5Planned = c5?.planned || row.stage4_rating_request_call_date_planned || null;
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
                doer: c5.doer || bookingTakenBy,
            } : (bookingTakenBy ? { doer: bookingTakenBy } : null);

            // Stage 6: Safe Return Confirmation (CrrCalling / CrrProcess Col BA)
            const c6 = cCalling?.return;
            const s6Planned = c6?.planned || row.stage6_call_date_planned || null;
            const s6Actual = c6?.actual || row.stage6_task_done_actual || null;
            const s6ToShow = parseToShow(c6?.to_show);
            const hasS6Data = Boolean(s6Actual || (c6 && (c6.status || c6.stay_feedback || c6.outcome_remarks)));
            const s6Saved = c6 ? {
                stayFeedback: c6.stay_feedback || "",
                outcomeAchieved: c6.did_they_achieve_the_outcomes_planned_for || "",
                outcomeRemarks: c6.outcome_remarks || "",
                status: c6.status || "",
                notDoneRemarks: c6.remarks_why_not_done_or_close || "",
                doer: c6.doer || bookingTakenBy,
            } : (bookingTakenBy ? { doer: bookingTakenBy } : null);

            // Stage 7: Result Tracking & Health Progress Check (CrrCalling / CrrProcess Col BQ)
            const c7 = cCalling?.result;
            const s7Planned = c7?.planned || row.stage7_call_date_planned || null;
            const s7Actual = c7?.actual || row.stage7_task_done_actual || null;
            const s7ToShow = parseToShow(c7?.to_show);
            const hasS7Data = Boolean(s7Actual || (c7 && (c7.status || c7.outcome_remarks || c7.did_they_achieve_the_outcomes_planned_for)));
            const s7Saved = c7 ? {
                outcomeAchieved: c7.did_they_achieve_the_outcomes_planned_for || "",
                outcomeRemarks: c7.outcome_remarks || "",
                status: c7.status || "",
                notDoneRemarks: c7.remarks_why_not_done_or_close || "",
                followupDate: c7.followup_date_for_the_result_and_progress ? formatDMYDate(c7.followup_date_for_the_result_and_progress) : "",
                doer: c7.doer || tracker?.doctor_assigned_to_the_client || bookingTakenBy,
            } : (tracker?.doctor_assigned_to_the_client || bookingTakenBy ? { doer: tracker?.doctor_assigned_to_the_client || bookingTakenBy } : null);

            // Stage 8: Referral Collection & Lead Generation (strictly from ktahv_checkinmasterfms stage5_*)
            const s8Planned = checkin?.stage5_planned || row.stage8_call_date_planned || row.check_out_date || null;
            const s8Actual = checkin?.stage5_actual_referral || row.stage8_task_done_actual || null;
            const s8DoerRemarks = checkin?.stage5_doer_remarks || row.stage7_referals_details || "";
            const s8ReferralTakenStatus = checkin?.stage5_referral_taken_status || (row.stage7_referals_details ? "Yes" : "");
            const s8Doer = checkin?.stage5_doer || "";
            const s8Saved = {
                referralTakenStatus: s8ReferralTakenStatus,
                doerStatus: s8ReferralTakenStatus,
                doerRemarks: s8DoerRemarks,
                remarks: s8DoerRemarks,
                doer: s8Doer,
                timeDelay: checkin?.stage5_time_delay || "",
            };

            // Stage 9: Driver Assignment – Arrival Pickup (Guest Tracker)
            const s9Planned = tracker?.arrival_planned || row.stage1_call_date_planned || null;
            const s9Actual = tracker?.arrival_actual || null;
            const s9Saved = (tracker || bookingTakenBy) ? {
                pickupRequired: tracker?.arrival_doer_name ? "Yes" : "",
                driverName: tracker?.arrival_doer_name || "",
                driverContact: "",
                pickupFrom: "",
                pickupDate: tracker?.arrival_planned ? formatDMYDate(tracker.arrival_planned) : "",
                pickupTime: "",
                remarks: tracker?.client_arrival_data_upload_remarks || "",
                assignedBy: tracker?.arrival_doer_name || "",
                doer: tracker?.arrival_doer_name || bookingTakenBy,
            } : null;

            // Stage 10: Driver Assignment – Departure Drop (Guest Tracker)
            const s10Planned = tracker?.departure_planned || row.stage6_call_date_planned || null;
            const s10Actual = tracker?.departure_actual || null;
            const s10Saved = (tracker || bookingTakenBy) ? {
                dropRequired: tracker?.departure_doer_name ? "Yes" : "",
                driverName: tracker?.departure_doer_name || "",
                driverContact: "",
                dropTo: "",
                dropDate: tracker?.departure_planned ? formatDMYDate(tracker.departure_planned) : "",
                dropTime: "",
                remarks: tracker?.client_departure_data_upload_remarks || "",
                assignedBy: tracker?.departure_doer_name || "",
                doer: tracker?.departure_doer_name || bookingTakenBy,
            } : null;

            // Stage 11: Guest Requirement Verification (Guest Tracker)
            const s11Planned = tracker?.arrival_planned || row.check_in_date || null;
            const s11Completed = Boolean(tracker?.doctor_assigned_to_the_client);
            const s11Actual = s11Completed ? tracker?.updated_at || tracker?.created_at || null : null;
            const s11Saved = (tracker || bookingTakenBy) ? {
                doctorAssignedToClient: tracker?.doctor_assigned_to_the_client || "",
                email: getDoctorEmail(tracker?.doctor_assigned_to_the_client),
                timestamp: tracker?.doctor_assigned_to_the_client ? formatTimestamp(tracker.updated_at) : "",
                doctorAssignStatus: tracker?.doctor_assigned_to_the_client ? "Assigned" : "",
                changedDoctor: "",
                remarks: tracker?.special_request_or_requirement_noted || "",
                doer: tracker?.doctor_assigned_to_the_client || bookingTakenBy,
            } : null;

            const s1ActualValid = filterActualDate(s1Actual);
            const s2ActualValid = filterActualDate(s2Actual);
            const s3ActualValid = filterActualDate(s3Actual);
            const s4ActualValid = filterActualDate(s4Actual);
            const s5ActualValid = filterActualDate(s5Actual);
            const s6ActualValid = filterActualDate(s6Actual);
            const s7ActualValid = filterActualDate(s7Actual);
            const s8ActualValid = filterActualDate(s8Actual);
            const s9ActualValid = filterActualDate(s9Actual);
            const s10ActualValid = filterActualDate(s10Actual);
            const s11ActualValid = filterActualDate(s11Actual);

            const s2Completed = Boolean(
                s2ActualValid ||
                (s2DoerRemarks && s2DoerRemarks.trim() !== "") ||
                (s2Saved.qrCodeScannedStatus && s2Saved.qrCodeScannedStatus !== "Not Scanned" && s2Saved.qrCodeScannedStatus.trim() !== "")
            );
            const s2ActualDateDisplay = formatDMYDate(s2ActualValid) || (s2Completed ? formatDMYDate(filterActualDate(checkin?.updated_at || checkin?.booking_date_time)) : null);

            const s4Completed = Boolean(s4ActualValid || (s4DoerRemarks && s4DoerRemarks.trim() !== ""));
            const s4ActualDateDisplay = formatDMYDate(s4ActualValid) || (s4Completed ? formatDMYDate(filterActualDate(checkin?.updated_at || checkin?.booking_date_time)) : null);

            // Stage 8 is complete only if referral was actually taken and executed on or before today
            const s8HasReferral = Boolean(
                (s8ReferralTakenStatus && !["not taken", "no", ""].includes(s8ReferralTakenStatus.trim().toLowerCase())) ||
                (s8DoerRemarks && s8DoerRemarks.trim() !== "")
            );
            const s8Completed = Boolean(s8ActualValid && s8HasReferral);
            const s8ActualDateDisplay = s8Completed && s8ActualValid ? formatDMYDate(s8ActualValid) : null;

            const stages = [
                // Stage 1: completed only when (actual or submitted data) + to_show=true; toShow & submitted fed through for Processing state
                { stage: 1, available: true, locked: isLockedDate(s1Planned), plannedDate: formatDMYDate(s1Planned), completed: Boolean(s1ActualValid || hasS1Data) && s1ToShow, toShow: s1ToShow, submitted: hasS1Data, actualDate: formatDMYDate(s1ActualValid) || (hasS1Data ? formatDMYDate(c1?.updated_at || c1?.timestamp) : null), savedData: s1Saved },
                { stage: 2, available: true, locked: isLockedDate(s2Planned), plannedDate: formatDMYDate(s2Planned), completed: s2Completed, actualDate: s2ActualDateDisplay, savedData: s2Saved },
                { stage: 3, available: true, locked: isLockedDate(s3Planned), plannedDate: formatDMYDate(s3Planned), completed: Boolean(s3ActualValid), actualDate: formatDMYDate(s3ActualValid), savedData: s3Saved },
                { stage: 4, available: true, locked: isLockedDate(s4Planned), plannedDate: formatDMYDate(s4Planned), completed: s4Completed, actualDate: s4ActualDateDisplay, savedData: s4Saved },
                // Stage 5: two-phase
                { stage: 5, available: true, locked: isLockedDate(s5Planned), plannedDate: formatDMYDate(s5Planned), completed: Boolean(s5ActualValid || hasS5Data) && s5ToShow, toShow: s5ToShow, submitted: hasS5Data, actualDate: formatDMYDate(s5ActualValid) || (hasS5Data ? formatDMYDate(c5?.updated_at || c5?.timestamp) : null), savedData: s5Saved },
                // Stage 6: two-phase
                { stage: 6, available: true, locked: isLockedDate(s6Planned), plannedDate: formatDMYDate(s6Planned), completed: Boolean(s6ActualValid || hasS6Data) && s6ToShow, toShow: s6ToShow, submitted: hasS6Data, actualDate: formatDMYDate(s6ActualValid) || (hasS6Data ? formatDMYDate(c6?.updated_at || c6?.timestamp) : null), savedData: s6Saved },
                // Stage 7: two-phase
                { stage: 7, available: true, locked: isLockedDate(s7Planned), plannedDate: formatDMYDate(s7Planned), completed: Boolean(s7ActualValid || hasS7Data) && s7ToShow, toShow: s7ToShow, submitted: hasS7Data, actualDate: formatDMYDate(s7ActualValid) || (hasS7Data ? formatDMYDate(c7?.updated_at || c7?.timestamp) : null), savedData: s7Saved },
                { stage: 8, available: true, locked: isLockedDate(s8Planned), plannedDate: formatDMYDate(s8Planned), completed: s8Completed, actualDate: s8ActualDateDisplay, savedData: s8Saved },
                // Stages 9,10,11 — excluded from to_show rule, single-phase as before
                { stage: 9, available: true, locked: isLockedDate(s9Planned), plannedDate: formatDMYDate(s9Planned), completed: Boolean(s9ActualValid), actualDate: formatDMYDate(s9ActualValid), savedData: s9Saved },
                { stage: 10, available: true, locked: isLockedDate(s10Planned), plannedDate: formatDMYDate(s10Planned), completed: Boolean(s10ActualValid), actualDate: formatDMYDate(s10ActualValid), savedData: s10Saved },
                { stage: 11, available: true, locked: isLockedDate(s11Planned), plannedDate: formatDMYDate(s11Planned), completed: Boolean(s11ActualValid), actualDate: formatDMYDate(s11ActualValid), savedData: s11Saved },
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
                stages,
            };
        });

        serverCache = {
            data,
            stageUsers,
            timestamp: Date.now(),
        };

        return NextResponse.json(
            {
                success: true,
                count: data.length,
                data,
                stageUsers,
            },
            {
                headers: {
                    "Cache-Control": "private, no-cache, no-transform",
                },
            }
        );
    } catch (err) {
        console.error("[crr-calling/bookings] MySQL fetch failed:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Failed to fetch bookings from database" },
            { status: 500 }
        );
    }
}

// NEW — passthrough for saving stage form data to GAS (doPost)
export async function POST(req: NextRequest) {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        // Same read as GET; this handler answers 403 rather than 401 for both
        // states, which the two branches below preserve verbatim.
        const session = getSessionUserResult(req);

        if (session.state === "missing") {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 403 }
            );
        }

        if (session.state === "invalid") {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 403 }
            );
        }

        const user = session.user;

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: "Malformed JSON payload" },
                { status: 400 }
            );
        }

        // Validate body shape
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, error: "Request body must be a non-null plain object" },
                { status: 400 }
            );
        }

        const { bookingId, stage, fields } = body;

        // Validate bookingId
        if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
            return NextResponse.json(
                { success: false, error: "Missing or invalid bookingId" },
                { status: 400 }
            );
        }

        // Validate stage range (1 to 11)
        if (typeof stage !== "number" || stage < 1 || stage > 11 || !Number.isInteger(stage)) {
            return NextResponse.json(
                { success: false, error: "Invalid stage. Must be an integer between 1 and 11" },
                { status: 400 }
            );
        }

        // Validate fields object
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            return NextResponse.json(
                { success: false, error: "Missing or invalid fields object" },
                { status: 400 }
            );
        }

        // Determine elevated permissions from the authenticated session.
        // Same rule, same coercion, same `all`-wildcard semantics as GET — see the
        // note there for why `'raw'` and not `normalizeRole`, and for the
        // malformed-`permissions` 500 → 403 hardening this read also applies to the
        // write path. `isAdminRole` still travels upstream as `adminOverride` below.
        const isAdminRole =
            hasAnyPermission(user, ["fms.admin"]) ||
            hasAdminRole(user, "raw");

        // Verify stage permission. `hasPermission`'s wildcard is redundant here —
        // an `all` session already satisfied `isAdminRole` and short-circuited.
        const isAuthorized = isAdminRole || hasPermission(user, `crr_fms.stage${stage}`);
        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403 }
            );
        }

        console.log("[crr-calling/bookings] POST incoming request:", {
            bookingId,
            stage,
            fields,
            adminOverride: isAdminRole,
        });

        // One controller/timer spans the fetch AND the full body read, so a
        // slow upstream can't stall the response past the 20s budget after
        // headers arrive.
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        const sharedSecret = process.env.GAS_SHARED_SECRET;

        const res = await fetch(GAS_BOOKINGS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                bookingId,
                stage,
                fields,
                adminOverride: isAdminRole,
                sharedSecret,
            }),
            signal: controller.signal,
        });

        const responseText = await res.text();
        console.log("[crr-calling/bookings] GAS response status:", res.status);
        console.log("[crr-calling/bookings] GAS raw response:", responseText);

        let json: any = null;
        try {
            json = JSON.parse(responseText);
        } catch {
            json = null;
        }

        // 1. If GAS returned a JSON object
        if (json && typeof json === "object") {
            const isFailure =
                json.success === false ||
                json.status === "ERROR" ||
                json.status === "FAIL" ||
                json.status === "error" ||
                json.status === "fail";

            if (!res.ok || isFailure) {
                console.error("[crr-calling/bookings] GAS save failed with status", res.status, "body:", json);
                return NextResponse.json(
                    {
                        success: false,
                        error: json?.error || json?.message || "Booking source rejected the save",
                        details: json,
                    },
                    { status: res.ok ? 502 : res.status }
                );
            }

            return NextResponse.json({
                success: true,
                ...json,
            });
        }

        // 2. If GAS returned an HTML Error page
        if (responseText.includes("<title>Error</title>") || responseText.includes("class=\"errorMessage\"")) {
            // Extract the user-friendly error message from Google's error page
            const match = responseText.match(/<div[^>]*style="text-align:center[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                responseText.match(/<div[^>]*class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i) ||
                responseText.match(/<div[^>]*>([^<]{15,400})<\/div>/i);
            const cleanError = match ? match[1].replace(/<[^>]+>/g, "").trim() : "Booking source execution error";

            console.error("[crr-calling/bookings] GAS execution error:", cleanError);
            return NextResponse.json(
                {
                    success: false,
                    error: cleanError,
                },
                { status: 502 }
            );
        }

        // 3. Non-OK status from GAS
        if (!res.ok) {
            console.error("[crr-calling/bookings] GAS returned non-OK status:", res.status, responseText.slice(0, 200));
            return NextResponse.json(
                {
                    success: false,
                    error: `Booking source returned error status ${res.status}`,
                },
                { status: res.status }
            );
        }

        // 4. Successful output
        console.log("[crr-calling/bookings] GAS saved successfully (HTTP 200)");
        serverCache = null; // Invalidate server cache on update
        return NextResponse.json({
            success: true,
            message: "Stage data saved successfully",
        });
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            console.error("[crr-calling/bookings] POST timed out");
            return NextResponse.json(
                { success: false, error: "Booking source timed out" },
                { status: 504 }
            );
        }

        console.error("[crr-calling/bookings] POST failed with error:", err);
        return NextResponse.json(
            {
                success: false,
                error: "Could not save stage data",
                details: err instanceof Error ? err.message : String(err),
            },
            { status: 500 }
        );
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
