import { NextRequest, NextResponse } from "next/server"

const GAS_URL =
    "https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec"
const UPSTREAM_TIMEOUT_MS = 20_000

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
        return NextResponse.json({ status: "error", message: "leadId required" }, { status: 400 })
    }

    // One budget covers both the upstream fetch and the body read.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
        const gasRes = await fetch(`${GAS_URL}?action=getAll&part=2`, {
            cache: "no-store",
            redirect: "follow",
            signal: controller.signal,
        })

        if (!gasRes.ok) {
            console.error("[get-part2] upstream returned status", gasRes.status)
            return NextResponse.json({ status: "error", message: "Upstream error" }, { status: 502 })
        }

        const text = await gasRes.text()

        let j: any
        try {
            j = JSON.parse(text)
        } catch {
            console.error("[get-part2] upstream returned non-JSON body")
            return NextResponse.json({ status: "error", message: "Upstream error" }, { status: 502 })
        }

        if (j.status !== "success" || !Array.isArray(j.data)) {
            console.error("[get-part2] unexpected upstream payload shape")
            return NextResponse.json({ status: "error", message: "Upstream error" }, { status: 502 })
        }

        const entry = j.data.find((e: any) => e["Linked CRM ID"] === leadId) ?? null

        return NextResponse.json({ status: "success", entry })
    } catch (err: any) {
        if (err?.name === "AbortError") {
            console.error("[get-part2] upstream request timed out")
            return NextResponse.json({ status: "error", message: "Upstream timed out" }, { status: 504 })
        }

        console.error("[get-part2] upstream request failed")
        return NextResponse.json({ status: "error", message: "Server error" }, { status: 500 })
    } finally {
        clearTimeout(timeout)
    }
}
