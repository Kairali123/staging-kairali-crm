import { NextResponse } from "next/server"

// ⚠️ Better: move this to env variable in production
const ADWORD_GAS_URL =
    "https://script.google.com/macros/s/AKfycbzXE_P1niSAI9M9UpAqbiRR7uXTiGjMqJjokH8CKBc-QddbUm9JV5XvmRbP0qgq3thUWA/exec"

const COMPANIES = ["KTAHV", "KAPPL", "VILLARAAG"]
const UPSTREAM_TIMEOUT_MS = 20_000

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const requestedCompany = searchParams.get("company")

    // If company param provided and valid → fetch only that
    // Else → fetch all companies
    const companiesToFetch =
        requestedCompany && COMPANIES.includes(requestedCompany)
            ? [requestedCompany]
            : COMPANIES

    // One budget covers the upstream fetches and the body reads for every company.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
        const results = await Promise.all(
            companiesToFetch.map(async (company) => {
                const res = await fetch(
                    `${ADWORD_GAS_URL}?company=${company}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                )

                if (!res.ok) {
                    console.error(
                        "[adword-reports] upstream returned status",
                        res.status,
                        "for company",
                        company
                    )
                    throw new Error("Upstream error")
                }

                const json = await res.json()

                return {
                    company,
                    data: json?.data ?? [],
                }
            })
        )

        return NextResponse.json({
            success: true,
            data: results,
        })
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("[adword-reports] upstream request timed out")
        } else {
            console.error("[adword-reports] upstream request failed")
        }

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch adword data",
            },
            { status: 500 }
        )
    } finally {
        clearTimeout(timeout)
    }
}
