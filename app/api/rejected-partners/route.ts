import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPartnerAccess } from "@/lib/authz"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"

const DEFAULT_GAS_READ_URL =
    "https://script.google.com/macros/s/AKfycbwiJWIPRo4CgZIJNtTGbNk-MMfCojgJIO3R4iuzbIekTQ5QFgsTscwIlsrWzJKflUuV/exec"
const LOCAL_REJECTED_FILE = path.join(process.cwd(), "data", "rejected-partners.json")
const UPSTREAM_TIMEOUT_MS = 20_000

const GAS_READ_URL =
    process.env.GAS_URL?.trim() ||
    process.env.NEXT_PUBLIC_GAS_URL?.trim() ||
    DEFAULT_GAS_READ_URL

const GAS_WRITE_URL =
    process.env.GAS_REJECT_URL?.trim() ||
    process.env.GAS_WRITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_GAS_REJECT_URL?.trim() ||
    process.env.NEXT_PUBLIC_GAS_WRITE_URL?.trim() ||
    DEFAULT_GAS_READ_URL

function requirePartnerAccess(request: NextRequest) {
    const user = getSessionUser(request)
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

type RejectedPartner = {
    _rowIndex?: number
    Timestamp?: string
    Lead_ID: string
    Business_Name?: string
    Contact_Person?: string
    Email?: string
    Phone?: string
    Country?: string
    Category?: string
    Client_Stage?: string
    Priority?: string
    Assigned_To?: string
    Potential_Business_Rs?: string
    Rejection_Category: string
    Rejection_Remarks?: string
    Rejected_By_Name?: string
    Rejected_At?: string
}

async function parseGASResponse(res: Response) {
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
        return res.json()
    }

    const text = await res.text()
    const lower = text.toLowerCase()
    const isHtml = lower.includes("<html") || lower.includes("<!doctype html")

    if (isHtml) {
        if (lower.includes("do not have permission to access the requested document")) {
            return {
                status: "error",
                message: "Error: You do not have permission to access the requested document.",
            }
        }
        return {
            status: "error",
            message: "Apps Script returned non-JSON HTML response.",
        }
    }

    try {
        return JSON.parse(text)
    } catch {
        // Never echo the raw upstream body back to the caller; status code only.
        return {
            status: "error",
            message: res.ok
                ? "Apps Script returned an unreadable response."
                : `GAS responded with ${res.status}`,
        }
    }
}

// Describes an upstream failure without leaking the URL, payload, response body,
// or the exception object itself. Error name only.
function describeUpstreamError(error: unknown) {
    const name = error instanceof Error ? error.name : "UnknownError"
    return name === "AbortError"
        ? "upstream request timed out"
        : `upstream request failed (${name})`
}

// One 20s budget per upstream attempt, covering both the fetch and the
// response body read (the abort signal also tears down an in-flight body).
async function fetchGASWithDeadline(url: string, init: RequestInit) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
    try {
        const res = await fetch(url, { ...init, signal: controller.signal })
        if (!res.ok) {
            return { ok: false as const, status: res.status }
        }
        return { ok: true as const, status: res.status, json: await parseGASResponse(res) }
    } finally {
        clearTimeout(timeout)
    }
}

function normalizeRejected(item: Partial<RejectedPartner>): RejectedPartner {
    const now = new Date().toISOString()
    return {
        Lead_ID: String(item.Lead_ID || "").trim(),
        Rejection_Category: String(item.Rejection_Category || "").trim(),
        Rejection_Remarks: String(item.Rejection_Remarks || ""),
        Business_Name: String(item.Business_Name || ""),
        Contact_Person: String(item.Contact_Person || ""),
        Email: String(item.Email || ""),
        Phone: String(item.Phone || ""),
        Country: String(item.Country || ""),
        Category: String(item.Category || ""),
        Client_Stage: String(item.Client_Stage || ""),
        Priority: String(item.Priority || ""),
        Assigned_To: String(item.Assigned_To || ""),
        Potential_Business_Rs: String(item.Potential_Business_Rs || ""),
        Rejected_By_Name: String(item.Rejected_By_Name || "Unknown"),
        Timestamp: item.Timestamp || now,
    }
}

function sortRejected(items: RejectedPartner[]) {
    return [...items].sort((a, b) => {
        const aTime = new Date(a.Rejected_At || a.Timestamp || 0).getTime() || 0
        const bTime = new Date(b.Rejected_At || b.Timestamp || 0).getTime() || 0
        return bTime - aTime
    })
}

