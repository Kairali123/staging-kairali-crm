"use client"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency, formatPercent, formatNumber } from "@/lib/marketing-vs-sales-mock"

interface ChannelMetrics {
  leads: { plan: number; actual: number; deltaPct: number }
  converted: { plan: number; actual: number; deltaPct: number }
  conversionRate: { plan: number; actual: number; deltaPct: number }
  revenueINR: { plan: number; actual: number; deltaPct: number }
  roiPct: { plan: number; actual: number; deltaPct: number }
}

interface ChannelDrawerProps {
  isOpen: boolean
  onClose: () => void
  channelData: {
    id: string
    label: string
    metrics: ChannelMetrics
    trend12mo: number[]
  } | null
}

export function ChannelDrawer({ isOpen, onClose, channelData }: ChannelDrawerProps) {
  if (!channelData) return null

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const chartData = channelData.trend12mo.map((value, index) => ({
    month: months[index],
    conversionRate: value,
  }))

  const getTrendIcon = (deltaPct: number) => {
    if (deltaPct > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />
    if (deltaPct < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = (deltaPct: number) => {
    if (deltaPct > 0) return "text-emerald-600"
    if (deltaPct < 0) return "text-red-600"
    return "text-gray-500"
  }

  const exportToCSV = () => {
    const csvData = [
      ["Metric", "Plan", "Actual", "Delta %"],
      ["Leads", channelData.metrics.leads.plan, channelData.metrics.leads.actual, channelData.metrics.leads.deltaPct],
      [
        "Converted",
        channelData.metrics.converted.plan,
        channelData.metrics.converted.actual,
        channelData.metrics.converted.deltaPct,
      ],
      [
        "Conversion Rate",
        channelData.metrics.conversionRate.plan,
        channelData.metrics.conversionRate.actual,
        channelData.metrics.conversionRate.deltaPct,
      ],
      [
        "Revenue (INR)",
        channelData.metrics.revenueINR.plan,
        channelData.metrics.revenueINR.actual,
        channelData.metrics.revenueINR.deltaPct,
      ],
      [
        "ROI %",
        channelData.metrics.roiPct.plan,
        channelData.metrics.roiPct.actual,
        channelData.metrics.roiPct.deltaPct,
      ],
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${channelData.label.replace(/[^a-zA-Z0-9]/g, "_")}_performance.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-[#1f2a2e]">{channelData.label}</SheetTitle>
            <Button onClick={exportToCSV} size="sm" className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90 text-white">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <SheetDescription className="text-[#475569]">
            12-month performance trend and detailed metrics
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* 12-Month Trend Chart */}
          <Card className="rounded-2xl border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1f2a2e]">Conversion Rate Trend (12 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                    <XAxis dataKey="month" stroke="#475569" fontSize={12} />
                    <YAxis stroke="#475569" fontSize={12} tickFormatter={(value) => `${value}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Conversion Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversionRate"
                      stroke="#2f6b4f"
                      strokeWidth={3}
                      dot={{ fill: "#2f6b4f", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#2f6b4f" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Mini KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border-[#dfe7e2]">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#475569]">Total Leads</span>
                    {getTrendIcon(channelData.metrics.leads.deltaPct)}
                  </div>
                  <div className="text-2xl font-bold text-[#1f2a2e]">
                    {formatNumber(channelData.metrics.leads.actual)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475569]">vs Plan: {formatNumber(channelData.metrics.leads.plan)}</span>
                    <span className={`font-semibold ${getTrendColor(channelData.metrics.leads.deltaPct)}`}>
                      {channelData.metrics.leads.deltaPct > 0 ? "+" : ""}
                      {channelData.metrics.leads.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#dfe7e2]">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#475569]">Converted</span>
                    {getTrendIcon(channelData.metrics.converted.deltaPct)}
                  </div>
                  <div className="text-2xl font-bold text-[#1f2a2e]">
                    {formatNumber(channelData.metrics.converted.actual)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475569]">vs Plan: {formatNumber(channelData.metrics.converted.plan)}</span>
                    <span className={`font-semibold ${getTrendColor(channelData.metrics.converted.deltaPct)}`}>
                      {channelData.metrics.converted.deltaPct > 0 ? "+" : ""}
                      {channelData.metrics.converted.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#dfe7e2]">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#475569]">Revenue</span>
                    {getTrendIcon(channelData.metrics.revenueINR.deltaPct)}
                  </div>
                  <div className="text-2xl font-bold text-[#1f2a2e]">
                    {formatCurrency(channelData.metrics.revenueINR.actual)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475569]">
                      vs Plan: {formatCurrency(channelData.metrics.revenueINR.plan)}
                    </span>
                    <span className={`font-semibold ${getTrendColor(channelData.metrics.revenueINR.deltaPct)}`}>
                      {channelData.metrics.revenueINR.deltaPct > 0 ? "+" : ""}
                      {channelData.metrics.revenueINR.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#dfe7e2]">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#475569]">ROI</span>
                    {getTrendIcon(channelData.metrics.roiPct.deltaPct)}
                  </div>
                  <div className="text-2xl font-bold text-[#1f2a2e]">
                    {formatPercent(channelData.metrics.roiPct.actual)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475569]">vs Plan: {formatPercent(channelData.metrics.roiPct.plan)}</span>
                    <span className={`font-semibold ${getTrendColor(channelData.metrics.roiPct.deltaPct)}`}>
                      {channelData.metrics.roiPct.deltaPct > 0 ? "+" : ""}
                      {channelData.metrics.roiPct.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
