/**
 * POST /api/db-access/verify-otp
 * ------------------------------------------------------------
 * Called when the user clicks "Verify & Continue" in DbAccessOtpModal.
 *
 * Steps:
 *   1. Look up the pending request by requestId.
 *   2. Reject if not found, already used, or expired.
 *   3. Compare submitted OTP against the stored hash.
 *   4. On match -> mark verified, return { verified: true }.
 *   5. On mismatch -> increment attempts, return { verified: false }.
 *
 * TODO for senior dev review:
 *   - Decide + implement lockout policy after N failed attempts
 *     (currently just counts attempts, does not block).
 *   - Decide how long a "verified" status stays valid before the
 *     actual CUD action must also re-check it server-side
 *     (recommend: verified requests are single-use, consumed by
 *     the CUD endpoint itself - see note at bottom of file).
 * ------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool, executeWithRetry, ensureDbAccessTables } from "@/lib/db";

const MAX_ATTEMPTS = 5; // adjust once lockout policy is confirmed

export async function POST(req: NextRequest) {
    try {
        const { requestId, otp } = await req.json();

        if (!requestId || !otp) {
            return NextResponse.json(
                { verified: false, reason: "missing_fields" },
                { status: 400 }
            );
        }

        await ensureDbAccessTables();
        const pool = await getPool();

        const [rows]: any = await executeWithRetry(() =>
            pool.execute(`SELECT * FROM db_access_otp_requests WHERE id = ? LIMIT 1`, [
                requestId,
            ])
        );
        const request = rows[0];

        if (!request) {
            return NextResponse.json({ verified: false, reason: "not_found" }, { status: 404 });
        }

        if (request.status !== "pending") {
            return NextResponse.json({ verified: false, reason: "already_used" });
        }

        if (new Date() > new Date(request.expires_at)) {
            await executeWithRetry(() =>
                pool.execute(`UPDATE db_access_otp_requests SET status = 'expired' WHERE id = ?`, [
                    requestId,
                ])
            );
            return NextResponse.json({ verified: false, reason: "expired" });
        }

        if (request.attempts >= MAX_ATTEMPTS) {
            await executeWithRetry(() =>
                pool.execute(`UPDATE db_access_otp_requests SET status = 'failed' WHERE id = ?`, [
                    requestId,
                ])
            );
            return NextResponse.json({ verified: false, reason: "too_many_attempts" });
        }

        const match = await bcrypt.compare(otp, request.otp_hash);

        if (!match) {
            await executeWithRetry(() =>
                pool.execute(
                    `UPDATE db_access_otp_requests SET attempts = attempts + 1 WHERE id = ?`,
                    [requestId]
                )
            );
            return NextResponse.json({ verified: false, reason: "incorrect" });
        }

        await executeWithRetry(() =>
            pool.execute(
                `UPDATE db_access_otp_requests
           SET status = 'verified', verified_at = NOW()
         WHERE id = ?`,
                [requestId]
            )
        );

        return NextResponse.json({ verified: true });
    } catch (err) {
        console.error("verify-otp error:", err);
        return NextResponse.json(
            { verified: false, reason: "server_error" },
            { status: 500 }
        );
    }
}

/**
 * IMPORTANT NOTE for the actual CUD endpoints (e.g. update-booking,
 * delete-lead, etc):
 *
 * Do not trust the frontend's "verified" state alone. Before running
 * any Create/Update/Alter/Delete query, the CUD endpoint itself should
 * re-check this table:
 *
 *   SELECT * FROM db_access_otp_requests
 *   WHERE user_id = ? AND status = 'verified'
 *     AND verified_at > (NOW() - INTERVAL 2 MINUTE)
 *   ORDER BY verified_at DESC LIMIT 1
 *
 * If found, proceed and then mark that row 'expired' (or 'used')
 * so a single verification can't be replayed for multiple actions.
 * If not found, reject the CUD request even if the UI somehow let
 * the user click through.
 */
