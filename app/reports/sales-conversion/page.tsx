"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAnalytics } from "@/hooks/use-analytics"
import { ArrowDown } from "lucide-react"
import {
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"

export default function SalesConversionReportPage() {
  const { data, loading } = useAnalytics()
  const [filters, setFilters] = useState({
    dateRange: "last30days",
    employee: "all",
    company: "all",
  })

  const salesConversionData = useMemo(
    () => ({
      overview: {
        uniqueLeadReceived: 15420,
        conversionCount: 3284,
        salesAmount: 198, // in millions
        avgConversionAmount: 60.3, // in thousands
        conversionPercentage: 21.3,
        conversionTAT: 14, // days
        roas: 4.2,
      },
      monthlyTrends: [
        { month: "Jan", quantitySold: 28000, salesAmount: 15.2, profit: 4.1 },
        { month: "Feb", quantitySold: 32000, salesAmount: 17.8, profit: 4.8 },
        { month: "Mar", quantitySold: 35000, salesAmount: 19.5, profit: 5.3 },
        { month: "Apr", quantitySold: 31000, salesAmount: 16.9, profit: 4.6 },
        { month: "May", quantitySold: 38000, salesAmount: 21.2, profit: 5.7 },
        { month: "Jun", quantitySold: 42000, salesAmount: 23.1, profit: 6.2 },
        { month: "Jul", quantitySold: 39000, salesAmount: 20.8, profit: 5.6 },
        { month: "Aug", quantitySold: 36000, salesAmount: 18.9, profit: 5.1 },
        { month: "Sep", quantitySold: 41000, salesAmount: 22.4, profit: 6.0 },
        { month: "Oct", quantitySold: 44000, salesAmount: 24.6, profit: 6.6 },
        { month: "Nov", quantitySold: 46000, salesAmount: 25.8, profit: 6.9 },
        { month: "Dec", quantitySold: 41000, salesAmount: 21.8, profit: 5.9 },
      ],
      salesManagerPerformance: [
        { month: "January", planned: 2100000, actual: 1000000, gap: -52.2 },
        { month: "February", planned: 1950000, actual: 275000, gap: -85.9 },
        { month: "March", planned: 2500000, actual: 140000, gap: -94.4 },
        { month: "April", planned: 2000000, actual: 188000, gap: -90.6 },
        { month: "May", planned: 1950000, actual: 175000, gap: -91.0 },
        { month: "June", planned: 2500000, actual: 200000, gap: -92.0 },
        { month: "July", planned: 2000000, actual: 102000, gap: -94.9 },
        { month: "August", planned: 1550000, actual: 150000, gap: -90.3 },
      ],
      productPerformance: [
        { name: "Product A", value: 30, profit: 15 },
        { name: "Product B", value: 25, profit: 12 },
        { name: "Product C", value: 20, profit: 10 },
        { name: "Product D", value: 15, profit: 8 },
        { name: "Product E", value: 10, profit: 5 },
      ],
      countryPerformance: [
        { country: "Australia", sales: 44, profit: 28, coordinates: [133.7751, -25.2744] },
        { country: "Canada", sales: 42, profit: 27, coordinates: [-106.3468, 56.1304] },
        { country: "New Zealand", sales: 40, profit: 26, coordinates: [174.886, -40.9006] },
        { country: "UK", sales: 36, profit: 24, coordinates: [-3.436, 55.3781] },
        { country: "USA", sales: 38, profit: 27, coordinates: [-95.7129, 37.0902] },
      ],
      sourcePerformance: [
        { source: "Website", leads: 1250, conversions: 312, conversionRate: 25, revenue: 45.2, roas: 4.8 },
        { source: "Social Media", leads: 980, conversions: 235, conversionRate: 24, revenue: 38.7, roas: 4.2 },
        { source: "Referrals", leads: 750, conversions: 195, conversionRate: 26, revenue: 32.1, roas: 5.1 },
        { source: "Email Marketing", leads: 650, conversions: 143, conversionRate: 22, revenue: 28.5, roas: 3.9 },
        { source: "Google Ads", leads: 850, conversions: 170, conversionRate: 20, revenue: 25.8, roas: 3.2 },
        { source: "Direct", leads: 420, conversions: 105, conversionRate: 25, revenue: 18.3, roas: 4.5 },
      ],
      facebookCampaigns: [
        {
          campaign: "Brand Awareness Q4",
          impressions: 125000,
          clicks: 3250,
          conversions: 285,
          spend: 8500,
          revenue: 42300,
          roas: 4.98,
        },
        {
          campaign: "Product Launch",
          impressions: 98000,
          clicks: 2890,
          conversions: 198,
          spend: 6200,
          revenue: 28900,
          roas: 4.66,
        },
        {
          campaign: "Holiday Special",
          impressions: 156000,
          clicks: 4120,
          conversions: 342,
          spend: 9800,
          revenue: 51200,
          roas: 5.22,
        },
        {
          campaign: "Retargeting Campaign",
          impressions: 67000,
          clicks: 1850,
          conversions: 156,
          spend: 4200,
          revenue: 22100,
          roas: 5.26,
        },
      ],
      googleAdsCampaigns: [
        {
          campaign: "Search - Brand Terms",
          impressions: 89000,
          clicks: 2650,
          conversions: 298,
          spend: 7200,
          revenue: 38900,
          roas: 5.4,
        },
        {
          campaign: "Display - Remarketing",
          impressions: 145000,
          clicks: 3890,
          conversions: 245,
          spend: 8900,
          revenue: 35600,
          roas: 4.0,
        },
        {
          campaign: "Shopping Ads",
          impressions: 78000,
          clicks: 2340,
          conversions: 189,
          spend: 5600,
          revenue: 28700,
          roas: 5.13,
        },
        {
          campaign: "YouTube Ads",
          impressions: 234000,
          clicks: 4560,
          conversions: 312,
          spend: 12400,
          revenue: 45800,
          roas: 3.69,
        },
      ],
      salesPipeline: [
        { stage: "Presentation", percentage: 21.8, color: "#8B5CF6" },
        { stage: "Qualified", percentage: 19.75, color: "#06B6D4" },
        { stage: "Negotiation", percentage: 18.98, color: "#3B82F6" },
        { stage: "Won", percentage: 17.67, color: "#EC4899" },
        { stage: "Lost", percentage: 15.26, color: "#6B21A8" },
        { stage: "Final", percentage: 6.55, color: "#EF4444" },
      ],
      filterOptions: {
        products: ["Vasarishtam", "Yograj Guggulu", "yuvan tea", "spa rub", "herbal soap"],
        countries: ["Australia", "Canada", "New Zealand", "UK", "USA"],
        salesManagers: ["Emily White", "James Brown", "Jane Doe", "John Smith", "Liam Lee"],
        years: ["2019", "2020", "2021", "2022", "2023"],
        months: ["Jan-19", "Feb-19", "Mar-19", "Apr-19", "May-19", "Jun-19", "Jul-19", "Aug-19", "Sep-19", "Oct-19"],
        sources: [
          "IVR",
          "Facebook",
          "Others",
          "PriyaSharma AI-WhatsApp",
          "PriyaSharma AI-Web",
          "Google",
          "Website",
          "Site Exit Pop-Up Reference",
          "PriyaSharma AI-Instagram",
          "Magento Failure Order",
          "PriyaSharma AI Chat",
          "Referral",
          "Zopim",
          "OTA",
          "Online Booking Engine",
          "Management",
          "PriyaSharma AI-Facebook",
        ],
        employees: [
          "Sadik Rehman",
          "Pawan Kamra",
          "Pushpanshu Kumar",
          "Harpal Singh",
          "Puneet Endlay",
          "Sana Albi",
          "Vidisha Bahukhandi",
          "Zaki Ahmed",
        ],
        companies: ["KTAHV", "KAPPL", "VILLARAAG"],
        facebookCampaigns: [
          "Neo AHV Resort - Metro",
          "Abhyangam and Panchkarma - Metro and Submetro Cities",
          "Neo Monsoon Offer - 20th july'24",
          "Health and Wellness - Metro and Submetro Cities",
          "Ayurveda and Wellness Retreat",
          "Kairali Offers- Worldwide",
          "Rejuvenation and Detoxification Treatment",
          "Health and Wellness - Metro and Submetro Cities – Copy",
        ],
        googleCampaigns: [
          "ayurvedic+treatment+kerala",
          "kairali+ahv",
          "ayurveda+resort-OV",
          "utm_content",
          "germany",
          "ayurvedic+treatment+india",
          "rejuvnation+packages",
          "ayurvedic%2Btreatment%2Bkerala",
        ],
      },
    }),
    [],
  )

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const FunnelChart = ({ data }: { data: any[] }) => {
    const maxWidth = 300
    const maxCount = Math.max(...data.map((d) => d.count))

    return (
      <div className="flex flex-col items-center space-y-1 py-4">
        {data.map((stage, index) => {
          const width = (stage.count / maxCount) * maxWidth
          const isLast = index === data.length - 1

          return (
            <div key={stage.stage} className="flex flex-col items-center">
              <div
                className="relative flex items-center justify-between px-4 py-3 text-white font-medium text-sm"
                style={{
                  backgroundColor: stage.color,
                  width: `${width}px`,
                  clipPath: isLast
                    ? "polygon(0 0, 100% 0, 90% 100%, 10% 100%)"
                    : "polygon(0 0, 100% 0, 95% 100%, 5% 100%)",
                  minWidth: "120px",
                }}
              >
                <span>{stage.stage}</span>
                <span>{stage.percentage}%</span>
              </div>
            </div>
          )
        })}

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
          {data.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: stage.color }} />
              <span className="text-gray-600">{stage.stage}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const WorldMapVisualization = ({ data }: { data: any[] }) => {
    return (
      <div className="relative">
        {/* Enhanced world map representation */}
        <div className="bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg p-4 h-80 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 1000 500" className="w-full h-full">
              {/* More detailed world continents */}
              {/* North America */}
              <path
                d="M50,80 L200,60 L250,100 L280,140 L220,180 L150,160 L80,120 Z"
                fill="#94A3B8"
                className="hover:fill-blue-400 transition-colors cursor-pointer"
              />
              {/* South America */}
              <path
                d="M180,200 L250,190 L280,250 L260,320 L200,340 L160,280 Z"
                fill="#94A3B8"
                className="hover:fill-blue-400 transition-colors cursor-pointer"
              />
              {/* Europe */}
              <path
                d="M400,80 L500,70 L520,110 L480,140 L420,130 Z"
                fill="#94A3B8"
                className="hover:fill-blue-400 transition-colors cursor-pointer"
              />
              {/* Africa */}
              <path
                d="M420,150 L520,140 L550,200 L540,280 L480,300 L430,250 Z"
                fill="#94A3B8"
                className="hover:fill-blue-400 transition-colors cursor-pointer"
              />
              {/* Asia */}
              <path
                d="M520,60 L750,50 L800,120 L780,180 L650,190 L550,150 Z"
                fill="#94A3B8"
                className="hover:fill-blue-400 transition-colors cursor-pointer"
              />
              {/* Australia */}
              <path
                d="M700,280 L800,270 L820,310 L780,340 L720,330 Z"
                fill="#94A3B8"
                className="hover:fill-blue-400 transition-colors cursor-pointer"
              />
            </svg>
          </div>

          {/* Country performance indicators with better positioning */}
          {data.map((country, index) => {
            const positions = {
              Australia: { left: "75%", top: "70%" },
              Canada: { left: "15%", top: "25%" },
              "New Zealand": { left: "85%", top: "75%" },
              UK: { left: "45%", top: "30%" },
              USA: { left: "20%", top: "40%" },
            }
            const position = positions[country.country as keyof typeof positions] || {
              left: `${20 + index * 15}%`,
              top: `${30 + (index % 2) * 20}%`,
            }

            return (
              <div
                key={country.country}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={position}
              >
                <div className="relative group">
                  <div
                    className="w-8 h-8 rounded-full border-3 border-white shadow-lg cursor-pointer transition-all duration-300 hover:scale-150 hover:z-10"
                    style={{
                      backgroundColor: `hsl(${200 + country.profit * 2}, 70%, 50%)`,
                    }}
                  />
                  <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                    <div className="font-semibold">{country.country}</div>
                    <div>Sales: ${country.sales}M</div>
                    <div>Profit: {country.profit}%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Country legend with better responsive design */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {data.map((country) => (
            <div
              key={country.country}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <span className="font-medium text-gray-800">{country.country}</span>
              <div className="text-right">
                <div className="text-blue-600 font-semibold">${country.sales}M</div>
                <div className="text-green-600 text-xs">{country.profit}% profit</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const ExactFunnelChart = () => {
    return (
      <div className="bg-white p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Sales Pipeline</h3>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500"></div>
            <span>Lost</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-800"></div>
            <span>Won</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-400"></div>
            <span>Negotiation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500"></div>
            <span>Qualified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400"></div>
            <span>Presentation</span>
          </div>
        </div>

        {/* Funnel */}
        <div className="flex flex-col items-center space-y-0">
          {/* Presentation - Top (widest) */}
          <div className="relative">
            <div
              className="h-12 flex items-center justify-end pr-4 text-white font-medium"
              style={{
                width: "280px",
                backgroundColor: "#8B5CF6",
                clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)",
              }}
            >
              <span className="text-sm">21.8%</span>
            </div>
          </div>

          {/* Qualified */}
          <div className="relative">
            <div
              className="h-12 flex items-center justify-end pr-4 text-white font-medium"
              style={{
                width: "260px",
                backgroundColor: "#06B6D4",
                clipPath: "polygon(0 0, 100% 0, 94% 100%, 6% 100%)",
              }}
            >
              <span className="text-sm">19.75%</span>
            </div>
          </div>

          {/* Negotiation */}
          <div className="relative">
            <div
              className="h-12 flex items-center justify-end pr-4 text-white font-medium"
              style={{
                width: "240px",
                backgroundColor: "#3B82F6",
                clipPath: "polygon(0 0, 100% 0, 93% 100%, 7% 100%)",
              }}
            >
              <span className="text-sm">18.98%</span>
            </div>
          </div>

          {/* Won */}
          <div className="relative">
            <div
              className="h-12 flex items-center justify-end pr-4 text-white font-medium"
              style={{
                width: "220px",
                backgroundColor: "#EC4899",
                clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
              }}
            >
              <span className="text-sm">17.67%</span>
            </div>
          </div>

          {/* Lost */}
          <div className="relative">
            <div
              className="h-12 flex items-center justify-end pr-4 text-white font-medium"
              style={{
                width: "200px",
                backgroundColor: "#6B21A8",
                clipPath: "polygon(0 0, 100% 0, 90% 100%, 10% 100%)",
              }}
            >
              <span className="text-sm">15.26%</span>
            </div>
          </div>

          {/* Final - Bottom (narrowest) */}
          <div className="relative">
            <div
              className="h-12 flex items-center justify-center text-white font-medium"
              style={{
                width: "120px",
                backgroundColor: "#EF4444",
                clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)",
              }}
            >
              <span className="text-sm">6.55%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const CustomSourceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Source: ${label}`}</p>
          <p className="text-blue-600">{`Total Leads: ${data.leads}`}</p>
          <p className="text-green-600">{`Conversions: ${data.conversions}`}</p>
          <p className="text-orange-600">{`Conversion Rate: ${data.conversionRate}%`}</p>
          <p className="text-purple-600">{`Revenue: $${data.revenue}M`}</p>
          <p className="text-red-600 font-semibold">{`ROAS: ${data.roas}x`}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gradient-to-br from-blue-50 to-slate-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Executive Sales Dashboard</h1>
            <p className="text-blue-100 mt-2 text-lg">Comprehensive sales performance analytics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Date Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="thisyear">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.employee} onValueChange={(value) => handleFilterChange("employee", value)}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Employee Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {salesConversionData.filterOptions.employees.map((employee) => (
                  <SelectItem key={employee} value={employee}>
                    {employee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.company} onValueChange={(value) => handleFilterChange("company", value)}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {salesConversionData.filterOptions.companies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-purple-700 mb-1">Unique Lead Received</div>
            <div className="text-2xl font-bold text-purple-900 mb-2">
              {salesConversionData.overview.uniqueLeadReceived.toLocaleString()}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">16,500</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">15,420</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">14,200</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">13,850</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-purple-300 pt-1 mt-2 bg-purple-200 rounded px-2 py-1">
                <span className="font-bold text-purple-900">Total: 15,420</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-blue-700 mb-1">Conversion Count</div>
            <div className="text-2xl font-bold text-blue-900 mb-2">
              {salesConversionData.overview.conversionCount.toLocaleString()}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">3,500</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">3,284</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">3,200</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">3,150</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-blue-300 pt-1 mt-2 bg-blue-200 rounded px-2 py-1">
                <span className="font-bold text-blue-900">Total: 3,284</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-orange-700 mb-1">Sales Amount</div>
            <div className="text-2xl font-bold text-orange-900 mb-2">${salesConversionData.overview.salesAmount}M</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">$210M</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">$198M</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">$185M</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">$180M</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-orange-300 pt-1 mt-2 bg-orange-200 rounded px-2 py-1">
                <span className="font-bold text-orange-900">Total: $198M</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-teal-700 mb-1">Avg Conversion Amount</div>
            <div className="text-2xl font-bold text-teal-900 mb-2">
              ${salesConversionData.overview.avgConversionAmount}K
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">$65K</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">$60.3K</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">$58K</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">$57.2K</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-teal-300 pt-1 mt-2 bg-teal-200 rounded px-2 py-1">
                <span className="font-bold text-teal-900">Total: $60.3K</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-green-700 mb-1">% of Conversion</div>
            <div className="text-2xl font-bold text-green-900 mb-2">
              {salesConversionData.overview.conversionPercentage}%
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">23%</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">21.3%</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">22.5%</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">22.7%</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-green-300 pt-1 mt-2 bg-green-200 rounded px-2 py-1">
                <span className="font-bold text-green-900">Total: 21.3%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-indigo-700 mb-1">Conversion TAT</div>
            <div className="text-2xl font-bold text-indigo-900 mb-2">
              {salesConversionData.overview.conversionTAT} Days
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">12 Days</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">14 Days</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">13 Days</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">13.5 Days</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-indigo-300 pt-1 mt-2 bg-indigo-200 rounded px-2 py-1">
                <span className="font-bold text-indigo-900">Total: 14 Days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-xs font-medium text-pink-700 mb-1">ROAS</div>
            <div className="text-2xl font-bold text-pink-900 mb-2">{salesConversionData.overview.roas}x</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">NBD Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-800 font-semibold">4.5x</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">NBD Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-800 font-semibold">4.2x</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">CRR Planned:</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-800 font-semibold">4.3x</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">CRR Actual:</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-800 font-semibold">4.1x</span>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="border-t border-pink-300 pt-1 mt-2 bg-pink-200 rounded px-2 py-1">
                <span className="font-bold text-pink-900">Total: 4.2x</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Filter Panel - Better responsive behavior */}
        <div className="xl:col-span-2 order-2 xl:order-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Product Name</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesConversionData.filterOptions.products.map((product) => (
                  <div
                    key={product}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {product}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Country</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesConversionData.filterOptions.countries.map((country) => (
                  <div
                    key={country}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {country}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Sales Manager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesConversionData.filterOptions.salesManagers.map((manager) => (
                  <div
                    key={manager}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {manager}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                {salesConversionData.filterOptions.sources.map((source) => (
                  <div
                    key={source}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors break-words"
                  >
                    {source}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Charts Area - Better responsive layout */}
        <div className="xl:col-span-8 order-1 xl:order-2 space-y-4 lg:space-y-6">
          {/* Sales Quantity and Amount Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg font-semibold">Sales Quantity and Amount Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <ComposedChart data={salesConversionData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quantitySold" fill="#0088FE" name="Quantity Sold" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="salesAmount"
                    stroke="#FF8042"
                    strokeWidth={3}
                    name="Sales (Mn)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sales Summary by Sales Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg font-semibold text-center">
                Sales Performance Monthly (Planned vs Actual)
              </CardTitle>
              <div className="flex flex-wrap justify-center gap-3 lg:gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500"></div>
                  <span className="text-xs sm:text-sm">Planned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500"></div>
                  <span className="text-xs sm:text-sm">Green</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500"></div>
                  <span className="text-xs sm:text-sm">Actual</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                <ComposedChart
                  data={salesConversionData.salesManagerPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${(value as number).toLocaleString()}`,
                      name === "planned" ? "Planned" : "Actual",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="planned" fill="#3B82F6" name="planned" barSize={40} />
                  <Bar dataKey="actual" fill="#EF4444" name="actual" barSize={40} />
                </ComposedChart>
              </ResponsiveContainer>

              <div className="relative -mt-6 sm:-mt-8">
                <div className="flex justify-around items-end h-6 sm:h-8">
                  {salesConversionData.salesManagerPerformance.map((data, index) => (
                    <div key={index} className="text-red-500 font-semibold text-xs">
                      {data.gap}%
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source wise Performance Analysis */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base lg:text-lg font-semibold">Source wise Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={salesConversionData.sourcePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomSourceTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="leads" fill="#0088FE" name="Total Leads" />
                  <Bar yAxisId="left" dataKey="conversions" fill="#00C49F" name="Conversions" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversionRate"
                    stroke="#FF8042"
                    strokeWidth={3}
                    name="Conversion Rate %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottom Row Charts - Better responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="p-0">
                <ExactFunnelChart />
              </CardContent>
            </Card>

            {/* Revenue Distribution by Source */}
            <Card className="shadow-lg lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg font-semibold text-center">
                  Revenue Distribution by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                  <PieChart>
                    <Pie
                      data={salesConversionData.sourcePerformance}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="revenue"
                      nameKey="source"
                    >
                      {salesConversionData.sourcePerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}M`, "Revenue"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg font-semibold">Sales & Profit by Country</CardTitle>
              </CardHeader>
              <CardContent>
                <WorldMapVisualization data={salesConversionData.countryPerformance} />
              </CardContent>
            </Card>
          </div>

          {/* Facebook Campaign Wise Conversion and ROAS section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base lg:text-lg font-semibold">
                Facebook Campaign Wise Conversion and ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={salesConversionData.facebookCampaigns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="campaign" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "conversions") return [value, "Conversions"]
                      if (name === "roas") return [`${value}x`, "ROAS"]
                      if (name === "spend") return [`$${value}`, "Spend"]
                      if (name === "revenue") return [`$${value}`, "Revenue"]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="conversions" fill="#1877F2" name="Conversions" />
                  <Bar yAxisId="left" dataKey="spend" fill="#FF6B6B" name="Spend ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#00C851" strokeWidth={3} name="ROAS" />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Campaign performance table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-right p-2">Impressions</th>
                      <th className="text-right p-2">Clicks</th>
                      <th className="text-right p-2">Conversions</th>
                      <th className="text-right p-2">Spend</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesConversionData.facebookCampaigns.map((campaign, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{campaign.campaign}</td>
                        <td className="p-2 text-right">{campaign.impressions.toLocaleString()}</td>
                        <td className="p-2 text-right">{campaign.clicks.toLocaleString()}</td>
                        <td className="p-2 text-right">{campaign.conversions}</td>
                        <td className="p-2 text-right">${campaign.spend.toLocaleString()}</td>
                        <td className="p-2 text-right">${campaign.revenue.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold text-green-600">{campaign.roas}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Google Adword Campaign Wise Conversion and ROAS section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base lg:text-lg font-semibold">
                Google Adword Campaign Wise Conversion and ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={salesConversionData.googleAdsCampaigns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="campaign" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "conversions") return [value, "Conversions"]
                      if (name === "roas") return [`${value}x`, "ROAS"]
                      if (name === "spend") return [`$${value}`, "Spend"]
                      if (name === "revenue") return [`$${value}`, "Revenue"]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="conversions" fill="#4285F4" name="Conversions" />
                  <Bar yAxisId="left" dataKey="spend" fill="#EA4335" name="Spend ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#34A853" strokeWidth={3} name="ROAS" />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Campaign performance table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-right p-2">Impressions</th>
                      <th className="text-right p-2">Clicks</th>
                      <th className="text-right p-2">Conversions</th>
                      <th className="text-right p-2">Spend</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesConversionData.googleAdsCampaigns.map((campaign, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{campaign.campaign}</td>
                        <td className="p-2 text-right">{campaign.impressions.toLocaleString()}</td>
                        <td className="p-2 text-right">{campaign.clicks.toLocaleString()}</td>
                        <td className="p-2 text-right">{campaign.conversions}</td>
                        <td className="p-2 text-right">${campaign.spend.toLocaleString()}</td>
                        <td className="p-2 text-right">${campaign.revenue.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold text-green-600">{campaign.roas}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Filter Panel - Better responsive behavior */}
        <div className="xl:col-span-2 order-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Country</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesConversionData.filterOptions.countries.map((country) => (
                  <div
                    key={country}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {country}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Year</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesConversionData.filterOptions.years.map((year) => (
                  <div
                    key={year}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {year}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesConversionData.filterOptions.months.slice(0, 6).map((month) => (
                  <div
                    key={month}
                    className="p-2 bg-blue-50 text-blue-800 text-xs sm:text-sm rounded cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {month}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
