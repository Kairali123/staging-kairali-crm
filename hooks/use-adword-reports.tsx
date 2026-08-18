"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

/* ─────────────────────────────────────────────────────────────
   TYPES (UNCHANGED)
───────────────────────────────────────────────────────────── */

export type Company = "KTAHV" | "KAPPL" | "VILLARAAG"

function isCompany(value: unknown): value is Company {
    return value === "KTAHV" || value === "KAPPL" || value === "VILLARAAG"
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

export type SortKey =
    | "date" | "budget" | "impressions" | "clicks" | "ctr"
    | "avgCpc" | "cost" | "conversions" | "conversionValue"
    | "costPerConversion" | "searchImpressionShare"

export type SortDir = "asc" | "desc"

export interface CampaignRow {
    date: string
    customerId: string
    accountName: string
    campaignId: string
    campaignName: string
    status: string
    channelType: string
    biddingStrategy: string
    startDate: string
    endDate: string
    budget: number
    impressions: number
    clicks: number
    ctr: number
    avgCpc: number
    cost: number
    conversions: number
    conversionValue: number
    costPerConversion: number
    searchImpressionShare: number
}

export interface DateGroupTotals {
    budget: number
    impressions: number
    clicks: number
    ctr: number
    avgCpc: number
    cost: number
    conversions: number
    conversionValue: number
    costPerConversion: number
    searchImpressionShare: number
}

export interface DateGroup {
    date: string
    displayDate: string
    campaignCount: number
    campaigns: CampaignRow[]
    totals: DateGroupTotals
}

export interface GrandTotals {
    impressions: number
    clicks: number
    cost: number
    conversions: number
    convValue: number
    budget: number
    avgCtr: number
    avgCpc: number
}

/* ─────────────────────────────────────────────────────────────
   HELPERS (UNCHANGED)
───────────────────────────────────────────────────────────── */

function toISODate(raw: any): string {
    if (!raw) return ""
    const d = new Date(raw)
    if (isNaN(d.getTime())) return String(raw)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
}

function toDisplayDate(isoDate: string): string {
    if (!isoDate) return "—"
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return isoDate
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
}

function parseRows(rawData: any[]): CampaignRow[] {
    return rawData.map((r) => ({
        date: toISODate(r.date),
        customerId: String(r.customerId ?? ""),
        accountName: String(r.accountName ?? ""),
        campaignId: String(r.campaignId ?? ""),
        campaignName: String(r.campaignName ?? ""),
        status: String(r.status ?? ""),
        channelType: String(r.channelType ?? ""),
        biddingStrategy: String(r.biddingStrategy ?? ""),
        startDate: toISODate(r.startDate),
        endDate: toISODate(r.endDate),
        budget: Number(r.budget) || 0,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        ctr: Number(r.ctr) || 0,
        avgCpc: Number(r.avgCpc) || 0,
        cost: Number(r.cost) || 0,
        conversions: Number(r.conversions) || 0,
        conversionValue: Number(r.conversionValue) || 0,
        costPerConversion: Number(r.costPerConversion) || 0,
        searchImpressionShare: Number(r.searchImpressionShare) || 0,
    }))
}

/* ─────────────────────────────────────────────────────────────
   GROUPING (NO CALCULATIONS)
───────────────────────────────────────────────────────────── */

function groupByDate(rows: CampaignRow[]): DateGroup[] {
    const map = new Map<string, CampaignRow[]>()

    for (const row of rows) {
        const key = row.date || "Unknown"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(row)
    }

    const groups: DateGroup[] = []

    for (const [date, campaigns] of map.entries()) {

        let totals: DateGroupTotals = {
            budget: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            avgCpc: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            costPerConversion: 0,
            searchImpressionShare: 0,
        }

        for (const r of campaigns) {
            totals.budget += r.budget
            totals.impressions += r.impressions
            totals.clicks += r.clicks
            totals.cost += r.cost
            totals.conversions += r.conversions
            totals.conversionValue += r.conversionValue

            // Just sum values from sheet (NO FORMULAS)
            totals.ctr += r.ctr
            totals.avgCpc += r.avgCpc
            totals.costPerConversion += r.costPerConversion
            totals.searchImpressionShare += r.searchImpressionShare
        }

        groups.push({
            date,
            displayDate: toDisplayDate(date),
            campaignCount: campaigns.length,
            campaigns,
            totals,
        })
    }

    return groups
}

/* ─────────────────────────────────────────────────────────────
   MAIN HOOK
───────────────────────────────────────────────────────────── */

export function useAdwordReports() {

    const [selectedCompany, setSelectedCompany] = useState<Company>("KTAHV")

    const [allData, setAllData] = useState<Record<Company, CampaignRow[]>>({
        KTAHV: [],
        KAPPL: [],
        VILLARAAG: [],
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastFetched, setLastFetched] = useState<Date | null>(null)
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
    const [sortKey, setSortKey] = useState<SortKey>("date")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")

    const fetchAllData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/adword-reports", { cache: "no-store" })
            const json: unknown = await res.json()

            if (isRecord(json) && json.success === true && Array.isArray(json.data)) {
                const newData: Record<Company, CampaignRow[]> = {
                    KTAHV: [],
                    KAPPL: [],
                    VILLARAAG: [],
                }

                for (const item of json.data) {
                    if (!isRecord(item)) continue
                    if (isCompany(item.company) && Array.isArray(item.data)) {
                        newData[item.company] = parseRows(item.data)
                    }
                }

                setAllData(newData)
                setLastFetched(new Date())
            } else {
                setError("Invalid response from server")
            }
        } catch {
            setError("Network error — could not reach server")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    const rawRows = allData[selectedCompany]

    const filteredRows = useMemo(() => {
        if (!fromDate && !toDate) return rawRows

        const from = fromDate ? new Date(fromDate).getTime() : null
        const to = toDate ? new Date(toDate).getTime() : null

        return rawRows.filter((r) => {
            const d = new Date(r.date).getTime()
            if (from && d < from) return false
            if (to && d > to) return false
            return true
        })
    }, [rawRows, fromDate, toDate])

    const dateGroups = useMemo(() => groupByDate(filteredRows), [filteredRows])

    const sortedGroups = useMemo(() => {
        return [...dateGroups].sort((a, b) => {
            let va: number, vb: number

            if (sortKey === "date") {
                va = new Date(a.date).getTime()
                vb = new Date(b.date).getTime()
            } else {
                va = a.totals[sortKey] as number
                vb = b.totals[sortKey] as number
            }

            return sortDir === "asc" ? va - vb : vb - va
        })
    }, [dateGroups, sortKey, sortDir])

    const grandTotals = useMemo((): GrandTotals => {
        return {
            impressions: dateGroups.reduce((s, d) => s + d.totals.impressions, 0),
            clicks: dateGroups.reduce((s, d) => s + d.totals.clicks, 0),
            cost: dateGroups.reduce((s, d) => s + d.totals.cost, 0),
            conversions: dateGroups.reduce((s, d) => s + d.totals.conversions, 0),
            convValue: dateGroups.reduce((s, d) => s + d.totals.conversionValue, 0),
            budget: dateGroups.reduce((s, d) => s + d.totals.budget, 0),
            avgCtr: dateGroups.reduce((s, d) => s + d.totals.ctr, 0),
            avgCpc: dateGroups.reduce((s, d) => s + d.totals.avgCpc, 0),
        }
    }, [dateGroups])

    const uniqueCampaignCount = useMemo(
        () => new Set(rawRows.map((r) => r.campaignId).filter(Boolean)).size,
        [rawRows]
    )

    const handleCompanyChange = useCallback((company: Company) => {
        setSelectedCompany(company)
        setExpandedDates(new Set())
        setFromDate("")
        setToDate("")
        setSortKey("date")
        setSortDir("desc")
    }, [])

    const toggleDate = useCallback((date: string) => {
        setExpandedDates((prev) => {
            const next = new Set(prev)
            next.has(date) ? next.delete(date) : next.add(date)
            return next
        })
    }, [])

    const handleSort = useCallback((key: SortKey) => {
        setSortKey((prev) => {
            if (prev === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                return prev
            }
            setSortDir("desc")
            return key
        })
    }, [])

    const clearDateFilter = useCallback(() => {
        setFromDate("")
        setToDate("")
    }, [])

    const refresh = useCallback(() => {
        fetchAllData()
    }, [fetchAllData])

    return {
        rawRows,
        sortedGroups,
        grandTotals,
        uniqueCampaignCount,
        selectedCompany,
        loading,
        error,
        lastFetched,
        expandedDates,
        sortKey,
        sortDir,
        fromDate,
        toDate,
        setFromDate,
        setToDate,
        handleCompanyChange,
        toggleDate,
        handleSort,
        clearDateFilter,
        refresh,
    }
}
