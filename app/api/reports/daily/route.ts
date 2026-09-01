const REPORTS_GAS_URL =
  "https://script.google.com/macros/s/AKfycbw9IFX4CuVlHbcC2PUbNpp1ZwEmJU5oVgLKwhS6LFJqd3NDm-z-Dzgl9UZUq6YDoNmb/exec"
const UPSTREAM_TIMEOUT_MS = 20_000

export async function GET() {
  // One budget covers both the upstream fetch and the JSON body read.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const response = await fetch(REPORTS_GAS_URL, {
      headers: {
        Accept: "application/json",
      },
      redirect: "follow",
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error("[reports/daily] upstream returned status", response.status)
      // Try to parse JSON anyway, as some endpoints return data with error status codes
    }

    let data
    try {
      data = await response.json()
    } catch {
      console.error("[reports/daily] upstream returned non-JSON body")
      return Response.json({ KTAHV: [], KAPPL: [] })
    }

    // Parse and organize data by company
    const ktahvData: any[] = []
    const kapplData: any[] = []

    // Parse KTAHV daily data from nested structure
    if (data?.KTAVHSheet?.["Daily Wise Report"] && Array.isArray(data.KTAVHSheet["Daily Wise Report"])) {
      data.KTAVHSheet["Daily Wise Report"].forEach((row: any[]) => {
        ktahvData.push({
          date: row[0] ? new Date(row[0]).toLocaleDateString("en-IN") : "-",
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    // Parse KAPPL daily data from nested structure
    if (data?.KAPPLSheet?.["Daily Wise Report"] && Array.isArray(data.KAPPLSheet["Daily Wise Report"])) {
      data.KAPPLSheet["Daily Wise Report"].forEach((row: any[]) => {
        kapplData.push({
          date: row[0] ? new Date(row[0]).toLocaleDateString("en-IN") : "-",
          targetLead: Number.parseInt(String(row[1] || 0)),
          freshLead: Number.parseInt(String(row[2] || 0)),
          crrLead: Number.parseInt(String(row[3] || 0)),
          actualLead: Number.parseInt(String(row[4] || 0)),
          targetNotAchieved: Number.parseFloat(String(row[5] || 0)),
        })
      })
    }

    console.log("[reports/daily] Parsed KTAHV daily data count:", ktahvData.length)
    console.log("[reports/daily] Parsed KAPPL daily data count:", kapplData.length)

    return Response.json({
      KTAHV: ktahvData,
      KAPPL: kapplData,
    })
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error("[reports/daily] upstream request timed out")
    } else {
      console.error("[reports/daily] upstream request failed")
    }

    // Return 200 with empty datasets so report pages keep rendering.
    return Response.json({ KTAHV: [], KAPPL: [] }, { status: 200 })
  } finally {
    clearTimeout(timeout)
  }
}
