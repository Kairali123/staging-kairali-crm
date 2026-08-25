"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAnalytics } from "@/hooks/use-analytics"
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Clock,
  Download,
  Filter,
  Calendar,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

export default function ReportsPage() {
  const { data, loading, generateReport, exportReport } = useAnalytics()
  const [generatingReport, setGeneratingReport] = useState(false)

  const handleGenerateReport = async (reportType: string) => {
    setGeneratingReport(true)
    const result = await generateReport(reportType)
    setGeneratingReport(false)

    if (result.success) {
      toast.success("Report generated successfully!")
    } else {
      toast.error("Failed to generate report: " + result.error)
    }
  }

  const handleExportReport = async (format: "pdf" | "excel" | "csv") => {
    const result = await exportReport(format, data)
    if (result.success) {
      toast.success(`Report exported as ${format.toUpperCase()} successfully!`)
    } else {
      toast.error("Failed to export report: " + result.error)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(data.executive.totalRevenue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{data.executive.revenueGrowth}%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.executive.leadConversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.leads.convertedLeads} of {data.leads.totalLeads} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employee Productivity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.executive.employeeProductivity}%</div>
            <p className="text-xs text-muted-foreground">{data.performance.activeEmployees} active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.executive.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">Operational efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Sales Analytics
            </CardTitle>
            <CardDescription>Revenue, conversions, and sales performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold">₹{(data.sales.monthlyRevenue / 100000).toFixed(1)}L</p>
              </div>
              <div>
                <p className="text-sm font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold">{data.sales.conversionRate}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Top Performers</h4>
              {data.sales.salesByAgent.slice(0, 3).map((agent, index) => (
                <div key={agent.name} className="flex items-center justify-between text-sm">
                  <span>{agent.name}</span>
                  <Badge variant="outline">₹{(agent.amount / 100000).toFixed(1)}L</Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("sales")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/sales-conversion">View Conversion Report</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/sales">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Lead Analytics
            </CardTitle>
            <CardDescription>Lead generation, conversion, and funnel analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Leads</p>
                <p className="text-2xl font-bold">{data.leads.totalLeads}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Converted</p>
                <p className="text-2xl font-bold">{data.leads.convertedLeads}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Top Sources</h4>
              {data.leads.leadsBySource.slice(0, 3).map((source) => (
                <div key={source.source} className="flex items-center justify-between text-sm">
                  <span>{source.source}</span>
                  <Badge variant="outline">{source.count} leads</Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("leads")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/leads">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance Analytics
            </CardTitle>
            <CardDescription>Employee productivity and performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Avg Productivity</p>
                <p className="text-2xl font-bold">{data.performance.avgProductivity}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Active Employees</p>
                <p className="text-2xl font-bold">{data.performance.activeEmployees}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Top Performers</h4>
              {data.performance.topPerformers.slice(0, 3).map((performer) => (
                <div key={performer.name} className="flex items-center justify-between text-sm">
                  <span>{performer.name}</span>
                  <Badge variant="outline">{performer.score.toFixed(1)}</Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerateReport("performance")}
                disabled={generatingReport}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/performance">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referral Analytics
            </CardTitle>
            <CardDescription>Referral tracking, rewards, and conversion metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Referrals</p>
                <p className="text-2xl font-bold">{data.referrals?.totalReferrals || 247}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold">{data.referrals?.conversionRate || 68}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Top Referrers</h4>
              {(
                data.referrals?.topReferrers || [
                  { name: "Priya Sharma", count: 23, reward: 11500 },
                  { name: "Rajesh Kumar", count: 18, reward: 9000 },
                  { name: "Anita Singh", count: 15, reward: 7500 },
                ]
              )
                .slice(0, 3)
                .map((referrer) => (
                  <div key={referrer.name} className="flex items-center justify-between text-sm">
                    <span>{referrer.name}</span>
                    <Badge variant="outline">{referrer.count} refs</Badge>
                  </div>
                ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("referrals")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/referrals">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complaints (CAPA)
            </CardTitle>
            <CardDescription>Complaint analysis, resolution tracking, and CAPA metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Complaints</p>
                <p className="text-2xl font-bold">{data.complaints?.totalComplaints || 89}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Resolution Rate</p>
                <p className="text-2xl font-bold">{data.complaints?.resolutionRate || 94}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Top Categories</h4>
              {(
                data.complaints?.topCategories || [
                  { category: "Service Quality", count: 32, severity: "Medium" },
                  { category: "Billing Issues", count: 28, severity: "High" },
                  { category: "Product Defect", count: 19, severity: "Critical" },
                ]
              )
                .slice(0, 3)
                .map((complaint) => (
                  <div key={complaint.category} className="flex items-center justify-between text-sm">
                    <span>{complaint.category}</span>
                    <Badge
                      variant={
                        complaint.severity === "Critical"
                          ? "destructive"
                          : complaint.severity === "High"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {complaint.count}
                    </Badge>
                  </div>
                ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("complaints")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/complaints">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Feedback Analytics
            </CardTitle>
            <CardDescription>Customer feedback, ratings, and satisfaction metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Avg Rating</p>
                <p className="text-2xl font-bold">{data.feedback?.avgRating || 4.6}/5</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Reviews</p>
                <p className="text-2xl font-bold">{data.feedback?.totalReviews || 1247}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Rating Distribution</h4>
              {(
                data.feedback?.ratingDistribution || [
                  { rating: 5, count: 687, percentage: 55 },
                  { rating: 4, count: 374, percentage: 30 },
                  { rating: 3, count: 125, percentage: 10 },
                ]
              )
                .slice(0, 3)
                .map((rating) => (
                  <div key={rating.rating} className="flex items-center justify-between text-sm">
                    <span>{rating.rating} Stars</span>
                    <Badge variant="outline">{rating.percentage}%</Badge>
                  </div>
                ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("feedback")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/feedback">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              FMS Analytics
            </CardTitle>
            <CardDescription>Booking and complaint management statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Total Bookings</p>
                <p className="text-xl font-bold">{data.fms.totalBookings}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-xl font-bold">{data.fms.completionRate}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Complaints</p>
                <p className="text-xl font-bold">{data.fms.totalComplaints}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("fms")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/fms">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Help Desk Analytics
            </CardTitle>
            <CardDescription>Support ticket and resolution statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Total Tickets</p>
                <p className="text-xl font-bold">{data.helpdesk.totalTickets}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Resolution Rate</p>
                <p className="text-xl font-bold">{data.helpdesk.resolutionRate}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">SLA Compliance</p>
                <p className="text-xl font-bold">{data.helpdesk.slaCompliance}%</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleGenerateReport("helpdesk")} disabled={generatingReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/reports/helpdesk">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reports
          </CardTitle>
          <CardDescription>Download comprehensive reports in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Export all analytics data</p>
              <p className="text-sm text-muted-foreground">
                Includes sales, leads, performance, FMS, and help desk data
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleExportReport("pdf")} variant="outline" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button onClick={() => handleExportReport("excel")} variant="outline" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button onClick={() => handleExportReport("csv")} variant="outline" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
