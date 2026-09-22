import { NextRequest, NextResponse } from "next/server";
import {
    getPermissions,
    getSessionUserResult,
    hasAdminRole,
    hasAnyPermission,
    hasPermission,
} from "@/lib/authz";

import { getPool } from "@/lib/db";
import { MAX_PROOF_FILE_BYTES, PROOF_FILE_LIMIT_LABEL, autoCloseReason, isAllowedProofType, isStage8ReferralSubmission, istToday, stageBlockReason } from "@/lib/crr-stage-rules";
import { findCallingRowForStage, indexCallingRows, parseToShow } from "@/lib/crr-calling-rows";
import type { StageInfo } from "@/types/crr";

// Stage 8 referral collection has its own Apps Script deployment and its own
// payload shape. It is used only when the doer answered "Yes" and actually filled
// in referral entries; a "No" submission still goes to GAS_BOOKINGS_URL below.
const GAS_STAGE8_REFERRAL_URL =
    "https://script.google.com/macros/s/AKfycbzrsZGVVLk8pMhota7GSCPzj3BpLn_Ho1MQ5AG5G-laSZpwvJO6UGUfenY9tAfn2R8l/exec";

const GAS_BOOKINGS_URL =
    // "https://script.google.com/macros/s/AKfycbzG_1Y18INn0l0mNXoPtNH50s24WjpGq_WIGeKkUcWcMWELSvcK7cHmxtS4iUmiel6eqA/exec";
    "https://script.google.com/macros/s/AKfycbyzNdrB-UocDp-Q_RX8rXBs3Bnm4D6nfGa1BN2BEvbRWQ5fSbrYkSirFT0iQujRFRBmcw/exec";

const UPSTREAM_TIMEOUT_MS = 90_000;

// Force dynamic execution — bookings/calls change frequently
export const dynamic = "force-dynamic";

