"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React from "react"
import { useLeadQualityReport, type LeadQualityData } from "@/hooks/useLeadQualityReport"
import { BarChart3, Table2, ChevronDown, ChevronRight, Calendar } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts"

export function LeadQualitySection() {
  const { data: leadQualityData, loading, error } = useLeadQualityReport()
  const [view, setView] = useState<"table" | "graph">("table")
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [goToPage, setGoToPage] = useState("")

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  // Group data by date
  const groupedData = leadQualityData.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = []
    }
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, LeadQualityData[]>)

  // Calculate totals for each date
  const dateTotals = (Object.entries(groupedData) as Array<[string, LeadQualityData[]]>).map(([date, sources]) => {
    const totalLead = sources.reduce((sum, s) => sum + s.totalLead, 0)
    const highQuality = sources.reduce((sum, s) => sum + s.highQuality, 0)
    const mediumQuality = sources.reduce((sum, s) => sum + s.mediumQuality, 0)
    const lowQuality = sources.reduce((sum, s) => sum + s.lowQuality, 0)
    const spend = sources.reduce((sum, s) => sum + s.spend, 0)

    return {
      date,
      totalLead,
      highQuality,
      highQualityPercent: totalLead > 0 ? (highQuality / totalLead) * 100 : 0,
      mediumQuality,
      mediumQualityPercent: totalLead > 0 ? (mediumQuality / totalLead) * 100 : 0,
      lowQuality,
      lowQualityPercent: totalLead > 0 ? (lowQuality / totalLead) * 100 : 0,
      spend,
      cac: totalLead > 0 ? spend / totalLead : 0,
      sources,
    }
  })

  // Pagination logic
  const totalPages = Math.ceil(dateTotals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDateTotals = dateTotals.slice(startIndex, endIndex)

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPage)
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
      setGoToPage("")
    }
  }

  // Calculate overall totals
  const overallTotals = useMemo(() => {
    const totals = {
      totalLead: leadQualityData.reduce((sum, s) => sum + s.totalLead, 0),
      highQuality: leadQualityData.reduce((sum, s) => sum + s.highQuality, 0),
      mediumQuality: leadQualityData.reduce((sum, s) => sum + s.mediumQuality, 0),
      lowQuality: leadQualityData.reduce((sum, s) => sum + s.lowQuality, 0),
      spend: leadQualityData.reduce((sum, s) => sum + s.spend, 0),
      highQualityPercent: 0,
      mediumQualityPercent: 0,
      lowQualityPercent: 0,
      cac: 0,
    }

    if (totals.totalLead > 0) {
      totals.highQualityPercent = (totals.highQuality / totals.totalLead) * 100
      totals.mediumQualityPercent = (totals.mediumQuality / totals.totalLead) * 100
      totals.lowQualityPercent = (totals.lowQuality / totals.totalLead) * 100
      totals.cac = totals.spend / totals.totalLead
    }

    return totals
  }, [leadQualityData])

  const chartData = leadQualityData.map((row) => ({
    name: row.source.length > 20 ? row.source.substring(0, 20) + "..." : row.source,
    fullName: row.source,
    date: row.date,
    highQuality: row.highQuality,
    mediumQuality: row.mediumQuality,
    lowQuality: row.lowQuality,
    totalLead: row.totalLead,
    spend: row.spend,
    cac: row.cac,
  }))

  const qualityDistribution = [
    { name: "High Quality", value: overallTotals.highQuality, color: "#10b981" },
    { name: "Medium Quality", value: overallTotals.mediumQuality, color: "#f59e0b" },
    { name: "Low Quality", value: overallTotals.lowQuality, color: "#ef4444" },
  ]

  return (
    <section className="w-full mt-6 sm:mt-8">
      <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 via-slate-100 to-sky-50 border-b-2 border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-100 shadow-sm">
                <BarChart3 className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Lead Quality Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analyze lead quality distribution across sources and dates
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={view === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("table")}
                className="flex items-center gap-2"
              >
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={view === "graph" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("graph")}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Graph</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {view === "table" ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <Card className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 border-2 border-emerald-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                        High Quality Leads
                      </p>
                      <p className="text-3xl font-extrabold text-emerald-900 mt-2">
                        {overallTotals.highQuality}
                      </p>
                      <p className="text-sm font-medium text-emerald-700 mt-1">
                        ({overallTotals.highQualityPercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">H</span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                        Medium Quality Leads
                      </p>
                      <p className="text-3xl font-extrabold text-amber-900 mt-2">
                        {overallTotals.mediumQuality}
                      </p>
                      <p className="text-sm font-medium text-amber-700 mt-1">
                        ({overallTotals.mediumQualityPercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">M</span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border-2 border-red-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                        Low Quality Leads
                      </p>
                      <p className="text-3xl font-extrabold text-red-900 mt-2">
                        {overallTotals.lowQuality}
                      </p>
                      <p className="text-sm font-medium text-red-700 mt-1">
                        ({overallTotals.lowQualityPercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">L</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Pagination Info - Top */}
              {/* <div className="flex items-center justify-between px-2 py-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold">{startIndex + 1}–{Math.min(endIndex, dateTotals.length)}</span> of <span className="font-semibold">{dateTotals.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm"
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-slate-600">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm"
                  >
                    Next
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-slate-600">Go to</span>
                    <Input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={goToPage}
                      onChange={(e) => setGoToPage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleGoToPage()
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                      placeholder={currentPage.toString()}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGoToPage}
                      className="px-3 py-1 text-sm"
                    >
                      Go
                    </Button>
                  </div>
                </div>
              </div> */}

              {/* Table with Date Grouping */}
              <div className="overflow-x-auto rounded-xl border-2 border-slate-200 shadow-md">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                        Date / Source
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                        Total Leads
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-emerald-700 uppercase tracking-wider border-b-2 border-slate-300">
                        High Quality
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-amber-700 uppercase tracking-wider border-b-2 border-slate-300">
                        Medium Quality
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-red-700 uppercase tracking-wider border-b-2 border-slate-300">
                        Low Quality
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-indigo-700 uppercase border-b-2 border-slate-300">
                        Conversion %
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-green-700 uppercase border-b-2 border-slate-300">
                        Conversion Amount (₹)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                        Spend (₹)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                        CAC (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDateTotals.map((dateGroup) => (
                      <React.Fragment key={dateGroup.date}>
                        {/* DATE ROW */}
                        <tr
                          className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200 hover:from-blue-100 hover:to-blue-150 cursor-pointer transition-colors"
                          onClick={() => toggleDateExpansion(dateGroup.date)}
                        >
                          <td className="px-4 py-3 font-bold text-blue-900">
                            <div className="flex items-center gap-2">
                              {expandedDates.has(dateGroup.date) ? (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-blue-600" />
                              )}
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{dateGroup.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-900">
                            {dateGroup.totalLead}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-emerald-700">
                                {dateGroup.highQuality}
                              </span>
                              <span className="text-xs text-emerald-600">
                                ({dateGroup.highQualityPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-amber-700">
                                {dateGroup.mediumQuality}
                              </span>
                              <span className="text-xs text-amber-600">
                                ({dateGroup.mediumQualityPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-red-700">
                                {dateGroup.lowQuality}
                              </span>
                              <span className="text-xs text-red-600">
                                ({dateGroup.lowQualityPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-800">
                            {dateGroup.totalLead > 0
                              ? `${(
                                (dateGroup.sources.reduce(
                                  (sum, s) => sum + s.conversionCountActual,
                                  0
                                ) /
                                  dateGroup.totalLead) *
                                100
                              ).toFixed(1)}%`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-green-800">
                            ₹
                            {dateGroup.sources
                              .reduce((sum, s) => sum + s.conversionAmount, 0)
                              .toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-900">
                            {dateGroup.spend > 0
                              ? `₹${dateGroup.spend.toLocaleString()}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-900">
                            {dateGroup.cac > 0 ? `₹${dateGroup.cac.toFixed(2)}` : "-"}
                          </td>
                        </tr>

                        {/* SOURCE ROWS */}
                        {expandedDates.has(dateGroup.date) &&
                          dateGroup.sources.map((source, sourceIdx) => (
                            <tr
                              key={`${dateGroup.date}-${source.source}`}
                              className={`${sourceIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                                } hover:bg-blue-50 transition-colors border-b border-slate-200`}
                            >
                              <td className="px-4 py-3 pl-12 text-sm text-slate-700">
                                {source.source}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-slate-900">
                                {source.totalLead}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {source.highQuality}
                                  </span>
                                  <span className="text-xs text-emerald-600">
                                    ({source.highQualityPercent.toFixed(1)}%)
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-semibold text-amber-700">
                                    {source.mediumQuality}
                                  </span>
                                  <span className="text-xs text-amber-600">
                                    ({source.mediumQualityPercent.toFixed(1)}%)
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-semibold text-red-700">
                                    {source.lowQuality}
                                  </span>
                                  <span className="text-xs text-red-600">
                                    ({source.lowQualityPercent.toFixed(1)}%)
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">
                                {source.totalLead > 0
                                  ? `${source.convertPercent.toFixed(1)}%`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-semibold text-green-700">
                                {source.conversionAmount > 0
                                  ? `₹${source.conversionAmount.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-slate-700">
                                {source.spend > 0
                                  ? `₹${source.spend.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-slate-700">
                                {source.cac > 0 ? `₹${source.cac.toFixed(2)}` : "-"}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Info - Bottom */}
              <div className="flex items-center justify-between px-2 py-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold">{startIndex + 1}–{Math.min(endIndex, dateTotals.length)}</span> of <span className="font-semibold">{dateTotals.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm"
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-slate-600">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm"
                  >
                    Next
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-slate-600">Go to</span>
                    <Input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={goToPage}
                      onChange={(e) => setGoToPage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleGoToPage()
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                      placeholder={currentPage.toString()}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGoToPage}
                      className="px-3 py-1 text-sm"
                    >
                      Go
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Graph view content - keep your existing graph code here */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-200 shadow-md">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Lead Quality Distribution by Source</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="highQuality" name="High Quality" fill="#10b981" />
                    <Bar dataKey="mediumQuality" name="Medium Quality" fill="#f59e0b" />
                    <Bar dataKey="lowQuality" name="Low Quality" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
