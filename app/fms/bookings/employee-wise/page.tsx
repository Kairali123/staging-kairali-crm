"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  Search,
  Filter,
  Download,
  TrendingUp,
  DollarSign,
  Target,
  ArrowLeft,
  Eye,
  Star,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

export default function EmployeeWiseBookingsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [performanceFilter, setPerformanceFilter] = useState("all")

  // Mock data for employee performance
  const employeeData = [
    {
      id: "EMP001",
      name: "Pushpanshu Kumar",
      department: "Sales",
      position: "Senior Sales Executive",
      bookingsCount: 45,
      target: 40,
      achievement: 112.5,
      revenue: 420000,
      commission: 21000,
      avgBookingValue: 9333,
      avgDiscount: 8.5,
      sharePercentage: 28.4,
      rank: 1,
      conversionRate: 68.2,
      trend: "up",
      growth: 15.3,
      topPackage: "Panchakarma",
      rating: 4.8,
      joinDate: "2023-01-15",
    },
    {
      id: "EMP002",
      name: "Harpal Singh",
      department: "Sales",
      position: "Sales Executive",
      bookingsCount: 38,
      target: 35,
      achievement: 108.6,
      revenue: 380000,
      commission: 19000,
      avgBookingValue: 10000,
      avgDiscount: 12.3,
      sharePercentage: 25.7,
      rank: 2,
      conversionRate: 72.1,
      trend: "up",
      growth: 8.7,
      topPackage: "Wellness Retreat",
      rating: 4.6,
      joinDate: "2023-03-20",
    },
    {
      id: "EMP003",
      name: "Pawan Kamra",
      department: "Operations",
      position: "Booking Coordinator",
      bookingsCount: 32,
      target: 30,
      achievement: 106.7,
      revenue: 290000,
      commission: 14500,
      avgBookingValue: 9063,
      avgDiscount: 6.8,
      sharePercentage: 19.6,
      rank: 3,
      conversionRate: 65.4,
      trend: "up",
      growth: 12.1,
      topPackage: "Detox Program",
      rating: 4.7,
      joinDate: "2022-11-10",
    },
    {
      id: "EMP004",
      name: "Sadik Rehman",
      department: "Sales",
      position: "Junior Sales Executive",
      bookingsCount: 28,
      target: 32,
      achievement: 87.5,
      revenue: 245000,
      commission: 12250,
      avgBookingValue: 8750,
      avgDiscount: 15.2,
      sharePercentage: 16.6,
      rank: 4,
      conversionRate: 58.9,
      trend: "down",
      growth: -5.2,
      topPackage: "Ayurvedic Consultation",
      rating: 4.3,
      joinDate: "2023-06-01",
    },
    {
      id: "EMP005",
      name: "Vibin S",
      department: "Sales",
      position: "Sales Executive",
      bookingsCount: 25,
      target: 30,
      achievement: 83.3,
      revenue: 220000,
      commission: 11000,
      avgBookingValue: 8800,
      avgDiscount: 9.7,
      sharePercentage: 14.9,
      rank: 5,
      conversionRate: 62.5,
      trend: "up",
      growth: 3.2,
      topPackage: "Rejuvenation Package",
      rating: 4.4,
      joinDate: "2023-04-15",
    },
    {
      id: "EMP006",
      name: "Vikesh Kumar",
      department: "Operations",
      position: "Booking Coordinator",
      bookingsCount: 22,
      target: 25,
      achievement: 88.0,
      revenue: 195000,
      commission: 9750,
      avgBookingValue: 8864,
      avgDiscount: 11.4,
      sharePercentage: 13.2,
      rank: 6,
      conversionRate: 59.8,
      trend: "up",
      growth: 6.8,
      topPackage: "Stress Relief Program",
      rating: 4.2,
      joinDate: "2023-05-10",
    },
    {
      id: "EMP007",
      name: "Rohit Ahuja",
      department: "Sales",
      position: "Junior Sales Executive",
      bookingsCount: 18,
      target: 22,
      achievement: 81.8,
      revenue: 165000,
      commission: 8250,
      avgBookingValue: 9167,
      avgDiscount: 13.6,
      sharePercentage: 11.2,
      rank: 7,
      conversionRate: 56.3,
      trend: "down",
      growth: -2.1,
      topPackage: "Basic Wellness",
      rating: 4.1,
      joinDate: "2023-07-01",
    },
  ]

  const filteredEmployees = employeeData.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = departmentFilter === "all" || employee.department.toLowerCase() === departmentFilter

    const matchesPerformance =
      performanceFilter === "all" ||
      (performanceFilter === "high" && employee.achievement >= 100) ||
      (performanceFilter === "medium" && employee.achievement >= 80 && employee.achievement < 100) ||
      (performanceFilter === "low" && employee.achievement < 80)

    return matchesSearch && matchesDepartment && matchesPerformance
  })

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return "text-emerald-600"
    if (achievement >= 80) return "text-amber-600"
    return "text-red-600"
  }

  const getPerformanceBadge = (achievement: number) => {
    if (achievement >= 110) return { label: "Excellent", color: "bg-emerald-100 text-emerald-800 border-emerald-200" }
    if (achievement >= 100) return { label: "Good", color: "bg-blue-100 text-blue-800 border-blue-200" }
    if (achievement >= 80) return { label: "Average", color: "bg-amber-100 text-amber-800 border-amber-200" }
    return { label: "Below Target", color: "bg-red-100 text-red-800 border-red-200" }
  }

  const TrendIndicator = ({ trend, growth }: { trend: "up" | "down"; growth: number }) => (
    <div className={`flex items-center gap-1 ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
      {trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      <span className="text-sm font-medium">{Math.abs(growth)}%</span>
    </div>
  )

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/fms/bookings">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                Employee-Wise Bookings
              </h1>
              <p className="text-lg text-slate-600">Individual performance tracking and commission analysis</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="border-slate-300 hover:bg-slate-50 bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Top Performer Card */}
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-800">Top Performer This Month</h3>
                <p className="text-yellow-700">Pushpanshu Kumar - 112.5% of target achieved</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-800">₹4.2L</div>
              <div className="text-sm text-yellow-600">Revenue Generated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Employees</p>
                <p className="text-3xl font-bold text-blue-700">24</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Above Target</p>
                <p className="text-3xl font-bold text-emerald-700">18</p>
              </div>
              <Target className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                <p className="text-3xl font-bold text-purple-700">₹32.5L</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Avg Performance</p>
                <p className="text-3xl font-bold text-orange-700">103.7%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by employee name, ID, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="high">Above Target (100%+)</SelectItem>
                <SelectItem value="medium">Good (80-99%)</SelectItem>
                <SelectItem value="low">Below Target (&lt;80%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Employee Performance ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Target Achievement</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Avg Discount</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Top Package</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const performanceBadge = getPerformanceBadge(employee.achievement)
                  return (
                    <TableRow key={employee.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Badge
                            variant="outline"
                            className={`
                              ${employee.rank === 1 ? "bg-yellow-100 text-yellow-800 border-yellow-300" : ""}
                              ${employee.rank === 2 ? "bg-gray-100 text-gray-800 border-gray-300" : ""}
                              ${employee.rank === 3 ? "bg-orange-100 text-orange-800 border-orange-300" : ""}
                              ${employee.rank > 3 ? "bg-slate-100 text-slate-600 border-slate-300" : ""}
                            `}
                          >
                            #{employee.rank}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            {employee.name}
                            {employee.achievement >= 110 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-slate-600">{employee.position}</div>
                          <div className="text-xs text-slate-500">{employee.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{employee.bookingsCount}</div>
                          <div className="text-sm text-slate-600">Target: {employee.target}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${getAchievementColor(employee.achievement)}`}>
                              {employee.achievement}%
                            </span>
                            <Badge className={performanceBadge.color}>{performanceBadge.label}</Badge>
                          </div>
                          <Progress value={Math.min(employee.achievement, 100)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">₹{(employee.revenue / 100000).toFixed(1)}L</div>
                          <div className="text-sm text-slate-600">
                            Avg: ₹{employee.avgBookingValue.toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">₹{employee.commission.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="font-medium text-orange-600">{employee.avgDiscount}%</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-blue-600">{employee.sharePercentage}%</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{employee.conversionRate}%</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.topPackage}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{employee.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TrendIndicator trend={employee.trend as "up" | "down"} growth={employee.growth} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
