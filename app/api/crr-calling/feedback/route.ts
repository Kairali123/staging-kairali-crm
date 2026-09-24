import { NextRequest, NextResponse } from "next/server";
import { getSessionUserResult, hasAdminRole, hasAnyPermission, hasPermission } from "@/lib/authz";
import { getPool } from "@/lib/db";
import { FEEDBACK_FIELD_NAMES, FEEDBACK_FIELDS, uploadFieldNames } from "@/lib/crr-feedback-form";

// Stage 4 guest feedback used to open an Apps Script page in a new tab. The form now
// lives in the CRR modal, and this route is the only thing that talks to Apps Script:
// a browser fetch straight to script.google.com is blocked by CORS, and proxying keeps
// the endpoint URLs server-side.
//
// GET  → the form's lookup lists (rooms, doctors). The Apps Script page fills these
//        with google.script.run, which only works inside an Apps-Script-hosted page,
//        so we read the same lists from our own database instead.
// POST → forwards the answers to the same endpoint the old page posted to, so the
//        submitted data lands exactly where it always has.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

// The endpoint the live feedback page posts to.
const SUBMIT_URL = "https://script.google.com/macros/s/AKfycbzoigLKlR9p0sVItpGislZgxigTeOvDRoTzHkRdy1BqXZln5I5F2HfDM6Btho1_sn9amw/exec";

const UPSTREAM_TIMEOUT_MS = 60_000;

// Vercel rejects request bodies over ~4.5 MB and uploads travel as base64, which
// inflates by about a third. Matches the ceiling stage 5 already uses for its proof file.
const MAX_BODY_BYTES = 4_400_000;

function deny(error: string, status: number) {
    return NextResponse.json({ success: false, error }, { status, headers: NO_STORE_HEADERS });
}

function gate(req: NextRequest) {
    const session = getSessionUserResult(req);
    if (session.state === "missing") return deny("Access denied: Not logged in", 401);
    if (session.state === "invalid") return deny("Access denied: Invalid session", 401);
    const user = session.user;
    const allowed =
        hasAnyPermission(user, ["fms.admin"]) ||
        hasAdminRole(user, "raw") ||
        hasPermission(user, "crr_fms.stage4");
    if (!allowed) return deny("Access denied: Stage 4 permission required", 403);
    return null;
}

export async function GET(req: NextRequest) {
    const blocked = gate(req);
    if (blocked) return blocked;

    try {
        const pool = await getPool();
        const [rooms, doctors] = await Promise.all([
            pool.query<any[]>(
                `SELECT DISTINCT room_no AS v FROM ktahv_checkinmasterfms
                 WHERE room_no IS NOT NULL AND TRIM(room_no) NOT IN ('', '-') ORDER BY room_no`
            ),
            pool.query<any[]>(
                `SELECT DISTINCT doctor_assigned_to_the_client AS v FROM ktahv_guest_tracker
                 WHERE doctor_assigned_to_the_client IS NOT NULL AND TRIM(doctor_assigned_to_the_client) <> ''
                 ORDER BY v`
            ),
        ]);
        const list = (r: any) => ((r[0] || []) as any[]).map((x) => String(x.v).trim()).filter(Boolean);
        return NextResponse.json(
            { success: true, data: { rooms: list(rooms), doctors: list(doctors) } },
            { headers: NO_STORE_HEADERS }
        );
    } catch (err) {
        console.error("[crr-calling/feedback] lookup failed:", err);
        return deny("Lookup lists are unavailable right now", 502);
    }
}

export async function POST(req: NextRequest) {
    const blocked = gate(req);
    if (blocked) return blocked;

    let body: any;
    try {
        const raw = await req.text();
        if (raw.length > MAX_BODY_BYTES) return deny("Attachments are too large. Please use smaller files.", 413);
        body = JSON.parse(raw);
    } catch {
        return deny("Invalid request body", 400);
    }

    const values = body?.values;
    if (!values || typeof values !== "object" || Array.isArray(values)) {
        return deny("'values' must be an object of form fields", 400);
    }

    // Only the form's own fields are forwarded, so a tampered client cannot inject
    // arbitrary keys into the sheet.
    const allowed = new Set<string>(FEEDBACK_FIELD_NAMES);
    for (const f of FEEDBACK_FIELDS) {
        if (f.kind === "file") for (const n of uploadFieldNames(f.name)) allowed.add(n);
    }

    const form = new URLSearchParams();
    const rejected: string[] = [];
    for (const [k, v] of Object.entries(values)) {
        if (!allowed.has(k)) { rejected.push(k); continue; }
        if (v === undefined || v === null) continue;
        form.set(k, typeof v === "boolean" ? (v ? "on" : "") : String(v));
    }
    if (rejected.length > 0) {
        return deny(`Unknown field(s): ${rejected.slice(0, 5).join(", ")}`, 400);
    }

    try {
        // Same content type a native form POST sends, so Apps Script reads it unchanged.
        const res = await fetch(SUBMIT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
            redirect: "follow",
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        if (!res.ok) {
            console.error("[crr-calling/feedback] upstream rejected:", res.status);
            return deny("The feedback service rejected the submission. Please try again.", 502);
        }
        return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    } catch (err) {
        console.error("[crr-calling/feedback] submit failed:", err);
        return deny("Could not reach the feedback service. Please try again.", 502);
    }
}
