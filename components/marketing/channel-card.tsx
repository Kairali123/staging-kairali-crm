"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatCurrency, formatPercent, formatNumber } from "@/lib/marketing-vs-sales-mock"

interface ChannelMetrics {
  leads: { plan: number; actual: number; deltaPct: number }
  converted: { plan: number; actual: number; deltaPct: number }
  conversionRate: { plan: number; actual: number; deltaPct: number }
  revenueINR: { plan: number; actual: number; deltaPct: number }
  roiPct: { plan: number; actual: number; deltaPct: number }
}

interface ChannelCardProps {
  id: string
  label: string
  metrics: ChannelMetrics
  trend12mo: number[]
  onClick: () => void
}

export function ChannelCard({ id, label, metrics, trend12mo, onClick }: ChannelCardProps) {
  const getTrendIcon = (deltaPct: number) => {
    if (deltaPct > 0) return <TrendingUp className="h-3 w-3 text-emerald-600" />
    if (deltaPct < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-gray-500" />
  }

  const getTrendColor = (deltaPct: number) => {
    if (deltaPct > 0) return "text-emerald-600"
    if (deltaPct < 0) return "text-red-600"
    return "text-gray-500"
  }

  // Calculate overall performance trend
  const overallTrend =
    (metrics.leads.deltaPct +
      metrics.converted.deltaPct +
      metrics.conversionRate.deltaPct +
      metrics.revenueINR.deltaPct +
      metrics.roiPct.deltaPct) /
    5

  const tableRows = [
    {
      metric: "Leads",
      plan: formatNumber(metrics.leads.plan),
      actual: formatNumber(metrics.leads.actual),
      delta: metrics.leads.deltaPct,
    },
    {
      metric: "Converted",
      plan: formatNumber(metrics.converted.plan),
      actual: formatNumber(metrics.converted.actual),
      delta: metrics.converted.deltaPct,
    },
    {
      metric: "Conv. Rate",
      plan: formatPercent(metrics.conversionRate.plan),
      actual: formatPercent(metrics.conversionRate.actual),
      delta: metrics.conversionRate.deltaPct,
    },
    {
      metric: "Revenue",
      plan: formatCurrency(metrics.revenueINR.plan),
      actual: formatCurrency(metrics.revenueINR.actual),
      delta: metrics.revenueINR.deltaPct,
    },
    {
      metric: "ROI %",
      plan: formatPercent(metrics.roiPct.plan),
      actual: formatPercent(metrics.roiPct.actual),
      delta: metrics.roiPct.deltaPct,
    },
  ]

  return (
    <Card
      className="rounded-2xl shadow-sm border-[#dfe7e2] bg-white hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[#1f2a2e] group-hover:text-[#2f6b4f] transition-colors">
            {label}
          </CardTitle>
          <div className="flex items-center gap-1">{getTrendIcon(overallTrend)}</div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Compact Performance Table */}
          <div className="space-y-2">
            {tableRows.map((row, index) => (
              <div key={row.metric} className="grid grid-cols-4 gap-2 text-xs">
                <div className="font-medium text-[#475569] truncate">{row.metric}</div>
                <div className="text-right text-[#1f2a2e] font-mono">{row.plan}</div>
                <div className="text-right text-[#1f2a2e] font-mono font-semibold">{row.actual}</div>
                <div className={`text-right font-semibold ${getTrendColor(row.delta)}`}>
                  {row.delta > 0 ? "+" : ""}
                  {row.delta.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-[#475569] border-t border-[#dfe7e2] pt-2">
            <div>Metric</div>
            <div className="text-right">Plan</div>
            <div className="text-right">Actual</div>
            <div className="text-right">Δ%</div>
          </div>

          {/* Click to expand hint */}
          <div className="text-xs text-[#475569] text-center pt-2 border-t border-[#dfe7e2] opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view 12-month trend & export
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
