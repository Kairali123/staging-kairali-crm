import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getPool, executeWithRetry, ensureDbAccessTables } from "@/lib/db";
import { sendOtpEmail } from "@/lib/sendOtpEmail";
import { sendPushNotification } from "@/lib/pushover";
import { verifySessionCookieValue } from "@/lib/session";

const OTP_EXPIRY_MINUTES = 5;
const VALID_ACTIONS = [
    "Create Table",
    "Delete Data",
    "Insert Data",
    "Update Data",
    "Alter Table",
    "Create",
    "Delete",
    "Insert",
    "Alter",
    "Update",
    "Drop",
];

function normalizeActionType(action: string): string {
    const map: Record<string, string> = {
        "Create Table": "Create Table",
        "Delete Data": "Delete Data",
        "Insert Data": "Insert Data",
        "Update Data": "Update Data",
        "Alter Table": "Alter Table",
        Create: "Create Table",
        Delete: "Delete Data",
        Insert: "Insert Data",
        Alter: "Alter Table",
        Update: "Update Data",
        Drop: "Delete Data",
    };
    return map[action] || action;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, action, reason } = body;

        // --- basic validation ---
        if (!name?.trim() || !action || !reason?.trim()) {
            return NextResponse.json(
                { error: "Name, action and reason are all required." },
                { status: 400 }
            );
        }
        if (!VALID_ACTIONS.includes(action)) {
            return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
        }

        const normalizedAction = normalizeActionType(action);

        // --- real session/auth lookup ---
        const currentUser = await getCurrentUser(req);
        if (!currentUser) {
            return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
        }

        await ensureDbAccessTables();
        const pool = await getPool();

        // --- Rate limiting: max 3 requests / user / 10 minutes ---
        const [recentRequests]: any = await executeWithRetry(() =>
            pool.execute(
                `SELECT COUNT(*) as count FROM db_access_otp_requests
                 WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
                [currentUser.id]
            )
        );
        if (process.env.NODE_ENV !== 'development' && recentRequests && recentRequests[0] && recentRequests[0].count >= 3) {
            return NextResponse.json(
                { error: "Too many OTP requests. Please wait before requesting another code." },
                { status: 429 }
            );
        }

        // --- generate + hash OTP ---
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const [result]: any = await executeWithRetry(() =>
            pool.execute(
                `INSERT INTO db_access_otp_requests
           (requested_by, user_id, action_type, reason, otp_hash, status, expires_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
                [name, currentUser.id, normalizedAction, reason, otpHash, expiresAt]
            )
        );

        const requestId = result.insertId;

        // --- email the OTP to the admin ---
        await sendOtpEmail({
            name,
            action: normalizedAction,
            reason,
            otp,
            expiresInMinutes: OTP_EXPIRY_MINUTES,
        });

        // --- push notification to the admin ---
        try {
            await sendPushNotification(
                `DB Access Requested!\nUser: ${name}\nAction: ${action}\nReason: ${reason}\nOTP: ${otp}`,
                process.env.PUSHOVER_ADMIN_USER_KEY,
                process.env.PUSHOVER_DEVICE
            );
        } catch (pushErr) {
            console.error("[Pushover Error] Failed to send OTP push alert:", pushErr);
        }

        return NextResponse.json({
            requestId,
            expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
        });
    } catch (err) {
        console.error("generate-otp error:", err);
        return NextResponse.json(
            { error: "Could not generate OTP. Try again." },
            { status: 500 }
        );
    }
}

/**
 * Reads user from signed session cookie kairali_user
 */
async function getCurrentUser(req: NextRequest): Promise<{ id: number; name: string; email: string } | null> {
    const userCookie = req.cookies.get("kairali_user")?.value;
    if (!userCookie) return null;
    const user = verifySessionCookieValue(userCookie);
    if (!user) return null;

    const empIdStr = user.empId || "";
    const numericId = parseInt(empIdStr.replace(/\D/g, ""), 10) || 1;

    return {
        id: numericId,
        name: user.name || "Unknown",
        email: user.email || "",
    };
}
