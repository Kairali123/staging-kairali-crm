"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Guest, StageInfo, StageStatus } from "@/types/crr";
import { METADATA_KEYS, PROOF_FILE_LIMIT_LABEL, isCancelledStatus, stageStatusOf } from "@/lib/crr-stage-rules";
import {
    FOCUS_REFETCH_THROTTLE_MS,
    POLL_GIVE_UP_MS,
    chunk,
    hasToShowFlip,
    nextPollDelay,
    processingTargets,
} from "@/lib/crr-poll";

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
    /** True when booking_id has no matching reservation_id in ktahv_checkinmasterfms (set by API). */
    notCheckedInYet?: boolean;
    stages?: StageInfo[]; // per-stage lock / planned-date / completion / savedData info from GAS
}

export interface StageUser {
    name: string;
    email: string;
    role: string;
    stages: number[];
}

interface GasBookingsResponse {
    success: boolean;
    count: number;
    data: GasBookingRow[];
    stageUsers?: StageUser[];
    error?: string;
}

/* =========================================================
   savedData helpers
   ========================================================= */

// Keys whose values feed <input type="date"> — normalized to YYYY-MM-DD.
const DATE_FIELD_KEYS = new Set(["followupDate", "nextVisitDate", "pickupDate", "dropDate"]);

