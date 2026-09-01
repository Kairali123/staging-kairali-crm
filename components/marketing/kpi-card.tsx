"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { formatCurrency, formatPercent, formatPercentDecimal, formatNumber } from "@/lib/marketing-vs-sales-mock"
import { LineChart, Line, ResponsiveContainer } from "recharts"

interface KPICardProps {
  title: string
  value: number
  type: "currency" | "number" | "percent" | "percentDecimal"
  sparklineData: number[]
  planVsActual: {
    plan: number
    actual: number
  }
  momChange: number
  className?: string
}

export function KPICard({ title, value, type, sparklineData, planVsActual, momChange, className }: KPICardProps) {
  const formatValue = (val: number) => {
    switch (type) {
      case "currency":
        return formatCurrency(val)
      case "percent":
        return formatPercent(val)
      case "percentDecimal":
        return formatPercentDecimal(val)
      default:
        return formatNumber(val)
    }
  }

  const sparklineChartData = sparklineData.map((value, index) => ({ value, index }))

  const planActualDelta = ((planVsActual.actual - planVsActual.plan) / planVsActual.plan) * 100

  const getMomIcon = () => {
    if (momChange > 0) return <ArrowUp className="h-3 w-3 text-emerald-600" />
    if (momChange < 0) return <ArrowDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-gray-500" />
  }

  const getMomColor = () => {
    if (momChange > 0) return "text-emerald-600"
    if (momChange < 0) return "text-red-600"
    return "text-gray-500"
  }

  return (
    <Card className={`rounded-2xl shadow-sm border-[#dfe7e2] bg-white hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#475569] uppercase tracking-wide">{title}</h3>
            <div className="flex items-center gap-1 group cursor-pointer">
              {getMomIcon()}
              <span className={`text-xs font-medium ${getMomColor()}`}>{Math.abs(momChange)}%</span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 -mt-8 ml-4 whitespace-nowrap">
                MoM Change: {momChange > 0 ? "+" : ""}
                {momChange}%
              </div>
            </div>
          </div>

          {/* Main Value */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-[#1f2a2e] tracking-tight">{formatValue(value)}</div>

            {/* Sparkline */}
            <div className="h-12 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineChartData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2f6b4f"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#2f6b4f" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan vs Actual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#475569]">Plan vs Actual</span>
              <span className={`font-medium ${planActualDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {planActualDelta >= 0 ? "+" : ""}
                {planActualDelta.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[#475569]">Plan</div>
                <div className="font-semibold text-[#1f2a2e]">{formatValue(planVsActual.plan)}</div>
              </div>
              <div>
                <div className="text-[#475569]">Actual</div>
                <div className="font-semibold text-[#1f2a2e]">{formatValue(planVsActual.actual)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
