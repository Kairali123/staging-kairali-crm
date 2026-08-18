import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPartnerAccess } from "@/lib/authz"

const GAS_URL =
    "https://script.google.com/macros/s/AKfycbxRd-RX7iZUcJ2yCXDAIS81d1SJXV08JkgalI8PYhv56ZuU3NevcxsoKQaPOcth5a5r/exec"
const UPSTREAM_TIMEOUT_MS = 20_000

function requirePartnerAccess(req: NextRequest) {
    const user = getSessionUser(req)
    if (!user) {
        return {
            error: NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 }),
            user: null,
        }
    }
    if (!hasPartnerAccess(user)) {
        return {
            error: NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 }),
            user: null,
        }
    }
    return { error: null, user }
}

export async function POST(req: NextRequest) {
    const access = requirePartnerAccess(req)
    if (access.error) return access.error

    let timeout: ReturnType<typeof setTimeout> | undefined

    try {
        const body = await req.json()
        const actor = String(access.user?.name || access.user?.email || "").trim()
        const safeBody = {
            ...body,
            capturedBy: actor || "Unknown",
            "Captured By": actor || "Unknown",
        }

        // One budget covers both the upstream fetch and the body read.
        const controller = new AbortController()
        timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

        const gasRes = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(safeBody),
            redirect: "follow",
            signal: controller.signal,
        })

        if (!gasRes.ok) {
            // Log the status only; the response handling below is unchanged.
            console.error("[capture-partner] upstream returned status", gasRes.status)
        }

        let gasJson: any = {}
        try {
            const text = await gasRes.text()
            gasJson = JSON.parse(text)
        } catch (readErr: any) {
            // A timed-out body read must surface as a timeout, not as the
            // non-JSON success fallback.
            if (readErr?.name === "AbortError") throw readErr
            gasJson = { status: "success", action: "created" }
        }

        return NextResponse.json(gasJson)
    } catch (err: any) {
        if (err?.name === "AbortError") {
            console.error("[capture-partner] upstream request timed out")
            return NextResponse.json(
                { status: "error", message: "Upstream timed out" },
                { status: 504 }
            )
        }

        console.error("[capture-partner] upstream request failed")
        return NextResponse.json(
            { status: "error", message: "Server error" },
            { status: 500 }
        )
    } finally {
        if (timeout) clearTimeout(timeout)
    }
}
