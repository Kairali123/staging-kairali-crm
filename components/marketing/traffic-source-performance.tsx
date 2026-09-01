"use client"

import React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { BarChart3, Table2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useLeadQualityData } from "@/hooks/useLeadQualityData"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts"

const ITEMS_PER_PAGE = 10

interface TrafficSourceData {
  date: string
  sources: {
    name: string
    property: string
    spent: number
    conversions: number
    conversionsActual: number
    leadsReceived: number
    sale: number
    roasPerChannel: number
    totalAdsSpent: number
    totalRoas: number
    provisionalSales: string
  }[]
}

interface TrafficSourcePerformanceProps {
  filters: {
    year: string
    months: string[]
    dateRange: { from?: Date; to?: Date }
    dateRangeType: string
    properties: string[]
    channels: string[]
  }
}

export function TrafficSourcePerformance({
  filters,
}: TrafficSourcePerformanceProps) {
  const { data, loading, error } = useLeadQualityData(filters)
  const [view, setView] = useState<"table" | "graph">("table")
  const [currentPage, setCurrentPage] = useState(1)
  const [gotoPageInput, setGotoPageInput] = useState("")

  const filteredData = useMemo(() => {
    return data
      .map((day) => ({
        ...day,
        sources: day.sources.filter((source) => {
          const channelMatch =
            filters.channels.length === 0 ||
            filters.channels.includes(source.name)

          const propertyMatch =
            filters.properties.length === 0 ||
            filters.properties.includes(source.property)

          return channelMatch && propertyMatch
        }),
      }))
      .filter((day) => day.sources.length > 0)
  }, [data, filters])

  const allData = useMemo(() => {
    return filteredData.flatMap((dateGroup) => dateGroup.sources)
  }, [filteredData])

  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage])

  const dailyStats = useMemo(() => {
    return filteredData.map((d) => {
      const totalSpent = d.sources.reduce((a, s) => a + s.spent, 0)
      const totalSale = d.sources.reduce((a, s) => a + s.sale, 0)

      return {
        date: d.date,
        conversions: d.sources.reduce((a, s) => a + s.conversionsActual, 0),
        roas: totalSpent > 0 ? totalSale / totalSpent : 0,
      }
    })
  }, [filteredData])

  const totals = useMemo(() => {
    return allData.reduce(
      (acc, row) => {
        acc.spent += row.spent
        acc.conversions += row.conversions
        acc.conversionsActual += row.conversionsActual
        acc.leadsReceived += row.leadsReceived
        acc.sale += row.sale
        acc.totalAdsSpent += row.totalAdsSpent || 0

        // ✅ weighted ROAS per channel
        if (row.spent > 0) {
          acc.roasWeightedSale += row.sale
          acc.roasWeightedSpent += row.spent
        }

        return acc
      },
      {
        spent: 0,
        conversions: 0,
        conversionsActual: 0,
        leadsReceived: 0,
        sale: 0,
        totalAdsSpent: 0,

        // ✅ for ROAS per channel
        roasWeightedSale: 0,
        roasWeightedSpent: 0,
      }
    )
  }, [allData])

  const formatCurrency = (value: number) => {
    if (value === 0) return "N/A"
    return `₹${value.toLocaleString()}`
  }

  const formatNumber = (value: number) => {
    if (value === 0) return "N/A"
    return value.toLocaleString()
  }

  if (loading) {
    return <div className="p-6 text-center">Loading report...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>
  }

  return (
    <section className="w-full mt-8 mb-8">
      {/* Card Container with Border Radius */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-300 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 py-5">
            {/* Left - Title */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Source Wise Daily Marketing Lead & Conversion with ROAS
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Daily performance tracking by traffic source
                </p>
              </div>
            </div>

            {/* Right - View Toggle */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-sm">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                className="gap-2 rounded-lg px-4 transition-all"
              >
                <Table2 className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={view === "graph" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("graph")}
                className="gap-2 rounded-lg px-4 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Graph</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {view === "table" ? (
            <>
              {/* Responsive Table Container */}
              <div className="border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1600px] border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700">
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Date
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Traffic Source
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Spent
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Conversions
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Conversions
                          <br />
                          (Actual)
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm bg-teal-600 whitespace-nowrap">
                          Leads Received
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Sale
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm bg-indigo-600 whitespace-nowrap">
                          ROAS
                          <br />
                          As per Channel
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Total Ads Spent
                        </th>
                        <th className="border-r border-slate-500 px-4 py-3 text-center font-bold text-white text-sm whitespace-nowrap">
                          Total ROAS
                        </th>
                        <th className="px-4 py-3 text-center font-bold text-white text-sm bg-blue-600 whitespace-nowrap">
                          Provisional Sales
                          <br />
                          (Confirmed, Not Paid)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white">
                      {paginatedData.map((dateGroup, dateIndex) => {
                        const dateTotals = dateGroup.sources.reduce(
                          (acc, s) => {
                            acc.spent += s.spent
                            acc.conversions += s.conversions
                            acc.conversionsActual += s.conversionsActual
                            acc.leadsReceived += s.leadsReceived
                            acc.sale += s.sale

                            acc.totalAdsSpent += s.totalAdsSpent

                            // for weighted ROAS
                            if (s.spent > 0) {
                              acc.roasWeightedSale += s.sale
                              acc.roasWeightedSpent += s.spent
                            }

                            if (s.provisionalSales) {
                              acc.provisionalSales.push(s.provisionalSales)
                            }

                            return acc
                          },
                          {
                            spent: 0,
                            conversions: 0,
                            conversionsActual: 0,
                            leadsReceived: 0,
                            sale: 0,

                            totalAdsSpent: 0,

                            roasWeightedSale: 0,
                            roasWeightedSpent: 0,

                            provisionalSales: [] as string[],
                          }
                        )


                        return (
                          <React.Fragment key={dateIndex}>
                            {dateGroup.sources.map((source, sourceIndex) => (
                              <tr
                                key={`${dateIndex}-${sourceIndex}`}
                                className={`${sourceIndex === 0 ? "border-t-4 border-slate-400" : ""} hover:bg-slate-50 transition-colors`}
                              >
                                {sourceIndex === 0 && (
                                  <td
                                    rowSpan={dateGroup.sources.length}
                                    className="border-r border-slate-300 px-4 py-3 text-center font-extrabold bg-slate-200 text-slate-900"
                                  >
                                    {dateGroup.date}
                                  </td>
                                )}

                                <td className="border-r border-slate-200 px-4 py-3 text-slate-700 font-medium">
                                  {source.name}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-700">
                                  {source.spent === 0 ? "N/A" : formatCurrency(source.spent)}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-700">
                                  {source.conversions || "N/A"}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-700">
                                  {source.conversionsActual || "N/A"}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center bg-teal-50 font-semibold text-teal-700">
                                  {source.leadsReceived}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-700">
                                  {source.sale === 0 ? "N/A" : formatCurrency(source.sale)}
                                </td>

                                <td className="border-r border-slate-300 px-4 py-3 text-center text-slate-900">
                                  {source.roasPerChannel ? (
                                    <Badge className="bg-indigo-100 text-indigo-700">
                                      {source.roasPerChannel.toFixed(2)}
                                    </Badge>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-700">
                                  {source.totalAdsSpent || "N/A"}
                                </td>

                                <td className="border-r border-slate-200 px-4 py-3 text-center text-slate-700">
                                  {source.totalRoas || "N/A"}
                                </td>

                                <td className="px-4 py-3 text-center text-slate-700">
                                  {source.provisionalSales}
                                </td>
                              </tr>
                            ))}

                            {/* Date-wise Total Row */}
                            <tr className="bg-slate-100 border-b-4 border-slate-400 font-semibold">
                              {/* Date column */}
                              <td className="border-r border-slate-300 px-4 py-3 text-center font-bold text-slate-700 uppercase tracking-wide">
                                Total
                              </td>

                              {/* Traffic Source column (empty on purpose) */}
                              <td className="border-r border-slate-200 px-4 py-3"></td>



                              <td className="px-4 py-3 text-center">
                                {dateTotals.spent ? formatCurrency(dateTotals.spent) : "N/A"}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {dateTotals.conversions || "N/A"}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {dateTotals.conversionsActual || "N/A"}
                              </td>

                              <td className="px-4 py-3 text-center text-teal-700">
                                {dateTotals.leadsReceived}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {dateTotals.sale ? formatCurrency(dateTotals.sale) : "N/A"}
                              </td>

                              {/* ROAS As per Channel (weighted) */}
                              <td className="px-4 py-3 text-center text-slate-700 font-semibold">
                                {dateTotals.roasWeightedSpent > 0
                                  ? (dateTotals.roasWeightedSale / dateTotals.roasWeightedSpent).toFixed(2)
                                  : "N/A"}
                              </td>

                              {/* Total Ads Spent */}
                              <td className="px-4 py-3 text-center text-slate-700">
                                {dateTotals.totalAdsSpent
                                  ? formatCurrency(dateTotals.totalAdsSpent)
                                  : "N/A"}
                              </td>

                              {/* Total ROAS */}
                              <td className="px-4 py-3 text-center text-slate-700 font-semibold">
                                {dateTotals.totalAdsSpent > 0
                                  ? (dateTotals.sale / dateTotals.totalAdsSpent).toFixed(2)
                                  : "N/A"}
                              </td>

                              {/* Provisional Sales */}
                              <td className="px-4 py-3 text-center text-slate-700 text-xs">
                                {dateTotals.provisionalSales.length
                                  ? dateTotals.provisionalSales.join(", ")
                                  : "N/A"}
                              </td>
                            </tr>
                          </React.Fragment>
                        )
                      })}

                      {/* Grand Total Row */}
                      <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-t-4 border-amber-500">
                        <td colSpan={2} className="px-4 py-4 text-white font-bold text-center">
                          Grand Total
                        </td>

                        <td className="px-4 py-4 text-white font-bold text-center">
                          {formatCurrency(totals.spent)}
                        </td>

                        <td className="px-4 py-4 text-white font-bold text-center">
                          {totals.conversions}
                        </td>

                        <td className="px-4 py-4 text-white font-bold text-center">
                          {totals.conversionsActual}
                        </td>

                        <td className="px-4 py-4 text-teal-300 font-bold text-center">
                          {totals.leadsReceived}
                        </td>

                        <td className="px-4 py-4 text-white font-bold text-center">
                          {formatCurrency(totals.sale)}
                        </td>

                        {/* ROAS As per Channel */}
                        <td className="px-4 py-3 text-center text-white font-bold">
                          {totals.roasWeightedSpent > 0
                            ? (totals.roasWeightedSale / totals.roasWeightedSpent).toFixed(2)
                            : "N/A"}
                        </td>

                        {/* Total Ads Spent */}
                        <td className="px-4 py-3 text-center text-white font-bold">
                          {totals.totalAdsSpent
                            ? formatCurrency(totals.totalAdsSpent)
                            : "N/A"}
                        </td>

                        {/* Total ROAS */}
                        <td className="px-4 py-3 text-center text-white font-bold">
                          {totals.totalAdsSpent > 0
                            ? (totals.sale / totals.totalAdsSpent).toFixed(2)
                            : "N/A"}
                        </td>

                        {/* Provisional Sales */}
                        <td className="px-4 py-3 text-center text-slate-500">
                          N/A
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>


              {/* Pagination Controls */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>
                  –
                  <span className="font-semibold text-slate-800">
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {totalItems}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg"
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-slate-700 px-3">
                    Page <strong>{currentPage}</strong> of{" "}
                    <strong>{totalPages}</strong>
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-lg"
                  >
                    Next
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={gotoPageInput}
                    onChange={(e) => setGotoPageInput(e.target.value)}
                    className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="rounded-lg"
                  >
                    Go
                  </Button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                    Total Spent
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {formatCurrency(totals.spent)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                    Total Conversions (Actual)
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    {formatNumber(totals.conversionsActual)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-teal-700 mb-2 uppercase tracking-wide">
                    Total Leads Received
                  </p>
                  <p className="text-2xl font-bold text-teal-800">
                    {formatNumber(totals.leadsReceived)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                    Total Sale
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {formatCurrency(totals.sale)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8">
              {/* Performance by Traffic Source */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Performance by Traffic Source
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={allData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      angle={-15}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#10b981"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-900 mb-2">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-sm text-blue-600">
                                Spent: {formatCurrency(payload[0].value)}
                              </p>
                              <p className="text-sm text-emerald-600">
                                Conversions: {payload[1].value}
                              </p>
                              <p className="text-sm text-purple-600">
                                Sales: {formatCurrency(payload[2].value)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="spent"
                      name="Spent"
                      fill="#3b82f6"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="conversionsActual"
                      name="Conversions"
                      fill="#10b981"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="sale"
                      name="Sale"
                      fill="#8b5cf6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Daily Conversion Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="font-semibold text-slate-900 mb-1">
                                  {payload[0].payload.date}
                                </p>
                                <p className="text-sm text-blue-600">
                                  Conversions: {payload[0].value}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="conversions"
                        name="Conversions"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Daily ROAS Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="font-semibold text-slate-900 mb-1">
                                  {payload[0].payload.date}
                                </p>
                                <p className="text-sm text-purple-600">
                                  ROAS: {payload[0].payload.roas.toFixed(2)}x
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="roas"
                        name="ROAS"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                    Total Spent
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {formatCurrency(totals.spent)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                    Total Conversions (Actual)
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    {formatNumber(totals.conversionsActual)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-teal-700 mb-2 uppercase tracking-wide">
                    Total Leads Received
                  </p>
                  <p className="text-2xl font-bold text-teal-800">
                    {formatNumber(totals.leadsReceived)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                    Total Sale
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {formatCurrency(totals.sale)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
