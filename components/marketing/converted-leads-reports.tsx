"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatNumber } from "@/lib/marketing-vs-sales-mock"
import { ArrowUpDown, ArrowUp, ArrowDown ,BarChart3} from "lucide-react"

interface CategoryData {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  conversionAmount: number
}

interface ReportDataWithCategories {
  name: string
  direct: CategoryData
  travelAgent: CategoryData
  reference: CategoryData
  returningClient: CategoryData
}

interface ReportData {
  name: string
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  conversionAmount: number
  avgTicketSize: number
}

type SortConfig = {
  key: string | null
  direction: "asc" | "desc"
}

const convertToCategories = (baseData: ReportData[]): ReportDataWithCategories[] => {
  return baseData.map((item) => ({
    name: item.name,
    direct: {
      totalLeads: Math.round(item.totalLeads * 0.4),
      convertedLeads: Math.round(item.convertedLeads * 0.4),
      conversionRate: item.conversionRate,
      conversionAmount: Math.round(item.conversionAmount * 0.4),
    },
    travelAgent: {
      totalLeads: Math.round(item.totalLeads * 0.3),
      convertedLeads: Math.round(item.convertedLeads * 0.3),
      conversionRate: item.conversionRate,
      conversionAmount: Math.round(item.conversionAmount * 0.3),
    },
    reference: {
      totalLeads: Math.round(item.totalLeads * 0.2),
      convertedLeads: Math.round(item.convertedLeads * 0.2),
      conversionRate: item.conversionRate,
      conversionAmount: Math.round(item.conversionAmount * 0.2),
    },
    returningClient: {
      totalLeads: Math.round(item.totalLeads * 0.1),
      convertedLeads: Math.round(item.convertedLeads * 0.1),
      conversionRate: item.conversionRate,
      conversionAmount: Math.round(item.conversionAmount * 0.1),
    },
  }))
}

