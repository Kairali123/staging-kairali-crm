import { NextRequest, NextResponse } from "next/server";
import { authorizeKtahvBookingAction } from "@/lib/ktahv-booking-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAS_PAYMENT_URL =
    "https://script.google.com/macros/s/AKfycbwpbLZ2qiWthyEBKoTovx40lgclcqe8FdwoaurGdWJJ3MJ0F7KjnrJdO0wGJVkw_tOm/exec?action=paymentCollection";

const UPSTREAM_TIMEOUT_MS = 90_000;

export async function POST(req: NextRequest) {
    const sharedSecret = process.env.GAS_SHARED_SECRET;
    if (!sharedSecret) {
        return NextResponse.json({ success: false, error: "Payment service is not configured" }, { status: 503 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    if (!body || typeof body.paymentData !== "object" || body.paymentData === null || Array.isArray(body.paymentData)) {
        return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const bookingId = String(body.paymentData.bookingId || "").trim();
    if (!bookingId) {
        return NextResponse.json({ success: false, error: "bookingId is required" }, { status: 400 });
    }

    const access = await authorizeKtahvBookingAction(
        req,
        bookingId,
        "collectionSelf",
        "collectionAll"
    );
    if (!access.ok) return access.response;

    // One controller/timer spans the fetch AND the full body read, so a slow
    // upstream can't stall the response past the 20s budget after headers arrive.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const upstream = await fetch(GAS_PAYMENT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                paymentData: {
                    ...body.paymentData,
                    paymentCollectedBy: access.actorName,
                },
                sharedSecret,
            }),
            signal: controller.signal,
        });

        const responseText = await upstream.text();

        // Relay upstream status/body/content-type unchanged so the caller's
        // existing response validation still detects upstream failures.
        return new NextResponse(responseText, {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
        });
    } catch (err: any) {
        if (err?.name === "AbortError") {
            return NextResponse.json({ success: false, error: "Payment service timed out" }, { status: 504 });
        }
        return NextResponse.json({ success: false, error: "Payment service is unreachable" }, { status: 502 });
    } finally {
        clearTimeout(timer);
    }
}
