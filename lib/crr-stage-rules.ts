// CRR-FMS stage rules shared by the page (what a user may open/submit) and the
// bookings API (re-checked on save). Same rule for doers and admins (issue #157).
import type { StageInfo, StageStatus } from "@/types/crr";

// Stages using the two-phase to_show model: submitted data stays "Processing"
// until to_show is set (KTAHV_CRR_Calling_FMS.to_show, ktahv_guest_tracker_part2
// stage9/10_to_show, ktahv_guest_tracker.stage11_to_show).
export const TO_SHOW_STAGES = new Set([1, 5, 6, 7, 9, 10, 11]);

// Metadata keys that do not represent user-submitted stage data
export const METADATA_KEYS = new Set(["doer", "assignedBy", "stageKey", "stage_key"]);

export function hasActualSavedContent(saved: Record<string, string | number | null> | null | undefined): boolean {
    if (!saved) return false;
    return Object.entries(saved).some(([k, v]) => !METADATA_KEYS.has(k) && v !== null && String(v).trim() !== "");
}

export function stageStatusOf(stageNo: number, info: StageInfo | undefined): StageStatus {
    if (info?.completed) return "Complete";
    // Prefer the API's `submitted` flag: savedData also carries derived values
    // (stage 9/10 pickupRequired/dropRequired = "Yes" once planned, stage 11
    // timestamp) that would otherwise mark an untouched stage as Processing.
    const submitted = info?.submitted ?? hasActualSavedContent(info?.savedData);
    if (TO_SHOW_STAGES.has(stageNo) && (submitted || info?.actualDate) && !info?.toShow) {
        return "Processing";
    }
    return "Pending";
}

export function isCancelledStatus(bookingStatus: string | null | undefined): boolean {
    return /cancel/i.test(String(bookingStatus ?? ""));
}

const IST_YMD = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

// Today's calendar date in IST as YYYY-MM-DD. Date only, so a stage opens at 12:00 AM IST.
export function istToday(now: Date = new Date()): string {
    return IST_YMD.format(now);
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "18-Sep-2026" / "18-Sept-2026" (API display format) or "2026-09-18" → "2026-09-18"; else null.
export function toYmd(v: string | null | undefined): string | null {
    const s = String(v ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/);
    if (!m) return null;
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi === -1) return null;
    return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function shiftYmd(ymd: string, days: number): string {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function ymdToDisplay(ymd: string): string {
    const [y, m, d] = ymd.split("-");
    const mon = MONTHS[Number(m) - 1];
    return `${d}-${mon[0].toUpperCase()}${mon.slice(1)}-${y}`;
}

// Date each stage opens on, as [source date, day offset]. null = no date gate.
const OPENS_ON: Record<number, readonly ["checkIn" | "checkOut" | "planned", number] | null> = {
    1: ["checkIn", -1],
    2: ["checkIn", 0],
    3: ["checkOut", 0],
    4: ["checkIn", 0],
    5: ["checkOut", 0],
    6: ["planned", 0],
    7: ["planned", 0],
    8: ["checkIn", 0],
    9: null,
    10: null,
    11: ["checkIn", -1],
};

export interface StageGateInput {
    checkIn: string;
    checkOut: string;
    bookingStatus: string;
    info: StageInfo | undefined;
}

function hasPlanned(info: StageInfo | undefined): boolean {
    const p = String(info?.plannedDate ?? "").trim();
    return p !== "" && p !== "-";
}

// Why the stage's form can't be filled yet (scheduling only), or null when it is open.
export function stageDateLock(stageNo: number, g: StageGateInput, today: string = istToday()): string | null {
    if (!hasPlanned(g.info)) {
        return "Form is locked: Planned date is not scheduled yet. Please wait until the planned date is set in the system before filling this stage.";
    }
    const rule = OPENS_ON[stageNo];
    if (!rule) return null;
    const [source, offset] = rule;
    const base = toYmd(source === "planned" ? g.info?.plannedDate : source === "checkIn" ? g.checkIn : g.checkOut);
    if (!base) {
        const label = source === "planned" ? "Planned" : source === "checkIn" ? "Check-in" : "Check-out";
        return `Form is locked: ${label} date is missing for this booking.`;
    }
    const opens = shiftYmd(base, offset);
    if (today < opens) return `Form is locked: This stage opens on ${ymdToDisplay(opens)}.`;
    return null;
}

// Why the stage can't be submitted right now, or null when it can.
export function stageBlockReason(stageNo: number, g: StageGateInput, today: string = istToday()): string | null {
    if (isCancelledStatus(g.bookingStatus)) return "This booking is cancelled.";
    const status = stageStatusOf(stageNo, g.info);
    if (status === "Complete") return "This stage is already completed.";
    if (status === "Processing") return "This stage is already submitted and awaiting confirmation.";
    return stageDateLock(stageNo, g, today);
}

// Stage 5 "Proof of Ratings" upload. Vercel rejects request bodies over 4.5 MB,
// so the file itself stays a little under that to leave room for the form fields.
export const MAX_PROOF_FILE_BYTES = 4_400_000;
export const PROOF_FILE_LIMIT_LABEL = "4.5 MB";

export function isAllowedProofType(mimeType: string): boolean {
    return mimeType.startsWith("image/") || mimeType === "application/pdf";
}
