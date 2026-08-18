"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, BarChart3, TableIcon } from "lucide-react"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import {
  useLeadTargetReport,
  Company,
  DailyLeadTargetRow,
} from "@/hooks/use-lead-target-report"

/* ================= CONSTANTS ================= */

const ITEMS_PER_PAGE = 10

/* ================= PROPS ================= */

interface LeadTargetReportProps {
  companies: Company[]
  startDate?: string
  endDate?: string
}

/* ================= COMPONENT ================= */

export function LeadTargetReport({
  companies,
  startDate,
  endDate,
}: LeadTargetReportProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")
  const [currentPage, setCurrentPage] = useState(1)
  const [gotoPageInput, setGotoPageInput] = useState("")

  // Fetch data for all companies
  const ktahvData = useLeadTargetReport({
    company: "KTAHV",
    startDate,
    endDate,
  })
  const kapplData = useLeadTargetReport({
    company: "KAPPL",
    startDate,
    endDate,
  })
  const villaRaagData = useLeadTargetReport({
    company: "VILLARAAG",
    startDate,
    endDate,
  })

  // Combine data based on selected companies
  const { dailyReport, totals, loading, error } = useMemo(() => {
    const allData = []
    let isLoading = false

    if (companies.includes("KTAHV")) {
      allData.push(ktahvData)
      isLoading = isLoading || ktahvData.loading
    }
    if (companies.includes("KAPPL")) {
      allData.push(kapplData)
      isLoading = isLoading || kapplData.loading
    }
    if (companies.includes("VILLARAAG")) {
      allData.push(villaRaagData)
      isLoading = isLoading || villaRaagData.loading
    }

    // Surface the first load failure among the selected companies so a service
    // error is not shown as a valid empty result.
    const loadError = allData.find((d) => d.error)?.error ?? null

    // Merge daily reports by date
    const dateMap = new Map<string, DailyLeadTargetRow>()

    allData.forEach((companyData) => {
      companyData.dailyReport.forEach((row) => {
        const existing = dateMap.get(row.date)
        if (existing) {
          existing.targetLead += row.targetLead
          existing.freshLead += row.freshLead
          existing.crrLead += row.crrLead
          existing.actualLead += row.actualLead
          existing.targetNotAchieved += row.targetNotAchieved
        } else {
          dateMap.set(row.date, { ...row })
        }
      })
    })

    const mergedDailyReport = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // Merge totals
    const mergedTotals = allData.reduce(
      (acc, companyData) => {
        acc.target += companyData.totals.target
        acc.fresh += companyData.totals.fresh
        acc.crr += companyData.totals.crr
        acc.actual += companyData.totals.actual
        return acc
      },
      { target: 0, fresh: 0, crr: 0, actual: 0, achievementPercent: 0 }
    )

    mergedTotals.achievementPercent =
      mergedTotals.target > 0
        ? ((mergedTotals.actual - mergedTotals.target) / mergedTotals.target) * 100
        : 0

    return {
      dailyReport: mergedDailyReport,
      totals: mergedTotals,
      loading: isLoading,
      error: loadError,
    }
  }, [companies, ktahvData, kapplData, villaRaagData])

  const reportTimestamp = new Date().toLocaleString()

  /* ================= PAGINATION ================= */

  const totalItems = dailyReport.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return dailyReport.slice(startIndex, endIndex)
  }, [dailyReport, currentPage])

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <section className="w-full mt-6 sm:mt-8 mb-10">
        <div className="rounded-xl border-2 border-slate-300 bg-white shadow-sm p-10 text-center text-slate-500">
          Loading Lead Target Report…
        </div>
      </section>
    )
  }

  /* ================= LOAD ERROR ================= */

  if (error) {
    return (
      <section className="w-full mt-6 sm:mt-8 mb-10">
        <div className="rounded-xl border-2 border-red-300 bg-red-50 shadow-sm p-10 text-center">
          <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-3" />
          <p className="text-red-700 font-medium">
            Couldn&apos;t load the Lead Target Report
          </p>
          <p className="text-xs text-red-600 mt-2">
            The report service is unavailable, so no figures are shown. This is
            not an empty result — please refresh the page to try again.
          </p>
          <p className="text-[11px] text-red-500 mt-2">{error}</p>
        </div>
      </section>
    )
  }

  /* ================= EMPTY ================= */

  if (!dailyReport.length) {
    return (
      <section className="w-full mt-6 sm:mt-8 mb-10">
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 shadow-sm p-10 text-center">
          <p className="text-slate-600 font-medium">
            No data for the selected filters
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Try changing date range or property filters
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full mt-6 sm:mt-8 mb-10">
      <div className="rounded-xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
        {/* ===== HEADER ===== */}
        <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Marketing Lead Target vs Actual Report (Daily Wise)
                </h3>
                <p className="text-xs text-slate-600">
                  {companies.length === 1
                    ? `Company: ${companies[0]}`
                    : `Companies: ${companies.join(", ")}`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2 rounded-full px-4"
              >
                <TableIcon className="h-4 w-4" />
                Table
              </Button>

              <Button
                variant={viewMode === "chart" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
                className="gap-2 rounded-full px-4"
              >
                <BarChart3 className="h-4 w-4" />
                Chart
              </Button>
            </div>
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        {viewMode === "table" ? (
          <div className="space-y-4">
            {/* Info */}
            <div className="w-full mt-4 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-md px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">
                    Report Generated
                  </Badge>
                  <span className="text-sm font-medium text-slate-700">
                    {reportTimestamp}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Avg Achievement</p>
                  <p className="text-lg font-bold text-red-600">
                    {totals.achievementPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 text-left bg-purple-600 text-white border-r border-white/20">Date</th>
                      <th className="py-3 px-4 text-center bg-yellow-100 text-slate-900 border-r border-slate-300">Target Lead</th>
                      <th className="py-3 px-4 text-center bg-yellow-50 text-slate-900 border-r border-slate-300">Fresh Lead</th>
                      <th className="py-3 px-4 text-center bg-purple-600 text-white border-r border-white/20">CRR Lead</th>
                      <th className="py-3 px-4 text-center bg-cyan-100 text-slate-900 border-r border-slate-300">Actual Lead</th>
                      <th className="py-3 px-4 text-center bg-yellow-100 text-slate-900">Target not Achieved %</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedData.map((row, i) => (
                      <tr
                        key={row.date}
                        className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3 px-4 bg-purple-50/30 border-r border-slate-200 font-medium text-slate-700">{row.date}</td>
                        <td className="py-3 px-4 text-center bg-yellow-50/20 border-r border-slate-200">{row.targetLead}</td>
                        <td className="py-3 px-4 text-center bg-white border-r border-slate-200">{row.freshLead}</td>
                        <td className="py-3 px-4 text-center bg-purple-50/20 border-r border-slate-200">{row.crrLead}</td>
                        <td className="py-3 px-4 text-center bg-cyan-50/30 border-r border-slate-200 font-semibold text-green-700">
                          {row.actualLead}
                        </td>
                        <td className="py-3 px-4 text-center bg-yellow-50/20">
                          <span className="text-slate-700 font-medium">
                            {row.targetNotAchieved}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* GRAND TOTAL */}
                    <tr className="bg-purple-700 text-white font-bold border-t-2 border-purple-800">
                      <td className="py-4 px-4 border-r border-purple-600">GRAND TOTAL</td>
                      <td className="py-4 px-4 text-center border-r border-purple-600">{totals.target}</td>
                      <td className="py-4 px-4 text-center border-r border-purple-600">{totals.fresh}</td>
                      <td className="py-4 px-4 text-center border-r border-purple-600">{totals.crr}</td>
                      <td className="py-4 px-4 text-center border-r border-purple-600">{totals.actual}</td>
                      <td className="py-4 px-4 text-center">
                        {totals.achievementPercent.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGINATION (PROFESSIONAL) */}
            <div className="mt-6 px-4 sm:px-6 py-4 
     flex flex-col lg:flex-row 
     items-start lg:items-center 
     justify-between 
     gap-6 lg:gap-8 
     border-t border-slate-200 bg-slate-50/50">
              {/* Left */}
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold">{startItem}</span>–
                <span className="font-semibold">{endItem}</span> of{" "}
                <span className="font-semibold">{totalItems}</span>
              </p>

              {/* Center */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>

                <span className="text-sm text-slate-700">
                  Page <strong>{currentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Go to</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={gotoPageInput}
                  onChange={(e) => setGotoPageInput(e.target.value)}
                  className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const page = Number(gotoPageInput)
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page)
                    }
                    setGotoPageInput("")
                  }}
                >
                  Go
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= CHART VIEW ================= */
          <div className="px-4 sm:px-6 py-6">
            <ChartContainer
              config={{
                targetLead: { label: "Target", color: "hsl(262, 83%, 58%)" },
                actualLead: { label: "Actual", color: "hsl(142, 71%, 45%)" },
              }}
              className="w-full h-[260px] sm:h-[320px] lg:h-[380px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyReport}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" angle={-45} height={70} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="targetLead" fill="var(--color-targetLead)" />
                  <Bar dataKey="actualLead" fill="var(--color-actualLead)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </div>
    </section>
  )
}