function toDateInputValue(v: unknown): string {
    if (v === null || v === undefined || v === "") return "";
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dmyMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (dmyMatch) {
        const dd = dmyMatch[1].padStart(2, "0");
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const mIdx = monthNames.indexOf(dmyMatch[2].toLowerCase());
        if (mIdx !== -1) {
            const mm = String(mIdx + 1).padStart(2, "0");
            return `${dmyMatch[3]}-${mm}-${dd}`;
        }
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
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
    return !!saved && Object.entries(saved).some(([k, v]) => !METADATA_KEYS.has(k) && v.trim() !== "");
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
    // Two-phase to_show stages report "Processing" — see stageStatusOf in lib/crr-stage-rules.
    const stageStatus: StageStatus[] = Array.from({ length: 11 }, (_, i) => stageStatusOf(i + 1, stageOf(stages, i + 1)));
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
            stageKey: s1!.stageKey,
        } as Guest["arrivalWelcome"])
        : undefined;

    const nextVisitPlanning = hasAnyValue(s3)
        ? ({
            nextVisitDate: s3!.nextVisitDate,
            remarks: s3!.remarks,
            status: s3!.status,
            actualDate: s3!.actualDate,
            timeDelay: s3!.timeDelay,
            shouldWeRequestRatings: s3!.shouldWeRequestRatings,
            proofOfRating: s3!.proofOfRating,
            link: s3!.link,
            stageKey: s3!.stageKey,
            doer: s3!.doer,
        } as Guest["nextVisitPlanning"])
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
            stageKey: s5!.stageKey,
        } as Guest["ratingRequest"])
        : undefined;

    const safeReturn = hasAnyValue(s6)
        ? ({
            stayFeedback: s6!.stayFeedback,
            outcomeAchieved: s6!.outcomeAchieved,
            outcomeRemarks: s6!.outcomeRemarks,
            status: s6!.status,
            notDoneRemarks: s6!.notDoneRemarks,
            followupDate: s6!.followupDate,
            stageKey: s6!.stageKey,
        } as Guest["safeReturn"])
        : undefined;

    const resultProgress = hasAnyValue(s7)
        ? ({
            outcomeAchieved: s7!.outcomeAchieved,
            outcomeRemarks: s7!.outcomeRemarks,
            status: s7!.status,
            notDoneRemarks: s7!.notDoneRemarks,
            followupDate: s7!.followupDate,
            stageKey: s7!.stageKey,
        } as Guest["resultProgress"])
        : undefined;

    // Stage 8 hydration from checkinmasterfms / GAS
    const referralCollection = hasAnyValue(s8)
        ? ({
            referralTakenStatus: s8!.referralTakenStatus || s8!.doerStatus,
            doerRemarks: s8!.doerRemarks,
        } as Guest["referralCollection"])
        : undefined;

    const s9 = normalizeSavedData(stageOf(stages, 9)?.savedData); // Driver Assignment Arrival
    const s10 = normalizeSavedData(stageOf(stages, 10)?.savedData); // Driver Assignment Departure
    const s11 = normalizeSavedData(stageOf(stages, 11)?.savedData); // Guest Requirement Verification

    const driverAssignmentArrival = hasAnyValue(s9)
        ? ({
            pickupRequired: s9!.pickupRequired,
            driverName: (s9!.driverName && s9!.driverName !== row.bookingTakenBy) ? s9!.driverName : "",
            driverContact: s9!.driverContact,
            pickupFrom: s9!.pickupFrom,
            pickupDate: s9!.pickupDate,
            pickupTime: s9!.pickupTime,
            remarks: s9!.remarks,
            assignedBy: (s9!.assignedBy && s9!.assignedBy !== row.bookingTakenBy) ? s9!.assignedBy : "",
            arrivalFlightDetails: s9!.arrivalFlightDetails,
            assignStatus: s9!.assignStatus,
            assignRemarks: s9!.assignRemarks,
            driverLink: s9!.driverLink,
            timeDelay: s9!.timeDelay,
        } as Guest["driverAssignmentArrival"])
        : undefined;

    const driverAssignmentDeparture = hasAnyValue(s10)
        ? ({
            dropRequired: s10!.dropRequired,
            driverName: (s10!.driverName && s10!.driverName !== row.bookingTakenBy) ? s10!.driverName : "",
            driverContact: s10!.driverContact,
            dropTo: s10!.dropTo,
            dropDate: s10!.dropDate,
            dropTime: s10!.dropTime,
            remarks: s10!.remarks,
            assignedBy: (s10!.assignedBy && s10!.assignedBy !== row.bookingTakenBy) ? s10!.assignedBy : "",
            departureFlightDetails: s10!.departureFlightDetails,
            departureAssignStatus: s10!.departureAssignStatus,
            departureAssignRemarks: s10!.departureAssignRemarks,
            driverLink: s10!.driverLink,
            timeDelay: s10!.timeDelay,
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
        notCheckedInYet: row.notCheckedInYet ?? false,

        currentStage,
        allComplete,
        stageStatus,
        stages,

        // Persisted stage form data (prefill for completed / partially saved stages)
        arrivalWelcome,
        nextVisitPlanning,
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

interface CacheEntry {
    guests: Guest[];
    stageUsers: StageUser[];
    timestamp: number;
}

const crrClientCache = new Map<string, CacheEntry>();

export function useCrrBookings(from?: string, to?: string) {
    const cacheKey = `${from || ""}_${to || ""}`;
    const cached = crrClientCache.get(cacheKey);

    const [guests, setGuests] = useState<Guest[]>(() => cached?.guests ?? []);
    const [stageUsers, setStageUsers] = useState<StageUser[]>(() => cached?.stageUsers ?? []);
    const [loading, setLoading] = useState(() => !cached);
    const [isRevalidating, setIsRevalidating] = useState(() => Boolean(cached));
    const [error, setError] = useState<string | null>(null);
    const [pollNonce, setPollNonce] = useState(0);
    // The guest behind an open modal. Background refreshes leave that one row untouched
    // so a half-filled form is never overwritten underneath the user.
    const [lockedGuestId, setLockedGuestId] = useState<number | null>(null);

    const guestsRef = useRef<Guest[]>(guests);
    const lockedGuestIdRef = useRef<number | null>(lockedGuestId);
    const lastFetchAtRef = useRef(0);
    const pollAttemptRef = useRef(0);
    const pollStartedAtRef = useRef<number | null>(null);

    useEffect(() => { guestsRef.current = guests; }, [guests]);
    useEffect(() => { lockedGuestIdRef.current = lockedGuestId; }, [lockedGuestId]);

    const fetchBookings = useCallback(async (isBackground = false, preserveGuestId?: number | null) => {
        if (isBackground) {
            setIsRevalidating(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to)   params.set("to",   to);
            const url = `/api/crr-calling/bookings${params.size ? "?" + params.toString() : ""}`;
            const res = await fetch(url, { cache: "no-store" });
            const json: GasBookingsResponse = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || "Failed to load bookings");
            }

            const mapped = json.data.map(mapRow).sort((a, b) => b.id - a.id);
            // Keep the row behind an open modal exactly as the user left it.
            const next = preserveGuestId == null
                ? mapped
                : mapped.map((g) => (g.id === preserveGuestId
                    ? guestsRef.current.find((prev) => prev.id === preserveGuestId) ?? g
                    : g));
            setGuests(next);
            lastFetchAtRef.current = Date.now();
            const fetchedUsers = json.stageUsers || [];
            setStageUsers(fetchedUsers);
            crrClientCache.set(cacheKey, {
                guests: next,
                stageUsers: fetchedUsers,
                timestamp: Date.now(),
            });
        } catch (err) {
            console.error("[useCrrBookings] fetch failed:", err);
            setError(err instanceof Error ? err.message : "Failed to load bookings");
        } finally {
            setLoading(false);
            setIsRevalidating(false);
        }
    }, [from, to, cacheKey]);

    useEffect(() => {
        const hasCached = crrClientCache.has(cacheKey);
        fetchBookings(hasCached);
    }, [fetchBookings, cacheKey]);

    const refetch = useCallback(() => fetchBookings(true), [fetchBookings]);

    // Coming back to the tab is the cheapest possible signal that time has passed
    // and something may have been confirmed elsewhere. Throttled so alt-tabbing
    // does not turn into a burst of requests.
    useEffect(() => {
        const maybeRefetch = () => {
            if (document.visibilityState !== "visible") return;
            if (Date.now() - lastFetchAtRef.current < FOCUS_REFETCH_THROTTLE_MS) return;
            void fetchBookings(true, lockedGuestIdRef.current);
        };
        window.addEventListener("focus", maybeRefetch);
        document.addEventListener("visibilitychange", maybeRefetch);
        return () => {
            window.removeEventListener("focus", maybeRefetch);
            document.removeEventListener("visibilitychange", maybeRefetch);
        };
    }, [fetchBookings]);

    // While any stage sits in "Processing", poll the status-only endpoint until its
    // to_show flips, then pull the authoritative payload through the normal endpoint.
    // Gives up after POLL_GIVE_UP_MS; the focus listener above still covers it after that.
    useEffect(() => {
        const targets = processingTargets(guests, lockedGuestId);
        if (targets.length === 0) {
            pollStartedAtRef.current = null;
            pollAttemptRef.current = 0;
            return;
        }
        if (pollStartedAtRef.current == null) pollStartedAtRef.current = Date.now();
        if (Date.now() - pollStartedAtRef.current > POLL_GIVE_UP_MS) return;

        let cancelled = false;
        const timer = setTimeout(async () => {
            if (cancelled) return;
            try {
                // Chunked: the route caps one request, and a busy page can easily
                // have more bookings waiting than that cap allows.
                const batches = await Promise.all(
                    chunk(targets).map(async (bookings) => {
                        const res = await fetch("/api/crr-calling/stage-status", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ bookings }),
                            cache: "no-store",
                        });
                        const json = await res.json();
                        return res.ok && json.success ? (json.data || []) : [];
                    })
                );
                const rows = batches.flat();
                if (cancelled) return;
                if (hasToShowFlip(guestsRef.current, rows, lockedGuestIdRef.current)) {
                    pollAttemptRef.current = 0;
                    pollStartedAtRef.current = null;
                    await fetchBookings(true, lockedGuestIdRef.current);
                    return; // the resulting guests change reschedules if anything is still pending
                }
            } catch {
                // Transient network/API failure: keep backing off rather than giving up.
            }
            if (cancelled) return;
            pollAttemptRef.current += 1;
            setPollNonce((n) => n + 1);
        }, nextPollDelay(pollAttemptRef.current));

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [guests, lockedGuestId, pollNonce, fetchBookings]);

    return { guests, setGuests, loading, isRevalidating, error, refetch, stageUsers, setLockedGuestId };
}

