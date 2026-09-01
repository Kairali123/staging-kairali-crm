"use client"

import { useEffect, useState } from "react"

/* ===================== UI READY TYPES ===================== */

export interface UISourceData {
    name: string
    property: string   // 👈 REQUIRED
    spent: number
    conversions: number
    conversionsActual: number
    leadsReceived: number
    sale: number
    roasPerChannel: number
    totalAdsSpent: number
    totalRoas: number
    provisionalSales: string
}


export interface UIDateGroup {
    date: string
    sources: UISourceData[]
}

/* ===================== API RESPONSE TYPE ===================== */

type ApiResponse = {
    [date: string]: {
        [source: string]: {
            spent: number | null
            conversions: number | null
            conversionsActual: number | null
            sale: number | null
            totalAdsSpent: number | null
            provisionalSales: number | null
        }
    }
}

/* ===================== HOOK ===================== */

export function useLeadQualityData(filters: {
    year: string
    months: string[]
    dateRange: { from?: Date; to?: Date }
    dateRangeType: string
    properties: string[]
    channels: string[]
}) {
    const [data, setData] = useState<UIDateGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const parseAPIDate = (dateStr: string) => {
            const [day, month, year] = dateStr.split("-")
            return new Date(`${day} ${month} ${year}`)
        }

        const isDateAllowed = (dateStr: string) => {
            const date = parseAPIDate(dateStr)

            // YEAR filter
            if (filters.year && date.getFullYear().toString() !== filters.year) {
                return false
            }

            // MONTH filter (JAN, FEB, MAR...)
            if (filters.months.length > 0) {
                const month = date
                    .toLocaleString("en-US", { month: "short" })
                    .toUpperCase()

                if (!filters.months.includes(month)) {
                    return false
                }
            }

            // CUSTOM DATE RANGE
            if (filters.dateRange.from && date < filters.dateRange.from) {
                return false
            }

            if (filters.dateRange.to && date > filters.dateRange.to) {
                return false
            }

            return true
        }


        // const fetchData = async () => {
        //     try {
        //         const res = await fetch(
        //             "https://script.google.com/macros/s/AKfycbye9xqvbQDcI8k3hOQqoFUpwcUjdCoz4HkJ-qrWL9esXIMBmVb_qfs9ISO5185XG9gvSw/exec"
        //             // "https://script.google.com/macros/s/AKfycbzEAt6d7Cv5bNhr4bJyJ-fd71zf48d8yvb1NQYQPuljcZio4qOHwhgGumV_LAEOy1qO5g/exec"
        //         )

        //         if (!res.ok) {
        //             throw new Error("API request failed")
        //         }

        //         const apiData: ApiResponse = await res.json()

        //         const formattedData: UIDateGroup[] = []

        //         Object.entries(apiData).forEach(([date, sources]) => {
        //             // ✅ STEP 6: DATE FILTER
        //             if (!isDateAllowed(date)) return

        //             // 1️⃣ Build source list
        //             const sourceList: UISourceData[] = Object.entries(sources).map(
        //                 ([sourceName, v]) => {
        //                     const spent = Number(v.spent) || 0
        //                     const sale = Number(v.sale) || 0
        //                     const totalAdsSpent = Number(v.totalAdsSpent) || 0
        //                     const conversions = Number(v.conversions) || 0
        //                     const conversionsActual = Number(v.conversionsActual) || 0

        //                     return {
        //                         name: sourceName,

        //                         // property tagging (API-limited)
        //                         property: filters.properties[0] ?? "UNKNOWN",

        //                         spent,
        //                         conversions,
        //                         conversionsActual,

        //                         leadsReceived: conversions + conversionsActual,

        //                         sale,

        //                         roasPerChannel: spent > 0 ? sale / spent : 0,

        //                         totalAdsSpent,

        //                         totalRoas: totalAdsSpent > 0 ? sale / totalAdsSpent : 0,

        //                         provisionalSales:
        //                             v.provisionalSales && v.provisionalSales > 0
        //                                 ? String(v.provisionalSales)
        //                                 : "N/A",
        //                     }
        //                 }
        //             )

        //             // 2️⃣ STEP 4: CHANNEL FILTER
        //             const filteredSources =
        //                 filters.channels.length === 0
        //                     ? sourceList
        //                     : sourceList.filter((src) =>
        //                         filters.channels.includes(src.name)
        //                     )

        //             // 3️⃣ STEP 5: PROPERTY SUPPORT (API-limited)
        //             if (filters.properties.length > 0 && !filters.properties[0]) {
        //                 return
        //             }

        //             // 4️⃣ Push valid date group
        //             if (filteredSources.length > 0) {
        //                 formattedData.push({
        //                     date,
        //                     sources: filteredSources,
        //                 })
        //             }
        //         })

        //         setData(formattedData)
        //     } catch (err) {
        //         console.error(err)
        //         setError("Failed to load lead quality data")
        //     } finally {
        //         setLoading(false)
        //     }
        // }


        const fetchData = async () => {
            try {
                const res = await fetch(
                    //"https://script.google.com/macros/s/AKfycbzEAt6d7Cv5bNhr4bJyJ-fd71zf48d8yvb1NQYQPuljcZio4qOHwhgGumV_LAEOy1qO5g/exec"
                    "https://script.google.com/macros/s/AKfycby_VtW5PlYEpdQYcPnkbchh_AnGiqWm2zNFY1D5zPrRK0HwOXHvjy_yoR6Vo2q4MrZP/exec"
                )

                if (!res.ok) {
                    throw new Error("API request failed")
                }

                const apiData = await res.json()
                const formattedData: UIDateGroup[] = []

                // 🔹 LOOP 1: PROPERTY LEVEL (KTAHV, etc.)
                Object.entries(apiData).forEach(([propertyName, dateMap]: any) => {

                    // Property filter
                    if (
                        filters.properties.length > 0 &&
                        !filters.properties.includes(propertyName)
                    ) {
                        return
                    }

                    // 🔹 LOOP 2: DATE LEVEL
                    Object.entries(dateMap).forEach(([date, sources]: any) => {

                        // Date filter
                        if (!isDateAllowed(date)) return

                        // 🔹 LOOP 3: SOURCE LEVEL
                        const sourceList: UISourceData[] = Object.entries(sources).map(
                            ([sourceName, v]: any) => {
                                const spent = Number(v.spendAmount) || 0
                                const sale = Number(v.conversionAmount) || 0
                                const conversions = Number(v.conversionCount) || 0
                                const conversionsActual = Number(v.conversionCountActual) || 0
                                const totalAdsSpent = spent

                                return {
                                    name: sourceName,
                                    property: propertyName,

                                    spent,
                                    conversions,
                                    conversionsActual,

                                    leadsReceived: Number(v.totalLeads) || 0,

                                    sale,

                                    roasPerChannel: spent > 0 ? sale / spent : 0,

                                    totalAdsSpent,
                                    totalRoas: totalAdsSpent > 0 ? sale / totalAdsSpent : 0,

                                    provisionalSales: "N/A",

                                    // Optional: quality breakup if needed later
                                    highQualityLeads: v.highQualityLeads || 0,
                                    mediumQualityLeads: v.mediumQualityLeads || 0,
                                    lowQualityLeads: v.lowQualityLeads || 0,
                                }
                            }
                        )

                        // Channel filter
                        const filteredSources =
                            filters.channels.length === 0
                                ? sourceList
                                : sourceList.filter((src) =>
                                    filters.channels.includes(src.name)
                                )

                        if (filteredSources.length > 0) {
                            formattedData.push({
                                date,
                                sources: filteredSources,
                            })
                        }
                    })
                })

                setData(formattedData)
            } catch (err) {
                console.error(err)
                setError("Failed to load lead quality data")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [filters])

    return { data, loading, error }
}
