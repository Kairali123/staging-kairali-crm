import { NextResponse } from "next/server"

const UPSTREAM_TIMEOUT_MS = 20_000

export async function GET() {
    const gasUrl = process.env.GAS_URL?.trim()

    if (!gasUrl) {
        console.error("[b2b-leads] GAS_URL is not configured")
        return NextResponse.json(
            { status: "error", message: "Server is not configured" },
            { status: 503 }
        )
    }

    // One budget covers both the upstream fetch and the JSON body read.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
        const res = await fetch(`${gasUrl}?action=b2b`, {
            cache: "no-store",
            signal: controller.signal,
        })

        if (!res.ok) {
            console.error("[b2b-leads] upstream returned status", res.status)
            return NextResponse.json(
                { status: "error", message: `GAS responded with ${res.status}` },
                { status: 502 }
            )
        }

        const json = await res.json()
        return NextResponse.json(json)

    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("[b2b-leads] upstream request timed out")
        } else {
            console.error("[b2b-leads] upstream request failed")
        }

        return NextResponse.json(
            { status: "error", message: "Failed to fetch B2B leads" },
            { status: 500 }
        )
    } finally {
        clearTimeout(timeout)
    }
}
