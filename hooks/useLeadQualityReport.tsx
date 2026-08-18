import { useEffect, useState } from "react"

export interface LeadQualityData {
    date: string
    source: string
    totalTraffic: number
    totalLead: number
    conversionCountActual: number
    convertPercent: number
    conversionAmount: number
    highQuality: number
    highQualityPercent: number
    mediumQuality: number
    mediumQualityPercent: number
    lowQuality: number
    lowQualityPercent: number
    spend: number
    cac: number
}

export function useLeadQualityReport() {
    const [data, setData] = useState<LeadQualityData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchLeadQuality()
    }, [])

    const fetchLeadQuality = async () => {
        try {
            setLoading(true)
            setError(null)

            const res = await fetch(
                "https://script.google.com/macros/s/AKfycbzEAt6d7Cv5bNhr4bJyJ-fd71zf48d8yvb1NQYQPuljcZio4qOHwhgGumV_LAEOy1qO5g/exec",
                {
                    method: "GET",
                }
            )

            if (!res.ok) {
                throw new Error("API request failed")
            }

            const json = await res.json()

            const formattedData: LeadQualityData[] = []

            // 🔥 FIX: Handle nested company structure
            // Loop through companies (KTAHV, etc.)
            Object.entries(json || {}).forEach(([companyName, companyData]: any) => {
                if (!companyData || typeof companyData !== "object") return

                // Loop through dates within each company
                Object.entries(companyData).forEach(([date, sources]: any) => {
                    if (!sources || typeof sources !== "object") return

                    // Loop through sources within each date
                    Object.entries(sources).forEach(([sourceName, s]: any) => {
                        const totalLead = Number(s.totalLeads) || 0

                        const conversionCountActual = Number(s.conversionCountActual) || 0
                        const conversionAmount = Number(s.conversionAmount) || 0

                        const highQuality = Number(s.highQualityLeads) || 0
                        const mediumQuality = Number(s.mediumQualityLeads) || 0
                        const lowQuality = Number(s.lowQualityLeads) || 0
                        const spend = Number(s.spendAmount) || 0

                        formattedData.push({
                            date,
                            source: sourceName,

                            totalTraffic: 0, // not provided by API
                            totalLead,

                            // ✅ CONVERSION
                            conversionCountActual,
                            convertPercent:
                                totalLead > 0
                                    ? (conversionCountActual / totalLead) * 100
                                    : 0,
                            conversionAmount,

                            // ✅ LEAD QUALITY
                            highQuality,
                            highQualityPercent:
                                totalLead > 0 ? (highQuality / totalLead) * 100 : 0,

                            mediumQuality,
                            mediumQualityPercent:
                                totalLead > 0 ? (mediumQuality / totalLead) * 100 : 0,

                            lowQuality,
                            lowQualityPercent:
                                totalLead > 0 ? (lowQuality / totalLead) * 100 : 0,

                            spend,
                            cac: totalLead > 0 ? spend / totalLead : 0,
                        })
                    })
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

    return { data, loading, error }
}
