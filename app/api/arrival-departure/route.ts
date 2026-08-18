import { NextRequest, NextResponse } from "next/server";
import { authorizeKtahvBookingAction } from "@/lib/ktahv-booking-auth";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycby3a04v18kDlIb0EvTN9mT6QzYVetoej4fi7W5rzq_Fh5HgE0M2k2BldBiAJmxebHUQnQ/exec";

type ArrivalDepartureAction = "arrival" | "departure";

function parseBackendPayload(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isBackendFailure(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  return (
    payload.success === false ||
    payload.status === "ERROR" ||
    payload.status === "FAIL" ||
    payload.status === "error" ||
    payload.status === "fail"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || "").toLowerCase() as ArrivalDepartureAction | "";

    if (action !== "arrival" && action !== "departure") {
      return NextResponse.json(
        { success: false, message: "Invalid action for arrival/departure submission" },
        { status: 400 }
      );
    }

    const bookingId = String(body?.bookingid || "").trim();
    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingid is required" },
        { status: 400 }
      );
    }

    const requiredAction = action === "arrival" ? "arrivalFlightSelf" : "departureFlightSelf";
    const requiredAllAction = action === "arrival" ? "arrivalFlightAll" : "departureFlightAll";
    const access = await authorizeKtahvBookingAction(req, bookingId, requiredAction, requiredAllAction);
    if (!access.ok) {
      return access.response;
    }

    const safeBody = {
      ...body,
      uploadedby: access.actorName,
    };

    const gasResponse = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(safeBody),
      cache: "no-store",
    });

    const responseText = await gasResponse.text();
    const parsed = parseBackendPayload(responseText);

    if (!gasResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            parsed?.message ||
            responseText ||
            `Backend returned HTTP ${gasResponse.status}`,
        },
        { status: gasResponse.status }
      );
    }

    if (isBackendFailure(parsed)) {
      return NextResponse.json(
        {
          success: false,
          message: parsed?.message || "Backend rejected the submission",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: parsed?.message || "Submission saved successfully",
      data: parsed ?? responseText,
    });
  } catch (error: any) {
    console.error("[POST /api/arrival-departure]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Submission failed" },
      { status: 500 }
    );
  }
}
