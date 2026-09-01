import { NextResponse } from "next/server";

const SALES_CALLING_GAS_URL =
  "https://script.google.com/macros/s/AKfycbz1wmE_4sczF7XrozAB-EYaZwmtC367uBPchMYcH_yi3UQJC5J3ANIkgTQTOQ7JzOD5nA/exec";
const UPSTREAM_TIMEOUT_MS = 20_000;

class UpstreamTimeoutError extends Error {
  constructor() {
    super("Sales calling source timed out");
    this.name = "UpstreamTimeoutError";
  }
}

async function fetchSalesCallingData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(SALES_CALLING_GAS_URL, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      next: { revalidate: 0 }, // Bypass Next.js fetch cache
    });

    if (!response.ok) {
      console.error("[sales-calling] GAS returned status", response.status);
      throw new Error("Sales calling source returned an error");
    }

    return await response.json();
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new UpstreamTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const data = await fetchSalesCallingData();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) {
      console.error("[sales-calling] GAS request timed out");
      return NextResponse.json(
        { error: "Sales calling source timed out" },
        { status: 504 }
      );
    }

    console.error("[sales-calling] proxy failed");
    return NextResponse.json(
      { error: "Failed to fetch sales calling data" },
      { status: 502 }
    );
  }
}
