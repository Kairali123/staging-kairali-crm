"use client";

import { useCallback, useEffect, useState } from "react";
import type { Guest, StageInfo, StageStatus } from "@/types/crr";

/* =========================================================
   REQUIRED TYPE UPDATE — @/types/crr
   GAS now returns two extra fields per stage. Add these to
   the StageInfo interface in @/types/crr:

   export interface StageInfo {
       stage: number;
       available: boolean;
       locked: boolean;
       plannedDate: string | null;
       completed: boolean;              // now driven by actualCol (non-empty = complete)
       actualDate?: string | null;      // NEW — completion timestamp from actualCol
       savedData?: Record<string, string | number | null> | null; // NEW — saved form values for prefill
   }
   ========================================================= */

interface GasBookingRow {
    timestamp: string;
    checkInDate: string;
    checkOutDate: string;
    clientName: string;
    gender: string;
    mobile: number | string;
    country: string;
    countryCode: string;
    email: string;
    bookingId: string;
    daysOfStay: number;
    packageName: string;
    roomType: string;
    roomCategory: string;
    invoiceAmount: number;
    bookingTakenBy: string;
    mid: string;
    bookingNo: string;
    bookingUrl: string;
    uid: string;
    bookingStatus: string;
    rowNumber: number;
    stages?: StageInfo[]; // per-stage lock / planned-date / completion / savedData info from GAS
}

interface GasBookingsResponse {
    success: boolean;
    count: number;
    data: GasBookingRow[];
    error?: string;
}

/* =========================================================
   savedData helpers
   ========================================================= */

// Keys whose values feed <input type="date"> — normalized to YYYY-MM-DD.
const DATE_FIELD_KEYS = new Set(["followupDate", "nextVisitDate", "pickupDate", "dropDate"]);

