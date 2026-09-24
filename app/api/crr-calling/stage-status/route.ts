import { NextRequest, NextResponse } from "next/server";
import {
    getPermissions,
    getSessionUserResult,
    hasAdminRole,
    hasAnyPermission,
} from "@/lib/authz";
import { getPool } from "@/lib/db";
import { CALLING_STAGES, findCallingRowForStage, indexCallingRows, parseToShow } from "@/lib/crr-calling-rows";
import { MAX_POLL_BOOKINGS } from "@/lib/crr-poll";

// Status-only companion to /api/crr-calling/bookings. The CRR-FMS page polls this
// while a stage sits in "Processing" (submitted, waiting on the external system to
// set to_show). It reads the to_show flags for the handful of bookings being waited
// on and nothing else — no joins, no savedData, no writes — so a short poll interval
// stays cheap. The full payload is only re-fetched once a flag actually flips.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

// Bounds the query regardless of what a client sends; the client chunks to the
// same constant, so a well-behaved caller never trips this.
const MAX_BOOKINGS = MAX_POLL_BOOKINGS;

interface RequestedBooking {
    bookingId: string;
    uid: string;
}

function parseBookings(raw: unknown): { bookings: RequestedBooking[] } | { error: string } {
    if (!Array.isArray(raw)) return { error: "'bookings' must be an array" };
    if (raw.length > MAX_BOOKINGS) return { error: `'bookings' holds ${raw.length} entries, over the ${MAX_BOOKINGS} limit` };
    const bookings: RequestedBooking[] = [];
    for (const item of raw) {
        if (!item || typeof item !== "object") return { error: "each entry must be an object" };
        const bookingId = String((item as any).bookingId ?? "").trim();
        const uid = String((item as any).uid ?? "").trim();
        if (!bookingId) return { error: "each entry needs a non-empty bookingId" };
        if (bookingId.length > 64 || uid.length > 64) return { error: "bookingId and uid are limited to 64 characters" };
        bookings.push({ bookingId, uid });
    }
    return { bookings };
}

export async function POST(req: NextRequest) {
    try {
        const session = getSessionUserResult(req);
        if (session.state === "missing") {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 401, headers: NO_STORE_HEADERS }
            );
        }
        if (session.state === "invalid") {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 401, headers: NO_STORE_HEADERS }
            );
        }

        const user = session.user;
        const permissions = getPermissions(user);
        const isAdmin = hasAnyPermission(user, ["fms.admin"]) || hasAdminRole(user, "raw");
        const hasReadPermission =
            isAdmin ||
            hasAnyPermission(user, ["crr_fms.view", "fms.view", "bookings.view"]) ||
            permissions.some((p) => p.startsWith("crr_fms.stage"));

        if (!hasReadPermission) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403, headers: NO_STORE_HEADERS }
            );
        }

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: "Invalid JSON body" },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }

        const parsed = parseBookings(body?.bookings);
        if ("error" in parsed) {
            return NextResponse.json(
                { success: false, error: parsed.error },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        const { bookings } = parsed;
        if (bookings.length === 0) {
            return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
        }

        const bookingIds = [...new Set(bookings.map((b) => b.bookingId))];
        const uids = [...new Set(bookings.map((b) => b.uid).filter(Boolean))];

        const pool = await getPool();
        const [callingResult, trackerResult, tracker2Result] = await Promise.all([
            uids.length > 0
                ? pool.query<any[]>(
                    `SELECT uid, stage_key, call_purpose, to_show
                     FROM KTAHV_CRR_Calling_FMS
                     WHERE uid IN (?)
                     ORDER BY id ASC`,
                    [uids]
                  )
                : Promise.resolve([[]] as any),
            pool.query<any[]>(
                `SELECT booking_id, stage11_to_show
                 FROM ktahv_guest_tracker
                 WHERE booking_id IN (?)`,
                [bookingIds]
            ),
            pool.query<any[]>(
                `SELECT booking_id, stage9_to_show, stage10_to_show
                 FROM ktahv_guest_tracker_part2
                 WHERE booking_id IN (?)`,
                [bookingIds]
            ),
        ]);

        const callingIndex = indexCallingRows<any>((callingResult as any)[0] || []);

        const trackerMap = new Map<string, any>();
        for (const r of ((trackerResult as any)[0] || [])) {
            trackerMap.set(String(r.booking_id), r);
            trackerMap.set(String(r.booking_id).toLowerCase(), r);
        }
        const tracker2Map = new Map<string, any>();
        for (const r of ((tracker2Result as any)[0] || [])) {
            tracker2Map.set(String(r.booking_id), r);
            tracker2Map.set(String(r.booking_id).toLowerCase(), r);
        }

        const data = bookings.map(({ bookingId, uid }) => {
            const tracker = trackerMap.get(bookingId) || trackerMap.get(bookingId.toLowerCase());
            const tracker2 = tracker2Map.get(bookingId) || tracker2Map.get(bookingId.toLowerCase());
            const toShow: Record<number, boolean> = {};

            for (const stage of CALLING_STAGES) {
                const row = uid ? findCallingRowForStage(callingIndex, uid, stage) : null;
                if (row) toShow[stage] = parseToShow(row.to_show);
            }

            // Same column mapping the bookings route uses for these three stages.
            if (tracker2) {
                toShow[9] = parseToShow(tracker2.stage10_to_show ?? tracker2.stage9_to_show);
                toShow[10] = parseToShow(tracker2.stage9_to_show);
            }
            if (tracker) {
                toShow[11] = parseToShow(tracker.stage11_to_show);
            }

            return { bookingId, toShow };
        });

        return NextResponse.json({ success: true, data }, { headers: NO_STORE_HEADERS });
    } catch (err) {
        console.error("[crr-calling/stage-status] failed:", err);
        return NextResponse.json(
            { success: false, error: "Failed to load stage status" },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
