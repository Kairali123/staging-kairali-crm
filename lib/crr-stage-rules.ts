// CRR-FMS stage rules shared by the page (what a user may open/submit) and the
// bookings API (re-checked on save). Same rule for doers and admins (issue #157).
import type { StageInfo, StageStatus } from "@/types/crr";

// Metadata keys that do not represent user-submitted stage data
export const METADATA_KEYS = new Set(["doer", "assignedBy", "stageKey", "stage_key"]);

// A stage is done as soon as the database holds its actual date and its submitted
// data. The previous two-phase model kept such a stage "Processing" until an
// external system set to_show; that intermediate state is gone.
export function stageStatusOf(_stageNo: number, info: StageInfo | undefined): StageStatus {
    if (info?.completed) return "Complete";
    return "Pending";
}

// Stage 8 referral collection posts to its own Apps Script deployment, but only
// once the doer answered "Yes" and actually filled in entries. Anything else —
// another stage, a "No", or a "Yes" with nothing filled — keeps the original
// endpoint and envelope.
export function isStage8ReferralSubmission(
    stage: number,
    fields: Record<string, unknown> | null | undefined
): boolean {
    if (stage !== 8 || !fields) return false;
    if (String(fields.doerStatus ?? "").trim().toLowerCase() !== "yes") return false;
    const referrals = fields.referrals;
    return Array.isArray(referrals) && referrals.length > 0;
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

// Stages 9/10/11 can no longer be performed once the booking's own check-in
// (9, 11) or check-out (10) date has passed with no planned date ever set.
// They close on their own; the reason replaces a blank "Complete".
export function autoCloseReason(
    plannedVal: unknown,
    gateVal: unknown,
    label: string,
    today: string = istToday()
): string | null {
    if (plannedVal || !gateVal) return null;
    let gate = typeof gateVal === "string" ? toYmd(gateVal) : null;
    if (!gate) {
        const d = gateVal instanceof Date ? gateVal : new Date(String(gateVal));
        if (isNaN(d.getTime())) return null;
        gate = istToday(d);
    }
    return gate < today ? `Auto-closed: ${label} date passed without a planned date.` : null;
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
    if (status === "Complete") return g.info?.autoClosed || "This stage is already completed.";
    return stageDateLock(stageNo, g, today);
}

// Stage 5 "Proof of Ratings" upload. Vercel rejects request bodies over 4.5 MB,
// so the file itself stays a little under that to leave room for the form fields.
export const MAX_PROOF_FILE_BYTES = 4_400_000;
export const PROOF_FILE_LIMIT_LABEL = "4.5 MB";

export function isAllowedProofType(mimeType: string): boolean {
    return mimeType.startsWith("image/") || mimeType === "application/pdf";
}
