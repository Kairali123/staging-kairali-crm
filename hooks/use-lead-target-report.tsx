"use client"

import { useEffect, useMemo, useState } from "react"

/* ================= TYPES ================= */

export type Company = "KTAHV" | "KAPPL" | "VILLARAAG"

interface UseLeadTargetReportParams {
    company: Company
    startDate?: string // yyyy-mm-dd
    endDate?: string   // yyyy-mm-dd
}

export interface DailyLeadTargetRow {
    date: string
    targetLead: number
    freshLead: number
    crrLead: number
    actualLead: number
    targetNotAchieved: number
}

interface Totals {
    target: number
    fresh: number
    crr: number
    actual: number
    achievementPercent: number
}

/* ================= API ================= */

const API_URL =
    "https://script.google.com/macros/s/AKfycbxG36YGk3oa_3BPoZDSQUQUPVSvLhB71VPPi-CkrZ12PWC3D6GazKTN4_HwrdRfG7QS/exec"

/* ================= MODULE CACHE ================= */
/**
 * This ensures the API is fetched ONLY ONCE
 * even if multiple components use the hook.
 */

let cachedApiData: any = null
let cachedPromise: Promise<any> | null = null

/* ================= HELPERS ================= */

function isDateInRange(
    date: string,
    startDate?: string,
    endDate?: string
) {
    const d = new Date(date)
    if (startDate && d < new Date(startDate)) return false
    if (endDate && d > new Date(endDate)) return false
    return true
}

/* ================= HOOK ================= */

export function useLeadTargetReport({
    company,
    startDate,
    endDate,
}: UseLeadTargetReportParams) {
    const [rawData, setRawData] = useState<any>(cachedApiData)
    const [loading, setLoading] = useState(!cachedApiData)
    const [error, setError] = useState<string | null>(null)

    /* ---------- FETCH API (CACHED) ---------- */
    useEffect(() => {
        let mounted = true

        async function fetchData() {
            try {
                if (!cachedPromise) {
                    const pending = fetch(API_URL).then((res) => {
                        if (!res.ok) {
                            throw new Error(
                                `Lead Target API request failed: ${res.status} ${res.statusText}`
                            )
                        }
                        return res.json()
                    })

                    // Drop the cached promise if it rejects so a later mount can retry
                    // instead of reusing a permanently failed request.
                    pending.catch(() => {
                        if (cachedPromise === pending) cachedPromise = null
                    })

                    cachedPromise = pending
                }

                const json = await cachedPromise
                cachedApiData = json

                if (mounted) {
                    setRawData(json)
                    setError(null)
                }
            } catch (err) {
                console.error("Lead Target API Error:", err)
                if (mounted) {
                    setRawData(null)
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Lead Target API request failed"
                    )
                }
            } finally {
                if (mounted) setLoading(false)
            }
        }

        if (!cachedApiData) {
            fetchData()
        }

        return () => {
            mounted = false
        }
    }, [])

    /* ---------- TRANSFORM DATA ---------- */
    const result = useMemo(() => {
        const companyData = rawData?.[company] ?? {}

        const dailyReport: DailyLeadTargetRow[] = Object.entries(companyData)
            .filter(([date]) => isDateInRange(date, startDate, endDate))
            .map(([date, values]: any) => ({
                date,
                targetLead: Number(values?.targetLeads) || 0,
                freshLead: Number(values?.freshLeads) || 0,
                crrLead: Number(values?.crrLeads) || 0,
                actualLead: Number(values?.actualLeads) || 0,
                targetNotAchieved: Number(values?.targetnotAchieved) || 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))

        const totals = dailyReport.reduce(
            (acc, row) => {
                acc.target += row.targetLead
                acc.fresh += row.freshLead
                acc.crr += row.crrLead
                acc.actual += row.actualLead
                return acc
            },
            {
                target: 0,
                fresh: 0,
                crr: 0,
                actual: 0,
                achievementPercent: 0,
            }
        )

        totals.achievementPercent =
            totals.target > 0
                ? ((totals.actual - totals.target) / totals.target) * 100
                : 0

        return { dailyReport, totals }
    }, [rawData, company, startDate, endDate])

    return {
        dailyReport: result.dailyReport,
        totals: result.totals,
        loading,
        error,
    }
}