/* =========================================================
   Stage helpers — lock status, planned/actual dates,
   completion, prefill data, save call (used in page.tsx)
   ========================================================= */

export function isStageLocked(guest: Guest, stageNo: number): boolean {
    const info = guest.stages.find((s) => s.stage === stageNo);
    if (!info || !info.available) return false;
    // If planned date is not set, stage is not locked (caller handles this separately)
    if (!info.plannedDate || String(info.plannedDate).trim() === "") return false;
    return info.locked;
}

// Returns true when the stage has NO planned date at all.
// This lock applies unconditionally — Super Admin cannot bypass it.
// If a stage has no Planned Date, no user (including Super Admin) may fill/submit the form.
export function hasStageNoPlannedDate(guest: Guest, stageNo: number): boolean {
    const info = guest.stages?.find((s) => s.stage === stageNo);
    const pd = info?.plannedDate;
    return !pd || String(pd).trim() === "" || String(pd).trim() === "-";
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

export const DEFAULT_STAGE_USERS: StageUser[] = [
    { name: "Jinsha Manoj MV", email: "grm@ktahv.com", role: "grm", stages: [1, 2, 4, 5, 6, 8] },
    { name: "Dr. Rahul R", email: "doctor@ktahv.com", role: "doctor", stages: [3, 7] },
    { name: "Shoukath Ali Moosa", email: "fom@ktahv.com", role: "fom", stages: [9, 10] },
    { name: "Anoop Vijayaraj", email: "gm.hv@kairali.com", role: "gm", stages: [11] },
];

export function getAssignedStageUser(stageNo: number, stageUsers?: StageUser[]): string {
    if (stageUsers && stageUsers.length > 0) {
        const found = stageUsers.find((u) => u.stages?.includes(stageNo));
        if (found?.name && found.name.trim() !== "") {
            return found.name.trim();
        }
    }
    const def = DEFAULT_STAGE_USERS.find((u) => u.stages?.includes(stageNo));
    if (def?.name && def.name.trim() !== "") {
        return def.name.trim();
    }
    return "";
}

// The person responsible for executing a stage (GAS savedData.doer or assigned stage user).
// When no value is present, ALWAYS shows the assigned stage user name.
// NEVER falls back to bookingTakenBy (salesperson / booking creator).
export function getStageDoer(guest: Guest | null | undefined, stageNo: number, stageUsers?: StageUser[]): string {
    if (!guest) return getAssignedStageUser(stageNo, stageUsers);

    const info = guest.stages?.find((s) => s.stage === stageNo);
    const doer = info?.savedData?.doer;

    // Stage 3 & 7: Doctor stages -> must strictly be doctor, never salesperson / bookingTakenBy
    if (stageNo === 3 || stageNo === 7) {
        if (doer && String(doer).trim() !== "" && doer !== guest.takenBy) {
            return String(doer).trim();
        }
        const doc = guest.guestRequirementVerification?.doctorAssignedToClient ||
                    guest.guestRequirementVerification?.changedDoctor ||
                    guest.stages?.find((s) => s.stage === 11)?.savedData?.doctorAssignedToClient ||
                    guest.stages?.find((s) => s.stage === 11)?.savedData?.changedDoctor;
        if (doc && String(doc).trim() !== "") return String(doc).trim();
        const assignedDoc = getAssignedStageUser(stageNo, stageUsers);
        return assignedDoc || "Doctor";
    }

    // Stage 11: GM stage (Guest Requirement Verification) -> strictly GM (Anoop Vijayaraj / assigned GM), NEVER the doctor being assigned
    if (stageNo === 11) {
        const assignedDoctor = guest.guestRequirementVerification?.doctorAssignedToClient ||
                               guest.guestRequirementVerification?.changedDoctor ||
                               info?.savedData?.doctorAssignedToClient ||
                               info?.savedData?.changedDoctor;
        // Accept saved doer only if it is genuinely the GM, not the assigned doctor, not a doctor title, and not bookingTakenBy
        if (doer && String(doer).trim() !== "" && doer !== guest.takenBy && doer !== assignedDoctor && !/^dr\.?\s/i.test(String(doer)) && doer !== "Doctor") {
            return String(doer).trim();
        }
        const assignedGm = getAssignedStageUser(11, stageUsers);
        return assignedGm || "Anoop Vijayaraj";
    }

    // Stage 9 & 10: FO stages (Driver Assignment – Arrival Pickup & Departure Drop) -> strictly FO (Shoukath Ali Moosa / assigned FO), NEVER salesperson or driver
    if (stageNo === 9 || stageNo === 10) {
        const assignedDriver = (stageNo === 9 ? guest.driverAssignmentArrival?.driverName : guest.driverAssignmentDeparture?.driverName) ||
                               info?.savedData?.driverName;
        // Accept saved doer only if it is genuinely FO staff, not the assigned driver, and not bookingTakenBy
        if (doer && String(doer).trim() !== "" && doer !== guest.takenBy && doer !== assignedDriver) {
            return String(doer).trim();
        }
        const assignedFo = getAssignedStageUser(stageNo, stageUsers);
        return assignedFo || "Shoukath Ali Moosa";
    }

    // If an actual execution doer value was saved and is not the booking salesperson:
    if (doer && String(doer).trim() !== "" && doer !== guest.takenBy) {
        return String(doer).trim();
    }

    // Always fallback to the assigned stage user name if no saved doer value is present.
    // NEVER show bookingTakenBy (guest.takenBy).
    const assignedUser = getAssignedStageUser(stageNo, stageUsers);
    if (assignedUser) {
        return assignedUser;
    }

    return "";
}

// A cancelled booking auto-closes its guest journey: no stage is actionable,
// nothing counts as pending, and stage actions are unavailable.
export function isBookingCancelled(guest: Guest): boolean {
    return isCancelledStatus(guest.bookingStatus);
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

// Stage key for a stage (e.g. ${uid}_Stage1) from KTAHV_CRR_Calling_FMS.stage_key or derived from UID
export function getStageKey(guest: Guest, stageNo: number): string | null {
    const info = guest.stages?.find((s) => s.stage === stageNo);
    return info?.stageKey ?? (guest.uid ? `${guest.uid}_Stage${stageNo}` : null);
}

export async function saveStage(
    bookingId: string,
    stage: number,
    fields: Record<string, any>,
    // Admin-tier users (super_admin / admin / "all" / "fms.admin") bypass the
    // server-side lock check in GAS — locked/completed stages stay editable
    // for them. GAS must include the matching `body.adminOverride` check.
    adminOverride: boolean = false,
    // Stage 5 proof file: sent as multipart; the server base64-encodes it for GAS
    file?: File | null
): Promise<{ success: boolean; error?: string }> {
    let body: BodyInit;
    const headers: HeadersInit = {};
    if (file) {
        const form = new FormData();
        form.set("bookingId", bookingId);
        form.set("stage", String(stage));
        form.set("fields", JSON.stringify(fields));
        form.set("file", file, file.name);
        body = form;
    } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ bookingId, stage, fields, adminOverride });
    }
    const res = await fetch("/api/crr-calling/bookings", { method: "POST", headers, body });
    // Vercel answers an oversized body with a non-JSON 413
    const json = await res.json().catch(() => null);
    if (!json?.success) {
        throw new Error(
            json?.error || (res.status === 413 ? `File is too large. Please upload a file below ${PROOF_FILE_LIMIT_LABEL}.` : "Save failed")
        );
    }
    return json;
}
