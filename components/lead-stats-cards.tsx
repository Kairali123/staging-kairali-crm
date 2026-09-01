"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingUp } from "lucide-react"
import type { LeadStats } from "@/types/lead"

export interface LeadStatsCardsProps {
  stats: LeadStats
}

export function LeadStatsCards({ stats }: LeadStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">{stats.conversionRate.toFixed(1)}% conversion rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Leads</CardTitle>
          <Badge variant="secondary">{stats.new}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.new}</div>
          <p className="text-xs text-muted-foreground">Awaiting assignment</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Follow Ups</CardTitle>
          <Badge variant="outline">{stats.followUp}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.followUp}</div>
          <p className="text-xs text-muted-foreground">Pending follow up</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Converted</CardTitle>
          <Badge variant="default">{stats.converted}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.converted}</div>
          <p className="text-xs text-muted-foreground">Successfully closed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">TAT Breached</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.tatBreached}</div>
          <p className="text-xs text-muted-foreground">Over 4 hours</p>
        </CardContent>
      </Card>
    </div>
  )
}
