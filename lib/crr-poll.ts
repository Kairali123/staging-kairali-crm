// Auto-refresh for CRR-FMS stages stuck in "Processing".
//
// A submitted stage stays "Processing" until the external system sets its to_show
// flag; nothing in this codebase writes that flag, so the browser has no way to
// learn it flipped. These helpers drive a cheap poll of /api/crr-calling/stage-status
// that only *detects* the flip — the authoritative payload is then re-fetched through
// the normal bookings endpoint, so completion rules stay in one place on the server.

import type { Guest } from "@/types/crr";

// Backoff: responsive right after a submit, then easing off. The last value repeats.
export const POLL_DELAYS_MS = [5_000, 5_000, 10_000, 15_000, 30_000];

// Stop polling a stage that never gets confirmed. Focus/visibility refetch still
// catches it whenever the user comes back to the tab.
export const POLL_GIVE_UP_MS = 10 * 60_000;

// Refetch on tab focus at most this often, so alt-tabbing does not hammer the API.
export const FOCUS_REFETCH_THROTTLE_MS = 30_000;

// Bounds one request. The client chunks to this size and the route rejects anything
// larger, so the two cannot disagree about the limit.
export const MAX_POLL_BOOKINGS = 50;

export function chunk<T>(items: T[], size: number = MAX_POLL_BOOKINGS): T[][] {
    if (size < 1) throw new Error("chunk size must be at least 1");
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

export function nextPollDelay(attempt: number): number {
    if (attempt < 0) return POLL_DELAYS_MS[0];
    return POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)];
}

export interface PollTarget {
    bookingId: string;
    uid: string;
}

// Bookings with at least one stage awaiting confirmation. `lockedGuestId` is the row
// behind an open modal: it is left out so an in-progress form is never disturbed.
export function processingTargets(guests: Guest[], lockedGuestId?: number | null): PollTarget[] {
    const out: PollTarget[] = [];
    const seen = new Set<string>();
    for (const g of guests) {
        if (lockedGuestId != null && g.id === lockedGuestId) continue;
        if (!g.bookingId) continue;
        if (!g.stageStatus?.some((s) => s === "Processing")) continue;
        if (seen.has(g.bookingId)) continue;
        seen.add(g.bookingId);
        out.push({ bookingId: g.bookingId, uid: g.uid || "" });
    }
    return out;
}

export interface StageStatusRow {
    bookingId: string;
    toShow: Record<number, boolean>;
}

// True when the server reports a to_show that differs from what this client holds —
// the signal to pull a fresh full payload. Stages the response omits are ignored.
export function hasToShowFlip(guests: Guest[], rows: StageStatusRow[], lockedGuestId?: number | null): boolean {
    const byBookingId = new Map<string, Guest>();
    for (const g of guests) {
        if (lockedGuestId != null && g.id === lockedGuestId) continue;
        if (g.bookingId && !byBookingId.has(g.bookingId)) byBookingId.set(g.bookingId, g);
    }
    for (const row of rows) {
        const guest = byBookingId.get(row.bookingId);
        if (!guest) continue;
        for (const [stageStr, serverToShow] of Object.entries(row.toShow ?? {})) {
            const stage = Number(stageStr);
            const info = guest.stages?.find((s) => s.stage === stage);
            if (!info) continue;
            if (Boolean(info.toShow) !== Boolean(serverToShow)) return true;
        }
    }
    return false;
}