// GAS returns dates as ISO strings / serialized Dates / formatted strings.
// Date inputs need strict YYYY-MM-DD, so normalize when parseable.
function toDateInputValue(v: unknown): string {
    if (v === null || v === undefined || v === "") return "";
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return String(v);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function asString(v: unknown): string {
    return v === null || v === undefined ? "" : String(v);
}

// Normalized copy of a stage's savedData: everything stringified,
// date-input keys converted to YYYY-MM-DD. Returns null when GAS
// couldn't resolve the stage row (savedData absent).
function normalizeSavedData(
    saved: Record<string, string | number | null> | null | undefined
): Record<string, string> | null {
    if (!saved) return null;
    const out: Record<string, string> = {};
    for (const key of Object.keys(saved)) {
        out[key] = DATE_FIELD_KEYS.has(key)
            ? toDateInputValue(saved[key])
            : asString(saved[key]);
    }
    return out;
}

function stageOf(stages: StageInfo[], stageNo: number): StageInfo | undefined {
    return stages.find((s) => s.stage === stageNo);
}

// True when the saved row has at least one non-empty value —
// used to decide whether legacy per-stage objects should be hydrated.
function hasAnyValue(saved: Record<string, string> | null): boolean {
    return !!saved && Object.values(saved).some((v) => v.trim() !== "");
}

function mapRow(row: GasBookingRow): Guest {

    const room =
        row.roomCategory && row.roomType
            ? `${row.roomCategory} - ${row.roomType}`
            : row.roomType || row.roomCategory || "";

    const stages: StageInfo[] = row.stages ?? [];

    // Derive real progress from GAS:
    // stageStatus[i] = "Complete" when that stage's actualCol (completion
    // timestamp) is non-empty on the stage's own row — GAS resolves the
    // correct CrrCalling row per stage via UID + Call Purpose keyword.
    // currentStage = first not-completed stage (1-indexed); 9 if all 8 are complete.
    // Stages that use the two-phase to_show model (KTAHV_CRR_Calling_FMS.to_show)
    const TO_SHOW_STAGES = new Set([1, 5, 6, 7]);

    const stageStatus: StageStatus[] = Array.from({ length: 11 }, (_, i) => {
        const info = stageOf(stages, i + 1);
        if (info?.completed) return "Complete";
        // Two-phase stages (1, 5, 6, 7): if submitted/saved data exists but to_show is false -> "Processing"
        const hasSavedContent = info?.savedData && Object.values(info.savedData).some(v => v !== null && v !== "" && v !== undefined);
        if (TO_SHOW_STAGES.has(i + 1) && (info?.submitted || info?.actualDate || hasSavedContent) && !info?.toShow) {
            return "Processing";
        }
        return "Pending";
    });
    // "Processing" stages do NOT count as complete for progress tracking.
    // Only "Complete" stages advance currentStage / trigger allComplete.
    const firstIncompleteIdx = stageStatus.findIndex((s) => s !== "Complete");
    const currentStage = firstIncompleteIdx === -1 ? 12 : firstIncompleteIdx + 1;
    const allComplete = firstIncompleteIdx === -1;

    /* ---------- Hydrate per-stage saved objects from GAS savedData ----------
       These used to be client-side only (lost on reload). Now the modal
       open-handlers' existing prefill logic (g.arrivalWelcome etc.) gets
       real persisted values. GAS savedData keys map 1:1 to STAGE_BLOCKS
       saveCols keys. */
    const s1 = normalizeSavedData(stageOf(stages, 1)?.savedData); // Welcome Call
    const s3 = normalizeSavedData(stageOf(stages, 3)?.savedData); // Next Visit / remarks (used directly by openModal via getStageSavedData)
    const s4 = normalizeSavedData(stageOf(stages, 4)?.savedData); // Guest Feedback
    const s5 = normalizeSavedData(stageOf(stages, 5)?.savedData); // Rating Request (field1/2/3 placeholders in GAS)
    const s6 = normalizeSavedData(stageOf(stages, 6)?.savedData); // Safe Return
    const s7 = normalizeSavedData(stageOf(stages, 7)?.savedData); // Result & Progress
    const s8 = normalizeSavedData(stageOf(stages, 8)?.savedData); // Referral Collection

    const arrivalWelcome = hasAnyValue(s1)
        ? ({
              outcomeAchieved: s1!.outcomeAchieved,
              outcomeRemarks: s1!.outcomeRemarks,
              status: s1!.status,
              notDoneRemarks: s1!.notDoneRemarks,
              followupDate: s1!.followupDate,
          } as Guest["arrivalWelcome"])
        : undefined;

    const guestFeedback = hasAnyValue(s4)
        ? ({ doerRemarks: s4!.doerRemarks } as Guest["guestFeedback"])
        : undefined;

    // Stage 5's CrrCalling row shares the per-row call-outcome columns
    // (outcomeAchieved AR / outcomeRemarks AS / status AT / notDoneRemarks AU)
    // with the other calling stages, plus its rating-specific columns
    // (ratingStatus BF / notGivenRemarks BG / proofFileName BH).
    const ratingRequest = hasAnyValue(s5)
        ? ({
              ratingStatus: s5!.ratingStatus,
              notGivenRemarks: s5!.notGivenRemarks,
              proofFileName: s5!.proofFileName,
              outcomeRemarks: s5!.outcomeRemarks,
              status: s5!.status,
              notDoneRemarks: s5!.notDoneRemarks,
              followupDate: s5!.followupDate,
              outcomeAchieved: s5!.outcomeAchieved,
          } as Guest["ratingRequest"])
        : undefined;

    const safeReturn = hasAnyValue(s6)
        ? ({
              stayFeedback: s6!.stayFeedback,
              outcomeAchieved: s6!.outcomeAchieved,
              outcomeRemarks: s6!.outcomeRemarks,
              status: s6!.status,
              notDoneRemarks: s6!.notDoneRemarks,
              followupDate: "", // no followupDate column for stage 6 (confirmed intentional)
          } as Guest["safeReturn"])
        : undefined;

    const resultProgress = hasAnyValue(s7)
        ? ({
              outcomeAchieved: s7!.outcomeAchieved,
              outcomeRemarks: s7!.outcomeRemarks,
              status: s7!.status,
              notDoneRemarks: s7!.notDoneRemarks,
              followupDate: s7!.followupDate,
          } as Guest["resultProgress"])
        : undefined;

    // GAS stage-8 key for "Referral Taken Status" is doerStatus.
    const referralCollection = hasAnyValue(s8)
        ? ({
              referralTakenStatus: s8!.doerStatus,
              doerRemarks: s8!.doerRemarks,
          } as Guest["referralCollection"])
        : undefined;

    const s9 = normalizeSavedData(stageOf(stages, 9)?.savedData); // Driver Assignment Arrival
    const s10 = normalizeSavedData(stageOf(stages, 10)?.savedData); // Driver Assignment Departure
    const s11 = normalizeSavedData(stageOf(stages, 11)?.savedData); // Guest Requirement Verification

    const driverAssignmentArrival = hasAnyValue(s9)
        ? ({
              pickupRequired: s9!.pickupRequired,
              driverName: s9!.driverName,
              driverContact: s9!.driverContact,
              pickupFrom: s9!.pickupFrom,
              pickupDate: s9!.pickupDate,
              pickupTime: s9!.pickupTime,
              remarks: s9!.remarks,
              assignedBy: s9!.assignedBy,
          } as Guest["driverAssignmentArrival"])
        : undefined;

    const driverAssignmentDeparture = hasAnyValue(s10)
        ? ({
              dropRequired: s10!.dropRequired,
              driverName: s10!.driverName,
              driverContact: s10!.driverContact,
              dropTo: s10!.dropTo,
              dropDate: s10!.dropDate,
              dropTime: s10!.dropTime,
              remarks: s10!.remarks,
              assignedBy: s10!.assignedBy,
          } as Guest["driverAssignmentDeparture"])
        : undefined;

    const guestRequirementVerification = hasAnyValue(s11)
        ? ({
              doctorAssignedToClient: s11!.doctorAssignedToClient,
              email: s11!.email,
              timestamp: s11!.timestamp,
              doctorAssignStatus: s11!.doctorAssignStatus,
              changedDoctor: s11!.changedDoctor,
              remarks: s11!.remarks,
          } as Guest["guestRequirementVerification"])
        : undefined;

    return {
        id: row.rowNumber,
        timestamp: row.timestamp,
        bookingId: row.bookingId,
        checkin: row.checkInDate,
        checkout: row.checkOutDate,
        name: row.clientName,
        mobile: String(row.mobile ?? ""),
        email: row.email,
        gender: row.gender,
        country: row.country,
        days: row.daysOfStay,
        programme: row.packageName,
        room,
        bookingNo: row.bookingNo,
        takenBy: row.bookingTakenBy,
        invoice:
            typeof row.invoiceAmount === "number"
                ? "₹" + row.invoiceAmount.toLocaleString("en-IN")
                : String(row.invoiceAmount ?? ""),
        piLink: row.bookingUrl,
        mid: row.mid,
        uid: row.uid,
        bookingStatus: row.bookingStatus,

        currentStage,
        allComplete,
        stageStatus,
        stages,

        // Persisted stage form data (prefill for completed / partially saved stages)
        arrivalWelcome,
        guestFeedback,
        ratingRequest,
        safeReturn,
        resultProgress,
        referralCollection,
        driverAssignmentArrival,
        driverAssignmentDeparture,
        guestRequirementVerification,
    };
}

export function useCrrBookings() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/crr-calling/bookings", { cache: "no-store" });
            const json: GasBookingsResponse = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || "Failed to load bookings");
            }


            const mapped = json.data.map(mapRow).sort((a, b) => b.id - a.id);
            setGuests(mapped);
        } catch (err) {
            console.error("[useCrrBookings] fetch failed:", err);
            setError(err instanceof Error ? err.message : "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    return { guests, setGuests, loading, error, refetch: fetchBookings };
}

/* =========================================================
   Stage helpers — lock status, planned/actual dates,
   completion, prefill data, save call (used in page.tsx)
   ========================================================= */

export function isStageLocked(guest: Guest, stageNo: number): boolean {
    const info = guest.stages.find((s) => s.stage === stageNo);
    if (!info || !info.available) return true; // stage missing from GAS response = locked (safe default)
    return info.locked;
}

export function getStagePlannedDate(guest: Guest, stageNo: number): string | null {
    const info = guest.stages.find((s) => s.stage === stageNo);
    return info?.plannedDate ?? null;
}

// Completion timestamp (actualCol value) — null when incomplete.
export function getStageActualDate(guest: Guest, stageNo: number): string | null {
    const info = guest.stages.find((s) => s.stage === stageNo);
    return info?.actualDate ?? null;
}

// The person responsible for executing a stage (GAS savedData.doer).
// Each stage row/record carries its own doer — this is who the stage-wise
// pending report should attribute the stage to (NOT the booking creator).
export function getStageDoer(guest: Guest, stageNo: number): string {
    const info = guest.stages.find((s) => s.stage === stageNo);
    const doer = info?.savedData?.doer;
    return doer === null || doer === undefined ? "" : String(doer).trim();
}

// A cancelled booking auto-closes its guest journey: no stage is actionable,
// nothing counts as pending, and stage actions are unavailable.
export function isBookingCancelled(guest: Guest): boolean {
    return /cancel/i.test(String(guest.bookingStatus ?? ""));
}

export function isStageCompleted(guest: Guest, stageNo: number): boolean {
    const info = guest.stages.find((s) => s.stage === stageNo);
    return info?.completed === true;
}

// Normalized saved form values for a stage (keys = GAS saveCols keys,
// date-input keys already in YYYY-MM-DD). Null when GAS couldn't resolve
// the stage's row.
export function getStageSavedData(
    guest: Guest,
    stageNo: number
): Record<string, string> | null {
    const info = guest.stages.find((s) => s.stage === stageNo);
    return normalizeSavedData(info?.savedData);
}

export async function saveStage(
    bookingId: string,
    stage: number,
    fields: Record<string, any>,
    // Admin-tier users (super_admin / admin / "all" / "fms.admin") bypass the
    // server-side lock check in GAS — locked/completed stages stay editable
    // for them. GAS must include the matching `body.adminOverride` check.
    adminOverride: boolean = false
): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/crr-calling/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, stage, fields, adminOverride }),
    });
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.error || "Save failed");
    }
    return json;
}