function dedupeRejected(items: RejectedPartner[]) {
    const seen = new Set<string>()
    const out: RejectedPartner[] = []
    for (const item of items) {
        const key = `${item.Lead_ID}::${item.Timestamp || ""}::${item.Rejection_Category}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(item)
    }
    return out.map((item, index) => ({ ...item, _rowIndex: index + 2 }))
}

async function readLocalRejected(): Promise<RejectedPartner[]> {
    try {
        const raw = await fs.readFile(LOCAL_REJECTED_FILE, "utf8")
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return dedupeRejected(sortRejected(parsed.map((p) => normalizeRejected(p))))
    } catch {
        return []
    }
}

async function writeLocalRejected(items: RejectedPartner[]) {
    await fs.mkdir(path.dirname(LOCAL_REJECTED_FILE), { recursive: true })
    await fs.writeFile(LOCAL_REJECTED_FILE, JSON.stringify(items, null, 2), "utf8")
}

// GET - fetch all rejected partners
export async function GET(request: NextRequest) {
    const access = requirePartnerAccess(request)
    if (access.error) return access.error

    try {
        const localData = await readLocalRejected()
        const result = await fetchGASWithDeadline(`${GAS_READ_URL}?action=rejected`, { cache: "no-store" })

        if (!result.ok) {
            console.error("[rejected-partners GET] upstream returned status", result.status)
            return NextResponse.json({ status: "success", data: localData, source: "local_only" })
        }

        const json = result.json
        if (String(json?.status || "").toLowerCase() !== "success") {
            return NextResponse.json({ status: "success", data: localData, source: "local_only" })
        }

        const gasData = Array.isArray(json?.data) ? json.data.map((p: Partial<RejectedPartner>) => normalizeRejected(p)) : []
        const merged = dedupeRejected(sortRejected([...gasData, ...localData]))
        return NextResponse.json({ ...json, data: merged, source: "gas_plus_local" })

    } catch (error) {
        console.error("[rejected-partners GET]", describeUpstreamError(error))
        const localData = await readLocalRejected()
        return NextResponse.json({ status: "success", data: localData, source: "local_only" })
    }
}

// POST - reject a partner
export async function POST(request: NextRequest) {
    const access = requirePartnerAccess(request)
    if (access.error) return access.error

    let normalized: RejectedPartner | null = null
    try {
        const body = await request.json()

        if (!body.Lead_ID || !body.Rejection_Category) {
            return NextResponse.json(
                { status: "error", message: "Lead_ID and Rejection_Category are required" },
                { status: 400 }
            )
        }

        const rejectedBy = String(access.user?.name || access.user?.email || "Unknown").trim() || "Unknown"
        normalized = normalizeRejected({ ...body, Rejected_By_Name: rejectedBy })
        const payload = JSON.stringify({ action: "reject", ...normalized })
        const tried = new Set<string>()
        const candidates = [GAS_WRITE_URL, GAS_READ_URL].filter((u): u is string => Boolean(u && !tried.has(u) && tried.add(u)))

        let lastErrorMessage = "Failed to reject partner"

        for (const url of candidates) {
            let result: Awaited<ReturnType<typeof fetchGASWithDeadline>>
            try {
                result = await fetchGASWithDeadline(url, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: payload,
                    cache: "no-store",
                })
            } catch (error) {
                lastErrorMessage = describeUpstreamError(error)
                console.error("[rejected-partners POST]", lastErrorMessage)
                continue
            }

            if (!result.ok) {
                console.error("[rejected-partners POST] upstream returned status", result.status)
                lastErrorMessage = `GAS responded with ${result.status}`
                continue
            }

            const json = result.json
            const status = String(json?.status || "").toLowerCase()
            const message = String(json?.message || "")

            if (status === "success") {
                const localData = await readLocalRejected()
                const merged = dedupeRejected(sortRejected([normalized, ...localData]))
                await writeLocalRejected(merged)
                return NextResponse.json({ ...json, savedTo: "gas_and_local" })
            }

            lastErrorMessage = message || "Failed to reject partner"

            // Retry with alternate script URL when current deployment lacks sheet access.
            if (message.toLowerCase().includes("do not have permission to access the requested document")) {
                continue
            }

            continue
        }

        const localData = await readLocalRejected()
        const merged = dedupeRejected(sortRejected([normalized, ...localData]))
        await writeLocalRejected(merged)

        return NextResponse.json({
            status: "success",
            message: "Rejected partner saved locally. Google Sheet sync failed due permission.",
            savedTo: "local_only",
            gasError: lastErrorMessage,
        })

    } catch (error) {
        console.error("[rejected-partners POST]", describeUpstreamError(error))
        if (normalized) {
            const localData = await readLocalRejected()
            const merged = dedupeRejected(sortRejected([normalized, ...localData]))
            await writeLocalRejected(merged)
            return NextResponse.json({
                status: "success",
                message: "Rejected partner saved locally. Google Sheet sync failed.",
                savedTo: "local_only",
            })
        }
        return NextResponse.json({ status: "error", message: "Failed to reject partner" }, { status: 500 })
    }
}