export function ConvertedLeadsReports() {
  const [marketType, setMarketType] = useState<"domestic" | "international">("domestic")
  const [sortConfigs, setSortConfigs] = useState<{ [key: string]: SortConfig }>({})

  const baseTreatmentData: ReportData[] = [
    {
      name: "Panchakarma Detox",
      totalLeads: 450,
      convertedLeads: 180,
      conversionRate: 40.0,
      conversionAmount: 5400000,
      avgTicketSize: 30000,
    },
    {
      name: "Rejuvenation Therapy",
      totalLeads: 380,
      convertedLeads: 152,
      conversionRate: 40.0,
      conversionAmount: 4560000,
      avgTicketSize: 30000,
    },
    {
      name: "Stress Management",
      totalLeads: 320,
      convertedLeads: 112,
      conversionRate: 35.0,
      conversionAmount: 2800000,
      avgTicketSize: 25000,
    },
    {
      name: "Weight Management",
      totalLeads: 290,
      convertedLeads: 87,
      conversionRate: 30.0,
      conversionAmount: 2175000,
      avgTicketSize: 25000,
    },
    {
      name: "Spine & Joint Care",
      totalLeads: 250,
      convertedLeads: 75,
      conversionRate: 30.0,
      conversionAmount: 1875000,
      avgTicketSize: 25000,
    },
  ]

  const baseCampaignData: ReportData[] = [
    {
      name: "Neo AHV Resort - Metro",
      totalLeads: 520,
      convertedLeads: 208,
      conversionRate: 40.0,
      conversionAmount: 6240000,
      avgTicketSize: 30000,
    },
    {
      name: "Abhyangam and Panchkarma",
      totalLeads: 410,
      convertedLeads: 164,
      conversionRate: 40.0,
      conversionAmount: 4920000,
      avgTicketSize: 30000,
    },
    {
      name: "Neo Monsoon Offer",
      totalLeads: 350,
      convertedLeads: 105,
      conversionRate: 30.0,
      conversionAmount: 2625000,
      avgTicketSize: 25000,
    },
    {
      name: "Health and Wellness",
      totalLeads: 300,
      convertedLeads: 90,
      conversionRate: 30.0,
      conversionAmount: 2250000,
      avgTicketSize: 25000,
    },
    {
      name: "Ayurveda Wellness Retreat",
      totalLeads: 280,
      convertedLeads: 98,
      conversionRate: 35.0,
      conversionAmount: 2450000,
      avgTicketSize: 25000,
    },
  ]

  const baseGenderData: ReportData[] = [
    {
      name: "Female",
      totalLeads: 980,
      convertedLeads: 392,
      conversionRate: 40.0,
      conversionAmount: 11760000,
      avgTicketSize: 30000,
    },
    {
      name: "Male",
      totalLeads: 850,
      convertedLeads: 255,
      conversionRate: 30.0,
      conversionAmount: 6375000,
      avgTicketSize: 25000,
    },
    {
      name: "Other",
      totalLeads: 60,
      convertedLeads: 18,
      conversionRate: 30.0,
      conversionAmount: 450000,
      avgTicketSize: 25000,
    },
  ]

  const baseOccupancyData: ReportData[] = [
    {
      name: "Single Occupancy",
      totalLeads: 720,
      convertedLeads: 288,
      conversionRate: 40.0,
      conversionAmount: 10080000,
      avgTicketSize: 35000,
    },
    {
      name: "Double Occupancy",
      totalLeads: 890,
      convertedLeads: 267,
      conversionRate: 30.0,
      conversionAmount: 6675000,
      avgTicketSize: 25000,
    },
    {
      name: "Triple Occupancy",
      totalLeads: 280,
      convertedLeads: 84,
      conversionRate: 30.0,
      conversionAmount: 1680000,
      avgTicketSize: 20000,
    },
  ]

  const baseCityData: ReportData[] = [
    {
      name: "Mumbai",
      totalLeads: 380,
      convertedLeads: 152,
      conversionRate: 40.0,
      conversionAmount: 4560000,
      avgTicketSize: 30000,
    },
    {
      name: "Delhi",
      totalLeads: 350,
      convertedLeads: 140,
      conversionRate: 40.0,
      conversionAmount: 4200000,
      avgTicketSize: 30000,
    },
    {
      name: "Bangalore",
      totalLeads: 320,
      convertedLeads: 128,
      conversionRate: 40.0,
      conversionAmount: 3840000,
      avgTicketSize: 30000,
    },
    {
      name: "Hyderabad",
      totalLeads: 280,
      convertedLeads: 84,
      conversionRate: 30.0,
      conversionAmount: 2100000,
      avgTicketSize: 25000,
    },
    {
      name: "Chennai",
      totalLeads: 260,
      convertedLeads: 78,
      conversionRate: 30.0,
      conversionAmount: 1950000,
      avgTicketSize: 25000,
    },
  ]

  const baseStateData: ReportData[] = [
    {
      name: "Maharashtra",
      totalLeads: 450,
      convertedLeads: 180,
      conversionRate: 40.0,
      conversionAmount: 5400000,
      avgTicketSize: 30000,
    },
    {
      name: "Karnataka",
      totalLeads: 380,
      convertedLeads: 152,
      conversionRate: 40.0,
      conversionAmount: 4560000,
      avgTicketSize: 30000,
    },
    {
      name: "Delhi NCR",
      totalLeads: 350,
      convertedLeads: 140,
      conversionRate: 40.0,
      conversionAmount: 4200000,
      avgTicketSize: 30000,
    },
    {
      name: "Tamil Nadu",
      totalLeads: 320,
      convertedLeads: 96,
      conversionRate: 30.0,
      conversionAmount: 2400000,
      avgTicketSize: 25000,
    },
    {
      name: "Telangana",
      totalLeads: 290,
      convertedLeads: 87,
      conversionRate: 30.0,
      conversionAmount: 2175000,
      avgTicketSize: 25000,
    },
  ]

  const baseCountryData: ReportData[] = [
    {
      name: "India",
      totalLeads: 1450,
      convertedLeads: 580,
      conversionRate: 40.0,
      conversionAmount: 17400000,
      avgTicketSize: 30000,
    },
    {
      name: "USA",
      totalLeads: 180,
      convertedLeads: 54,
      conversionRate: 30.0,
      conversionAmount: 2700000,
      avgTicketSize: 50000,
    },
    {
      name: "UK",
      totalLeads: 120,
      convertedLeads: 36,
      conversionRate: 30.0,
      conversionAmount: 1800000,
      avgTicketSize: 50000,
    },
    {
      name: "Germany",
      totalLeads: 90,
      convertedLeads: 27,
      conversionRate: 30.0,
      conversionAmount: 1350000,
      avgTicketSize: 50000,
    },
    {
      name: "Australia",
      totalLeads: 50,
      convertedLeads: 15,
      conversionRate: 30.0,
      conversionAmount: 750000,
      avgTicketSize: 50000,
    },
  ]

  const treatmentData = convertToCategories(baseTreatmentData)
  const campaignData = convertToCategories(baseCampaignData)
  const genderData = convertToCategories(baseGenderData)
  const occupancyData = convertToCategories(baseOccupancyData)
  const cityData = convertToCategories(baseCityData)
  const stateData = convertToCategories(baseStateData)
  const countryData = convertToCategories(baseCountryData)

  const generalData: ReportData[] = [
    {
      name: "Direct",
      totalLeads: 680,
      convertedLeads: 272,
      conversionRate: 40.0,
      conversionAmount: 8160000,
      avgTicketSize: 30000,
    },
    {
      name: "Travel Agent",
      totalLeads: 520,
      convertedLeads: 182,
      conversionRate: 35.0,
      conversionAmount: 4550000,
      avgTicketSize: 25000,
    },
    {
      name: "Reference",
      totalLeads: 420,
      convertedLeads: 168,
      conversionRate: 40.0,
      conversionAmount: 5040000,
      avgTicketSize: 30000,
    },
    {
      name: "Returning Client",
      totalLeads: 270,
      convertedLeads: 108,
      conversionRate: 40.0,
      conversionAmount: 3780000,
      avgTicketSize: 35000,
    },
  ]

  const handleSort = (reportKey: string, key: string) => {
    const currentConfig = sortConfigs[reportKey] || { key: null, direction: "asc" }
    let direction: "asc" | "desc" = "asc"

    if (currentConfig.key === key && currentConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfigs({
      ...sortConfigs,
      [reportKey]: { key, direction },
    })
  }

  const getSortedCategoryData = (data: ReportDataWithCategories[], reportKey: string) => {
    const config = sortConfigs[reportKey]
    if (!config || !config.key) return data
    const sortKey = config.key

    return [...data].sort((a, b) => {
      if (sortKey === "name") {
        return config.direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }

      // For category-specific sorting
      const [category, field] = sortKey.split(".")
      if (!category || !field) return 0
      const categoryKey = category as keyof Omit<ReportDataWithCategories, "name">
      const fieldKey = field as keyof CategoryData

      const aValue = a[categoryKey][fieldKey]
      const bValue = b[categoryKey][fieldKey]

      if (aValue < bValue) {
        return config.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return config.direction === "asc" ? 1 : -1
      }
      return 0
    })
  }

  const getSortedData = (data: ReportData[], reportKey: string) => {
    const config = sortConfigs[reportKey]
    if (!config || !config.key) return data
    const sortKey = config.key

    return [...data].sort((a, b) => {
      const key = sortKey as keyof ReportData
      const aValue = a[key]
      const bValue = b[key]

      if (aValue < bValue) {
        return config.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return config.direction === "asc" ? 1 : -1
      }
      return 0
    })
  }

  const renderSortIcon = (reportKey: string, columnKey: string) => {
    const config = sortConfigs[reportKey]
    if (!config || config.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 inline-block opacity-50" />
    }
    return config.direction === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline-block" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline-block" />
    )
  }

  const renderCategoryTable = (data: ReportDataWithCategories[], title: string, reportKey: string) => {
    const sortedData = getSortedCategoryData(data, reportKey)

    // Calculate grand totals
    const grandTotals = {
      direct: {
        totalLeads: data.reduce((sum, row) => sum + row.direct.totalLeads, 0),
        convertedLeads: data.reduce((sum, row) => sum + row.direct.convertedLeads, 0),
        conversionAmount: data.reduce((sum, row) => sum + row.direct.conversionAmount, 0),
      },
      travelAgent: {
        totalLeads: data.reduce((sum, row) => sum + row.travelAgent.totalLeads, 0),
        convertedLeads: data.reduce((sum, row) => sum + row.travelAgent.convertedLeads, 0),
        conversionAmount: data.reduce((sum, row) => sum + row.travelAgent.conversionAmount, 0),
      },
      reference: {
        totalLeads: data.reduce((sum, row) => sum + row.reference.totalLeads, 0),
        convertedLeads: data.reduce((sum, row) => sum + row.reference.convertedLeads, 0),
        conversionAmount: data.reduce((sum, row) => sum + row.reference.conversionAmount, 0),
      },
      returningClient: {
        totalLeads: data.reduce((sum, row) => sum + row.returningClient.totalLeads, 0),
        convertedLeads: data.reduce((sum, row) => sum + row.returningClient.convertedLeads, 0),
        conversionAmount: data.reduce((sum, row) => sum + row.returningClient.conversionAmount, 0),
      },
    }

    return (
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">{title}</CardTitle>
            <div className="flex gap-2">
              <Badge
                variant={marketType === "domestic" ? "default" : "outline"}
                className={`cursor-pointer ${marketType === "domestic"
                  ? "bg-[#2f6b4f] hover:bg-[#2f6b4f]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
                  }`}
                onClick={() => setMarketType("domestic")}
              >
                Domestic
              </Badge>
              <Badge
                variant={marketType === "international" ? "default" : "outline"}
                className={`cursor-pointer ${marketType === "international"
                  ? "bg-[#b6864a] hover:bg-[#b6864a]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#b6864a]/10"
                  }`}
                onClick={() => setMarketType("international")}
              >
                International
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8faf9] hover:bg-[#f8faf9]">
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-[#1f2a2e] cursor-pointer hover:bg-[#e8f0ed] align-middle border-r"
                    onClick={() => handleSort(reportKey, "name")}
                  >
                    {title.split(" ")[0]}
                    {renderSortIcon(reportKey, "name")}
                  </TableHead>
                  <TableHead colSpan={4} className="font-semibold text-[#1f2a2e] text-center border-r bg-blue-50">
                    Direct
                  </TableHead>
                  <TableHead colSpan={4} className="font-semibold text-[#1f2a2e] text-center border-r bg-green-50">
                    Travel Agent
                  </TableHead>
                  <TableHead colSpan={4} className="font-semibold text-[#1f2a2e] text-center border-r bg-purple-50">
                    Reference
                  </TableHead>
                  <TableHead colSpan={4} className="font-semibold text-[#1f2a2e] text-center bg-orange-50">
                    Returning Client
                  </TableHead>
                </TableRow>
                <TableRow className="bg-[#f8faf9] hover:bg-[#f8faf9]">
                  {/* Direct columns */}
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-blue-50"
                    onClick={() => handleSort(reportKey, "direct.totalLeads")}
                  >
                    Total Leads{renderSortIcon(reportKey, "direct.totalLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-blue-50"
                    onClick={() => handleSort(reportKey, "direct.convertedLeads")}
                  >
                    Converted{renderSortIcon(reportKey, "direct.convertedLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-blue-50"
                    onClick={() => handleSort(reportKey, "direct.conversionRate")}
                  >
                    Conv %{renderSortIcon(reportKey, "direct.conversionRate")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] border-r bg-blue-50"
                    onClick={() => handleSort(reportKey, "direct.conversionAmount")}
                  >
                    Conv Amount{renderSortIcon(reportKey, "direct.conversionAmount")}
                  </TableHead>

                  {/* Travel Agent columns */}
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-green-50"
                    onClick={() => handleSort(reportKey, "travelAgent.totalLeads")}
                  >
                    Total Leads{renderSortIcon(reportKey, "travelAgent.totalLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-green-50"
                    onClick={() => handleSort(reportKey, "travelAgent.convertedLeads")}
                  >
                    Converted{renderSortIcon(reportKey, "travelAgent.convertedLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-green-50"
                    onClick={() => handleSort(reportKey, "travelAgent.conversionRate")}
                  >
                    Conv %{renderSortIcon(reportKey, "travelAgent.conversionRate")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] border-r bg-green-50"
                    onClick={() => handleSort(reportKey, "travelAgent.conversionAmount")}
                  >
                    Conv Amount{renderSortIcon(reportKey, "travelAgent.conversionAmount")}
                  </TableHead>

                  {/* Reference columns */}
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-purple-50"
                    onClick={() => handleSort(reportKey, "reference.totalLeads")}
                  >
                    Total Leads{renderSortIcon(reportKey, "reference.totalLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-purple-50"
                    onClick={() => handleSort(reportKey, "reference.convertedLeads")}
                  >
                    Converted{renderSortIcon(reportKey, "reference.convertedLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-purple-50"
                    onClick={() => handleSort(reportKey, "reference.conversionRate")}
                  >
                    Conv %{renderSortIcon(reportKey, "reference.conversionRate")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] border-r bg-purple-50"
                    onClick={() => handleSort(reportKey, "reference.conversionAmount")}
                  >
                    Conv Amount{renderSortIcon(reportKey, "reference.conversionAmount")}
                  </TableHead>

                  {/* Returning Client columns */}
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-orange-50"
                    onClick={() => handleSort(reportKey, "returningClient.totalLeads")}
                  >
                    Total Leads{renderSortIcon(reportKey, "returningClient.totalLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-orange-50"
                    onClick={() => handleSort(reportKey, "returningClient.convertedLeads")}
                  >
                    Converted{renderSortIcon(reportKey, "returningClient.convertedLeads")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] bg-orange-50"
                    onClick={() => handleSort(reportKey, "returningClient.conversionRate")}
                  >
                    Conv %{renderSortIcon(reportKey, "returningClient.conversionRate")}
                  </TableHead>
                  <TableHead
                    className="font-medium text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed] border-r bg-orange-50"
                    onClick={() => handleSort(reportKey, "returningClient.conversionAmount")}
                  >
                    Conv Amount{renderSortIcon(reportKey, "returningClient.conversionAmount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-[#f8faf9]">
                    <TableCell className="font-medium text-[#1f2a2e] border-r">{row.name}</TableCell>

                    {/* Direct data */}
                    <TableCell className="text-right text-[#475569] bg-blue-50/30">
                      {formatNumber(row.direct.totalLeads)}
                    </TableCell>
                    <TableCell className="text-right bg-blue-50/30">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {formatNumber(row.direct.convertedLeads)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right bg-blue-50/30">
                      <Badge
                        variant="secondary"
                        className={
                          row.direct.conversionRate >= 40
                            ? "bg-green-100 text-green-800"
                            : row.direct.conversionRate >= 30
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {row.direct.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-purple-600 border-r bg-blue-50/30">
                      {formatCurrency(row.direct.conversionAmount)}
                    </TableCell>

                    {/* Travel Agent data */}
                    <TableCell className="text-right text-[#475569] bg-green-50/30">
                      {formatNumber(row.travelAgent.totalLeads)}
                    </TableCell>
                    <TableCell className="text-right bg-green-50/30">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {formatNumber(row.travelAgent.convertedLeads)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right bg-green-50/30">
                      <Badge
                        variant="secondary"
                        className={
                          row.travelAgent.conversionRate >= 40
                            ? "bg-green-100 text-green-800"
                            : row.travelAgent.conversionRate >= 30
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {row.travelAgent.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-purple-600 border-r bg-green-50/30">
                      {formatCurrency(row.travelAgent.conversionAmount)}
                    </TableCell>

                    {/* Reference data */}
                    <TableCell className="text-right text-[#475569] bg-purple-50/30">
                      {formatNumber(row.reference.totalLeads)}
                    </TableCell>
                    <TableCell className="text-right bg-purple-50/30">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {formatNumber(row.reference.convertedLeads)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right bg-purple-50/30">
                      <Badge
                        variant="secondary"
                        className={
                          row.reference.conversionRate >= 40
                            ? "bg-green-100 text-green-800"
                            : row.reference.conversionRate >= 30
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {row.reference.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-purple-600 border-r bg-purple-50/30">
                      {formatCurrency(row.reference.conversionAmount)}
                    </TableCell>

                    {/* Returning Client data */}
                    <TableCell className="text-right text-[#475569] bg-orange-50/30">
                      {formatNumber(row.returningClient.totalLeads)}
                    </TableCell>
                    <TableCell className="text-right bg-orange-50/30">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {formatNumber(row.returningClient.convertedLeads)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right bg-orange-50/30">
                      <Badge
                        variant="secondary"
                        className={
                          row.returningClient.conversionRate >= 40
                            ? "bg-green-100 text-green-800"
                            : row.returningClient.conversionRate >= 30
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {row.returningClient.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-purple-600 bg-orange-50/30">
                      {formatCurrency(row.returningClient.conversionAmount)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Grand Total Row */}
                <TableRow className="bg-gray-100 font-bold hover:bg-gray-100">
                  <TableCell className="text-[#1f2a2e] border-r">Grand Total</TableCell>

                  {/* Direct totals */}
                  <TableCell className="text-right text-[#1f2a2e] bg-blue-50">
                    {formatNumber(grandTotals.direct.totalLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-blue-50">
                    {formatNumber(grandTotals.direct.convertedLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-blue-50">
                    {((grandTotals.direct.convertedLeads / grandTotals.direct.totalLeads) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] border-r bg-blue-50">
                    {formatCurrency(grandTotals.direct.conversionAmount)}
                  </TableCell>

                  {/* Travel Agent totals */}
                  <TableCell className="text-right text-[#1f2a2e] bg-green-50">
                    {formatNumber(grandTotals.travelAgent.totalLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-green-50">
                    {formatNumber(grandTotals.travelAgent.convertedLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-green-50">
                    {((grandTotals.travelAgent.convertedLeads / grandTotals.travelAgent.totalLeads) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] border-r bg-green-50">
                    {formatCurrency(grandTotals.travelAgent.conversionAmount)}
                  </TableCell>

                  {/* Reference totals */}
                  <TableCell className="text-right text-[#1f2a2e] bg-purple-50">
                    {formatNumber(grandTotals.reference.totalLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-purple-50">
                    {formatNumber(grandTotals.reference.convertedLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-purple-50">
                    {((grandTotals.reference.convertedLeads / grandTotals.reference.totalLeads) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] border-r bg-purple-50">
                    {formatCurrency(grandTotals.reference.conversionAmount)}
                  </TableCell>

                  {/* Returning Client totals */}
                  <TableCell className="text-right text-[#1f2a2e] bg-orange-50">
                    {formatNumber(grandTotals.returningClient.totalLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-orange-50">
                    {formatNumber(grandTotals.returningClient.convertedLeads)}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-orange-50">
                    {(
                      (grandTotals.returningClient.convertedLeads / grandTotals.returningClient.totalLeads) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e] bg-orange-50">
                    {formatCurrency(grandTotals.returningClient.conversionAmount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderReportTable = (data: ReportData[], title: string, reportKey: string) => {
    const sortedData = getSortedData(data, reportKey)

    return (
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">{title}</CardTitle>
            <div className="flex gap-2">
              <Badge
                variant={marketType === "domestic" ? "default" : "outline"}
                className={`cursor-pointer ${marketType === "domestic"
                  ? "bg-[#2f6b4f] hover:bg-[#2f6b4f]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
                  }`}
                onClick={() => setMarketType("domestic")}
              >
                Domestic
              </Badge>
              <Badge
                variant={marketType === "international" ? "default" : "outline"}
                className={`cursor-pointer ${marketType === "international"
                  ? "bg-[#b6864a] hover:bg-[#b6864a]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#b6864a]/10"
                  }`}
                onClick={() => setMarketType("international")}
              >
                International
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8faf9] hover:bg-[#f8faf9]">
                  <TableHead
                    className="font-semibold text-[#1f2a2e] cursor-pointer hover:bg-[#e8f0ed]"
                    onClick={() => handleSort(reportKey, "name")}
                  >
                    {title.split(" ")[0]}
                    {renderSortIcon(reportKey, "name")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed]"
                    onClick={() => handleSort(reportKey, "totalLeads")}
                  >
                    Total Leads
                    {renderSortIcon(reportKey, "totalLeads")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed]"
                    onClick={() => handleSort(reportKey, "convertedLeads")}
                  >
                    Converted
                    {renderSortIcon(reportKey, "convertedLeads")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed]"
                    onClick={() => handleSort(reportKey, "conversionRate")}
                  >
                    Conv. Rate
                    {renderSortIcon(reportKey, "conversionRate")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed]"
                    onClick={() => handleSort(reportKey, "conversionAmount")}
                  >
                    Conv. Amount
                    {renderSortIcon(reportKey, "conversionAmount")}
                  </TableHead>
                  <TableHead
                    className="font-semibold text-[#1f2a2e] text-right cursor-pointer hover:bg-[#e8f0ed]"
                    onClick={() => handleSort(reportKey, "avgTicketSize")}
                  >
                    Avg Ticket
                    {renderSortIcon(reportKey, "avgTicketSize")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-[#f8faf9]">
                    <TableCell className="font-medium text-[#1f2a2e]">{row.name}</TableCell>
                    <TableCell className="text-right text-[#475569]">{formatNumber(row.totalLeads)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {formatNumber(row.convertedLeads)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          row.conversionRate >= 40
                            ? "bg-green-100 text-green-800"
                            : row.conversionRate >= 30
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {row.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-purple-600">
                      {formatCurrency(row.conversionAmount)}
                    </TableCell>
                    <TableCell className="text-right text-[#475569]">{formatCurrency(row.avgTicketSize)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-100 font-bold hover:bg-gray-100">
                  <TableCell className="text-[#1f2a2e]">Grand Total</TableCell>
                  <TableCell className="text-right text-[#1f2a2e]">
                    {formatNumber(data.reduce((sum, row) => sum + row.totalLeads, 0))}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e]">
                    {formatNumber(data.reduce((sum, row) => sum + row.convertedLeads, 0))}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e]">
                    {(
                      (data.reduce((sum, row) => sum + row.convertedLeads, 0) /
                        data.reduce((sum, row) => sum + row.totalLeads, 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e]">
                    {formatCurrency(data.reduce((sum, row) => sum + row.conversionAmount, 0))}
                  </TableCell>
                  <TableCell className="text-right text-[#1f2a2e]">
                    {formatCurrency(
                      data.reduce((sum, row) => sum + row.conversionAmount, 0) /
                      data.reduce((sum, row) => sum + row.convertedLeads, 0),
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="w-full mt-6 mb-6 sm:mt-8 sm:mb-8 rounded-2xl border-2 border-slate-300 bg-white shadow-lg overflow-hidden space-y-6 sm:space-y-8">

      {/* ===== HEADER (SAME AS TRAFFIC SOURCE) ===== */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                Converted Leads Analysis Reports (All Types)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Comprehensive breakdown of converted leads across all categories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABS  ===== */}
      <Tabs defaultValue="offline" className="w-full rounded-xl border border-slate-200 bg-white p-4">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="offline" className="text-sm sm:text-base">
            Offline Reports
          </TabsTrigger>
          <TabsTrigger value="online" className="text-sm sm:text-base">
            Online Reports
          </TabsTrigger>
        </TabsList>


        <TabsContent value="offline" className="space-y-6">
          {renderReportTable(generalData, "General wise Converted Leads", "offline-general")}
          {renderCategoryTable(treatmentData, "Treatment wise Converted Leads", "offline-treatment")}
          {renderCategoryTable(campaignData, "Campaign wise Converted Leads", "offline-campaign")}
          {renderCategoryTable(genderData, "Gender wise Converted Leads", "offline-gender")}
          {renderCategoryTable(occupancyData, "Occupancy wise Converted Leads", "offline-occupancy")}
          {renderCategoryTable(cityData, "City wise Converted Leads", "offline-city")}
          {renderCategoryTable(stateData, "State wise Converted Leads", "offline-state")}
          {renderCategoryTable(countryData, "Country wise Converted Leads", "offline-country")}
        </TabsContent>

        <TabsContent value="online" className="space-y-6">
          {renderReportTable(generalData, "Online General wise Converted Leads", "online-general")}
          {renderCategoryTable(treatmentData, "Online Treatment wise Converted Leads", "online-treatment")}
          {renderCategoryTable(genderData, "Online Gender wise Converted Leads", "online-gender")}
          {renderCategoryTable(occupancyData, "Online Occupancy wise Converted Leads", "online-occupancy")}
          {renderCategoryTable(cityData, "Online City wise Converted Leads", "online-city")}
          {renderCategoryTable(stateData, "Online State wise Converted Leads", "online-state")}
          {renderCategoryTable(countryData, "Online Country wise Converted Leads", "online-country")}
        </TabsContent>
      </Tabs>
    </section>
  )
}
