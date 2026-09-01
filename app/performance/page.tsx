"use client"

import { useAuth } from "@/hooks/use-auth"
import { usePerformance } from "@/hooks/use-performance"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Award, Phone, AlertTriangle, Users, BarChart3 } from "lucide-react"

export default function PerformancePage() {
  const { user, isLoading, hasPermission, getAllUsers } = useAuth()
  const { employeeMetrics, teamPerformance, performanceAlerts, getRankings, getPerformanceAlerts, resolveAlert } =
    usePerformance()
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("performance.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !hasPermission("performance.view")) {
    return null
  }

  const rankings = getRankings(selectedPeriod)
  const alerts = getPerformanceAlerts()
  const users = getAllUsers()

  // Filter metrics based on user role
  const visibleMetrics = user.permissions.includes("all")
    ? employeeMetrics
    : employeeMetrics.filter((m) => m.employeeId === user.id)

  const topPerformers = rankings.slice(0, 5)
  const lowPerformers = rankings.slice(-3).reverse()

  // Calculate team totals
  const teamTotals = {
    totalCalls: visibleMetrics.reduce((sum, m) => sum + m.totalCalls, 0),
    totalConversions: visibleMetrics.reduce((sum, m) => sum + m.conversionCalls, 0),
    totalRevenue: visibleMetrics.reduce((sum, m) => sum + m.conversionAmount, 0),
    avgScore:
      visibleMetrics.length > 0
        ? Math.round(visibleMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / visibleMetrics.length)
        : 0,
    activeAgents: visibleMetrics.filter((m) => m.totalCalls > 0).length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            <p className="text-muted-foreground">Track employee performance and rankings</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Performance Alerts */}
        {alerts.length > 0 && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Performance Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => {
                  const employee = users.find((u) => u.id === alert.employeeId)
                  return (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            alert.severity === "critical"
                              ? "destructive"
                              : alert.severity === "high"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <div>
                          <div className="font-medium">{employee?.name}</div>
                          <div className="text-sm text-muted-foreground">{alert.message}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                        Resolve
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.activeAgents}</div>
              <p className="text-xs text-muted-foreground">of {visibleMetrics.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.totalCalls}</div>
              <p className="text-xs text-muted-foreground">{teamTotals.totalConversions} conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{teamTotals.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {teamTotals.totalCalls > 0
                  ? ((teamTotals.totalConversions / teamTotals.totalCalls) * 100).toFixed(1)
                  : 0}
                % conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.avgScore}</div>
              <p className="text-xs text-muted-foreground">Average performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rankings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.map((performer, index) => {
                      const employee = users.find((u) => u.id === performer.employeeId)
                      return (
                        <div key={performer.employeeId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : index === 1
                                    ? "bg-gray-100 text-gray-800"
                                    : index === 2
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{employee?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {performer.totalCalls} calls • {performer.conversionCalls} conversions
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{performer.performanceScore}</div>
                            <div className="text-sm text-muted-foreground">score</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Low Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Need Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lowPerformers.map((performer) => {
                      const employee = users.find((u) => u.id === performer.employeeId)
                      return (
                        <div key={performer.employeeId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-sm font-bold">
                              {performer.rank}
                            </div>
                            <div>
                              <div className="font-medium">{employee?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {performer.totalCalls} calls • {performer.targetPercentage.toFixed(1)}% target
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">{performer.performanceScore}</div>
                            <div className="text-sm text-muted-foreground">score</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Work Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.map((metric) => {
                      const employee = users.find((u) => u.id === metric.employeeId)
                      return (
                        <TableRow key={metric.employeeId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{employee?.name}</div>
                              <div className="text-sm text-muted-foreground">{employee?.employeeId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={metric.rank <= 3 ? "default" : "secondary"}>#{metric.rank}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="font-bold">{metric.performanceScore}</div>
                              <Progress value={metric.performanceScore} className="w-16" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{metric.totalCalls}</div>
                              <div className="text-sm text-muted-foreground">
                                {metric.newCalls}N • {metric.followUpCalls}F
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{metric.conversionCalls}</div>
                              <div className="text-sm text-muted-foreground">
                                ₹{metric.conversionAmount.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{metric.targetPercentage.toFixed(1)}%</div>
                              <div className="text-sm text-muted-foreground">
                                {metric.targetAchieved}/{metric.dailyTarget}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                metric.responseTime <= 2
                                  ? "default"
                                  : metric.responseTime <= 4
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {metric.responseTime.toFixed(1)}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{metric.totalWorkHours.toFixed(1)}h</div>
                              <div className="text-sm text-muted-foreground">
                                {metric.liveCallTime.toFixed(1)}h active
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
                <CardDescription>Historical performance analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Trends Analysis</h3>
                  <p>Performance trends and charts will be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