import {
    formatDMYDate,
    formatTimestamp,
    getISTDateString,
    isLockedDate,
    loadBookings,
} from "@/lib/crr-calling-server";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
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
                { status: 403, headers: NO_STORE_HEADERS }
            );
        }

        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("from");
        const toParam   = searchParams.get("to");
        const limitParam = searchParams.get("limit");

        const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

        let hasDateFilter = false;
        let fromTimestamp: string | null = null;
        let toTimestamp: string | null = null;

        // Strict range validation: if either 'from' or 'to' is supplied, both must be valid YYYY-MM-DD and from <= to
        if (fromParam !== null || toParam !== null) {
            if (!fromParam || !toParam || !ISO_DATE_RE.test(fromParam) || !ISO_DATE_RE.test(toParam)) {
                return NextResponse.json(
                    { success: false, error: "Invalid date range parameters. Both 'from' and 'to' must be valid YYYY-MM-DD dates." },
                    { status: 400, headers: NO_STORE_HEADERS }
                );
            }
            if (fromParam > toParam) {
                return NextResponse.json(
                    { success: false, error: "Invalid date range: 'from' date cannot be after 'to' date." },
                    { status: 400, headers: NO_STORE_HEADERS }
                );
            }
            hasDateFilter = true;
            fromTimestamp = `${fromParam} 00:00:00`;
            toTimestamp   = `${toParam} 23:59:59.999`;
        }

        // Hard ceiling / limit enforcement (max 2000 records)
        const HARD_CEILING = 2000;
        let effectiveLimit = HARD_CEILING;
        if (limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if (isNaN(parsedLimit) || parsedLimit <= 0) {
                return NextResponse.json(
                    { success: false, error: "Invalid limit parameter. Must be a positive integer." },
                    { status: 400, headers: NO_STORE_HEADERS }
                );
            }
            effectiveLimit = Math.min(parsedLimit, HARD_CEILING);
        }

        const { data, stageUsers } = hasDateFilter && fromTimestamp && toTimestamp
            ? await loadBookings("WHERE check_in_date BETWEEN ? AND ?", [fromTimestamp, toTimestamp], effectiveLimit)
            : await loadBookings("", [], effectiveLimit);

        return NextResponse.json(
            {
                success: true,
                count: data.length,
                data,
                stageUsers,
            },
            { headers: NO_STORE_HEADERS }
        );
    } catch (err) {
        console.error("[crr-calling/bookings] MySQL fetch failed:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Failed to fetch bookings from database" },
            { status: 500, headers: NO_STORE_HEADERS }
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
        // Stage 5 proof uploads arrive as multipart (bookingId, stage, fields JSON, file)
        let proofFile: File | null = null;
        try {
            if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
                const form = await req.formData();
                const file = form.get("file");
                proofFile = file instanceof File && file.size > 0 ? file : null;
                body = {
                    bookingId: form.get("bookingId"),
                    stage: Number(form.get("stage")),
                    fields: JSON.parse(String(form.get("fields") ?? "{}")),
                };
            } else {
                body = await req.json();
            }
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

        if (proofFile) {
            if (stage !== 5) {
                return NextResponse.json(
                    { success: false, error: "File upload is only supported for Stage 5 Proof of Ratings" },
                    { status: 400 }
                );
            }
            if (!isAllowedProofType(proofFile.type)) {
                return NextResponse.json(
                    { success: false, error: "Proof of Ratings must be an image or a PDF" },
                    { status: 400 }
                );
            }
            if (proofFile.size > MAX_PROOF_FILE_BYTES) {
                return NextResponse.json(
                    { success: false, error: `File is too large. Please upload a file below ${PROOF_FILE_LIMIT_LABEL}.` },
                    { status: 413 }
                );
            }
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

        // Stage 3 specific validation: Next visit date cannot be in the past and must be after checkout
        if (stage === 3 && fields?.nextVisitDate) {
            const rawDate = String(fields.nextVisitDate).trim();
            if (rawDate) {
                const parseDateVal = (valStr: string) => {
                    const s = valStr.trim().split(" ")[0];
                    if (s.includes("/")) {
                        const [m, d, y] = s.split("/").map(Number);
                        return new Date(y, (m || 1) - 1, d || 1);
                    }
                    if (s.includes("-")) {
                        const parts = s.split("-");
                        if (parts.length === 3) {
                            if (parts[0].length === 4 || Number(parts[0]) > 1000) {
                                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                            }
                            const mNum = Number(parts[1]);
                            if (!isNaN(mNum)) return new Date(Number(parts[2]), mNum - 1, Number(parts[0]));
                            const named = new Date(`${parts[0]} ${parts[1]} ${parts[2]}`);
                            if (!isNaN(named.getTime())) return named;
                        }
                    }
                    return new Date(s);
                };

                const nvDate = parseDateVal(rawDate);
                if (isNaN(nvDate.getTime())) {
                    return NextResponse.json(
                        { success: false, error: "Invalid next visit date format" },
                        { status: 400 }
                    );
                }

                nvDate.setHours(0, 0, 0, 0);
                // Compare calendar dates against today in IST (the server runs in UTC)
                const nvYmd = `${nvDate.getFullYear()}-${String(nvDate.getMonth() + 1).padStart(2, "0")}-${String(nvDate.getDate()).padStart(2, "0")}`;

                if (nvYmd < istToday()) {
                    return NextResponse.json(
                        { success: false, error: "Next visit date cannot be in the past" },
                        { status: 400 }
                    );
                }

                try {
                    const pool = await getPool();
                    const [checkRows] = await pool.query<any[]>(
                        `SELECT check_out_date FROM KTAHV_CRR_Process_FMS WHERE uid = ? OR booking_id = ? LIMIT 1`,
                        [bookingId, bookingId]
                    );
                    if (checkRows && checkRows.length > 0 && checkRows[0].check_out_date) {
                        const coDate = parseDateVal(String(checkRows[0].check_out_date));
                        if (!isNaN(coDate.getTime())) {
                            coDate.setHours(0, 0, 0, 0);
                            if (nvDate <= coDate) {
                                return NextResponse.json(
                                    {
                                        success: false,
                                        error: `Next visit date must be after check-out date (${formatDMYDate(checkRows[0].check_out_date)})`,
                                    },
                                    { status: 400 }
                                );
                            }
                        }
                    }
                } catch (dbErr) {
                    console.warn("[crr-calling/bookings] Check-out date lookup skipped:", dbErr);
                }
            }
        }

        // Re-check the stage rules the page enforces (issue #157): stage must be
        // pending, scheduled, and open by date in IST. Applies to admins too.
        const { data: [booking] } = await loadBookings("WHERE uid = ? OR booking_id = ?", [bookingId, bookingId], 1);
        if (!booking) {
            return NextResponse.json(
                { success: false, error: "Booking not found" },
                { status: 404 }
            );
        }
        const blockReason = stageBlockReason(stage, {
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            bookingStatus: booking.bookingStatus,
            info: booking.stages.find((s: StageInfo) => s.stage === stage),
        });
        if (blockReason) {
            return NextResponse.json(
                { success: false, error: blockReason },
                { status: 409 }
            );
        }

        console.log("[crr-calling/bookings] POST incoming request:", {
            bookingId,
            stage,
            fields,
            proofFile: proofFile ? { name: proofFile.name, type: proofFile.type, size: proofFile.size } : null,
            adminOverride: isAdminRole,
        });

        // One controller/timer spans the fetch AND the full body read, so a
        // slow upstream can't stall the response past the 20s budget after
        // headers arrive.
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        const sharedSecret = process.env.GAS_SHARED_SECRET;
        // Strip metadata and internal mapping keys (like stageKey, stage_key) so GAS saveCols validation does not reject them
        const sanitizedFields: Record<string, any> = {};
        for (const [key, value] of Object.entries(fields || {})) {
            if (key === "stageKey" || key === "stage_key" || key === "stage2_next_visit_date" || key === "stage2_remarks") {
                continue;
            }
            sanitizedFields[key] = value;
        }
        if (proofFile) {
            // GAS decodes this and saves it to Drive. Added after the request log above, so base64 is never logged.
            sanitizedFields.proofFileBase64 = Buffer.from(await proofFile.arrayBuffer()).toString("base64");
            sanitizedFields.proofMimeType = proofFile.type;
            sanitizedFields.proofFileName = proofFile.name;
        }

        let resolvedBookingId = bookingId;
        if ([2, 4, 8, 9, 10, 11].includes(stage)) {
            try {
                const pool = await getPool();
                const [procRows] = await pool.query<any[]>(
                    `SELECT booking_id FROM KTAHV_CRR_Process_FMS WHERE uid = ? LIMIT 1`,
                    [bookingId]
                );
                if (procRows && procRows.length > 0 && procRows[0].booking_id) {
                    resolvedBookingId = String(procRows[0].booking_id).trim();
                }
            } catch (resolveErr) {
                console.warn("[crr-calling/bookings] Could not resolve booking_id from uid:", resolveErr);
            }
        }

        // Stage 8 only diverges once there are referral entries to record; every other
        // stage, and a "No" answer, keeps the original endpoint and envelope.
        const isReferralSubmission = isStage8ReferralSubmission(stage, sanitizedFields);
        console.log("[crr-calling/bookings] upstream:", isReferralSubmission ? "stage8-referral" : "bookings");

        const upstreamUrl = isReferralSubmission ? GAS_STAGE8_REFERRAL_URL : GAS_BOOKINGS_URL;
        const upstreamBody = isReferralSubmission
            ? {
                bookingId: resolvedBookingId,
                // The guest doing the referring, from the booking we just loaded.
                refferdBy: {
                    name: booking.clientName || "",
                    phone: String(booking.mobile ?? ""),
                    email: booking.email || "",
                },
                fields: sanitizedFields,
                refferalTakenBy: String((user as any)?.name ?? "").trim(),
            }
            : {
                bookingId: resolvedBookingId,
                stage,
                fields: sanitizedFields,
                adminOverride: isAdminRole,
                sharedSecret,
            };

        const res = await fetch(upstreamUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(upstreamBody),
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
