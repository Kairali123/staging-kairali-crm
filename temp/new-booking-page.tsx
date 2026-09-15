import { DashboardLayout } from "@/components/dashboard-layout"
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Percent,
  UserCheck,
  Globe,
  CalendarIcon,
  AlertTriangle,
  XCircle,
  BarChart3,
  PieChart,
  Package,
} from "lucide-react"
import {
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Pie, // Import Pie from recharts
} from "recharts"

function StatusBadge({
  status,
  children,
}: {
  status: "success" | "warning" | "danger"
  children: React.ReactNode
}) {
  const className =
    status === "success"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "warning"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200"

  return <Badge className={className}>{children}</Badge>
}

export default function BookingFMSPage() {
  const leadSourceData = [
    { name: "Direct Website", value: 35, color: "#22c55e", bookings: 109, revenue: 4350000 },
    { name: "OTA Channels", value: 28, color: "#3b82f6", bookings: 87, revenue: 3480000 },
    { name: "Travel Agents", value: 22, color: "#f59e0b", bookings: 69, revenue: 2760000 },
    { name: "Corporate", value: 15, color: "#ef4444", bookings: 47, revenue: 1880000 },
  ]

  const packageWiseData = [
    { name: "Standard", bookings: 45, revenue: 180000, avgRate: 4000, occupancy: 85 },
    { name: "Deluxe", bookings: 32, revenue: 256000, avgRate: 8000, occupancy: 78 },
    { name: "Premium", bookings: 18, revenue: 216000, avgRate: 12000, occupancy: 72 },
    { name: "Suite", bookings: 12, revenue: 192000, avgRate: 16000, occupancy: 65 },
    { name: "Executive", bookings: 8, revenue: 160000, avgRate: 20000, occupancy: 60 },
  ]

  const autoReleaseData = [
    { month: "Jan", released: 8, total: 156, efficiency: 94.9, revenue_lost: 128000 },
    { month: "Feb", released: 12, total: 178, efficiency: 93.3, revenue_lost: 192000 },
    { month: "Mar", released: 15, total: 203, efficiency: 92.6, revenue_lost: 240000 },
    { month: "Apr", released: 9, total: 189, efficiency: 95.2, revenue_lost: 144000 },
    { month: "May", released: 11, total: 167, efficiency: 93.4, revenue_lost: 176000 },
    { month: "Jun", released: 15, total: 312, efficiency: 95.2, revenue_lost: 240000 },
  ]

  const cancellationTrendData = [
    { month: "Jan", cancellations: 18, refunds: 162000, refund_rate: 90, no_show: 3 },
    { month: "Feb", cancellations: 22, refunds: 198000, refund_rate: 85, no_show: 5 },
    { month: "Mar", cancellations: 15, refunds: 135000, refund_rate: 95, no_show: 2 },
    { month: "Apr", cancellations: 28, refunds: 252000, refund_rate: 80, no_show: 7 },
    { month: "May", cancellations: 19, refunds: 171000, refund_rate: 88, no_show: 4 },
    { month: "Jun", cancellations: 29, refunds: 261000, refund_rate: 82, no_show: 8 },
  ]

  const onlineReservationData = [
    { day: "Mon", bookings: 12, conversion: 3.2, visitors: 375, revenue: 96000 },
    { day: "Tue", bookings: 18, conversion: 4.1, visitors: 439, revenue: 144000 },
    { day: "Wed", bookings: 15, conversion: 3.8, visitors: 395, revenue: 120000 },
    { day: "Thu", bookings: 22, conversion: 4.5, visitors: 489, revenue: 176000 },
    { day: "Fri", bookings: 28, conversion: 5.2, visitors: 538, revenue: 224000 },
    { day: "Sat", bookings: 35, conversion: 6.1, visitors: 574, revenue: 280000 },
    { day: "Sun", bookings: 25, conversion: 4.8, visitors: 521, revenue: 200000 },
  ]

  const otaChannelData = [
    { name: "Booking.com", bookings: 45, commission: 15, revenue: 360000, rating: 8.9 },
    { name: "Expedia", bookings: 32, commission: 18, revenue: 256000, rating: 8.7 },
    { name: "Agoda", bookings: 28, commission: 12, revenue: 224000, rating: 8.8 },
    { name: "MakeMyTrip", bookings: 22, commission: 10, revenue: 176000, rating: 8.6 },
    { name: "Goibibo", bookings: 18, commission: 8, revenue: 144000, rating: 8.5 },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-balance">Client Booking FMS</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Comprehensive booking management and analytics dashboard
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="bg-transparent hover:bg-accent transition-colors">
              <Calendar className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <Button className="bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Dashboard
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Booking Verification Status</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Verified Bookings */}
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-green-50 to-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">✅ Verified Bookings</CardTitle>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Active</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-1">70</div>
                    <p className="text-sm text-gray-600 font-medium">Total Bookings</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-gray-900 mb-1">50</div>
                    <p className="text-sm text-gray-600 font-medium">📈 Confirmed</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">💰 Invoice Amount</span>
                    <span className="text-lg font-bold text-green-600">₹20,200</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">📊 Conversion Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">29%</span>
                      <StatusBadge status="success">📈 High</StatusBadge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "71%" }}></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">71% of total bookings verified</p>
                </div>
              </CardContent>
            </Card>

            {/* Unverified Bookings */}
            <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-amber-50 to-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">⚠️ Unverified Bookings</CardTitle>
                  </div>
                  <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    Review Needed
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg border border-amber-200">
                    <div className="text-3xl font-bold text-amber-600 mb-1">30</div>
                    <p className="text-sm text-gray-600 font-medium">Total Bookings</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-amber-200">
                    <div className="text-3xl font-bold text-gray-900 mb-1">20</div>
                    <p className="text-sm text-gray-600 font-medium">⏳ Pending</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-white rounded-lg border border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">💰 Invoice Amount</span>
                    <span className="text-lg font-bold text-amber-600">₹30,200</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">📊 Conversion Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-amber-600">21%</span>
                      <StatusBadge status="warning">📉 Monitor</StatusBadge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: "29%" }}></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">29% of total bookings need verification</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Analytics Charts</h2>

          {/* Top Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Source Wise Chart */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Lead Source Wise Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">Booking source breakdown with revenue impact</p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={leadSourceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value, payload }) =>
                          `${name}: ${value}% (${payload?.bookings ?? 0})`
                        }
                      >
                        {leadSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [`${value}% (${props.payload.bookings} bookings)`, name]}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {leadSourceData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">₹{(item.revenue / 100000).toFixed(1)}L</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Package Wise Chart */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Package Wise Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground">Room category performance and occupancy rates</p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={packageWiseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "bookings" ? `${value} bookings` : `₹${(Number(value) / 1000).toFixed(0)}K`,
                          name === "bookings" ? "Bookings" : "Revenue",
                        ]}
                      />
                      <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" />
                      <Bar dataKey="occupancy" fill="#22c55e" name="Occupancy %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Auto Release Policy */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Auto Release Policy Trends
                </CardTitle>
                <p className="text-sm text-muted-foreground">Monthly auto-release patterns and efficiency metrics</p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={autoReleaseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "efficiency" ? `${value}%` : value,
                          name === "released" ? "Auto Released" : name === "total" ? "Total Bookings" : "Efficiency %",
                        ]}
                      />
                      <Line type="monotone" dataKey="released" stroke="#ef4444" name="Auto Released" strokeWidth={2} />
                      <Line type="monotone" dataKey="total" stroke="#22c55e" name="Total Bookings" strokeWidth={2} />
                      <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" name="Efficiency %" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cancelled Refund */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Cancellation & Refund Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">Monthly cancellation trends and refund processing</p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cancellationTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "refunds"
                            ? `₹${(Number(value) / 1000).toFixed(0)}K`
                            : name === "refund_rate"
                              ? `${value}%`
                              : value,
                          name === "cancellations"
                            ? "Cancellations"
                            : name === "refunds"
                              ? "Refund Amount"
                              : "Refund Rate %",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cancellations"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        name="Cancellations"
                      />
                      <Area
                        type="monotone"
                        dataKey="refund_rate"
                        stackId="2"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        name="Refund Rate %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Online Reservation */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Online Reservation Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground">Daily website booking performance and conversion rates</p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={onlineReservationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "conversion"
                            ? `${value}%`
                            : name === "revenue"
                              ? `₹${(Number(value) / 1000).toFixed(0)}K`
                              : value,
                          name === "bookings" ? "Bookings" : name === "conversion" ? "Conversion Rate" : "Revenue",
                        ]}
                      />
                      <Bar dataKey="bookings" fill="#22c55e" name="Bookings" />
                      <Bar dataKey="conversion" fill="#3b82f6" name="Conversion %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* OTA Performance */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  OTA Channel Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Online travel agency booking volumes and commission rates
                </p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={otaChannelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "commission"
                            ? `${value}%`
                            : name === "revenue"
                              ? `₹${(Number(value) / 1000).toFixed(0)}K`
                              : value,
                          name === "bookings" ? "Bookings" : name === "commission" ? "Commission Rate" : "Revenue",
                        ]}
                      />
                      <Bar dataKey="bookings" fill="#f59e0b" name="Bookings" />
                      <Bar dataKey="commission" fill="#ef4444" name="Commission %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
                  {otaChannelData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span>Rating: {item.rating}</span>
                        <span className="font-medium">₹{(item.revenue / 100000).toFixed(1)}L</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* A. Dashboard KPIs (top row) */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Bookings Created */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bookings Created</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">312</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex space-x-1">
                    <Badge variant="outline" className="text-xs">
                      Today: 18
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Week: 127
                    </Badge>
                  </div>
                  <StatusBadge status="success">+18.5%</StatusBadge>
                </div>
                <div className="mt-2 h-8 flex items-end space-x-1">
                  {[22, 28, 19, 35, 31, 42, 48].map((height, i) => (
                    <div key={i} className="bg-success/30 w-2 rounded-sm" style={{ height: `${height}%` }} />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
                >
                  View Full Report
                </Button>
              </CardContent>
            </Card>

            {/* Confirmed / Cancelled / Pending */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Booking Status</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-success rounded-full mr-2" />
                      Confirmed
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">238</span>
                      <StatusBadge status="success">76.3%</StatusBadge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-danger rounded-full mr-2" />
                      Cancelled
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">29</span>
                      <StatusBadge status="danger">9.3%</StatusBadge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-warning rounded-full mr-2" />
                      Pending
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">45</span>
                      <StatusBadge status="warning">14.4%</StatusBadge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
                >
                  View Full Report
                </Button>
              </CardContent>
            </Card>

            {/* Collections vs Outstanding */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collections vs Outstanding</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹12.7L</div>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="text-success font-medium">₹12.7L</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="text-warning font-medium">₹3.2L</span>
                  </div>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{ width: "79.9%" }} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
                >
                  View Full Report
                </Button>
              </CardContent>
            </Card>

            {/* Discount Percentage */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Discount %</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">14.2%</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <span>vs revenue</span>
                  <StatusBadge status="warning">Monitor</StatusBadge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Avg: ₹2,847 per booking</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
                >
                  View Full Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Secondary KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Release Count & Rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>4.8% auto-release rate</span>
                <StatusBadge status="warning">Monitor</StatusBadge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Efficiency: 95.2%</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
              >
                View Full Report
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion %</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">71.4%</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>Lead → Booking</span>
                <StatusBadge status="success">Above Target</StatusBadge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Target: 65% | Leads: 437</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
              >
                View Full Report
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Length of Stay (ALOS)</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.4</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>nights per booking</span>
                <StatusBadge status="success">Excellent</StatusBadge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Target: 3.0 nights</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
              >
                View Full Report
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">82.3%</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>Current month</span>
                <StatusBadge status="success">Excellent</StatusBadge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Occupied: 247/300 rooms</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors"
              >
                View Full Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Pages Quick Access */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Detailed Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Employee-Wise Bookings */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">👥 Employee-Wise Bookings</CardTitle>
                <StatusBadge status="success">Active</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Track individual salesperson performance, targets vs actuals, and commission calculations.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Performer:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Priya S.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 116% of target</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium">₹4.2L this month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Earned:</span>
                    <span className="font-medium">₹21,000</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Employee Report
                </Button>
              </CardContent>
            </Card>

            {/* Travel Agent Bookings */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">✈️ Travel Agent Bookings</CardTitle>
                <StatusBadge status="success">Active</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Monitor travel agent partnerships, commission rates, and booking volumes.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Agents:</span>
                    <span className="font-medium">32</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Growth:</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 ₹2.4L this month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Agent:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Skyline Tours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Commission:</span>
                    <span className="font-medium">12.5%</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Travel Agent Report
                </Button>
              </CardContent>
            </Card>

            {/* OTA Bookings */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">🌐 OTA Bookings</CardTitle>
                <StatusBadge status="warning">Monitor</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Online travel agency performance, commission costs, and channel optimization.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Channel:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Booking.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Share:</span>
                    <span className="font-medium text-warning flex items-center gap-1">📉 32% share</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Cost:</span>
                    <span className="font-medium">₹45,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion Rate:</span>
                    <span className="font-medium">4.2%</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open OTA Report
                </Button>
              </CardContent>
            </Card>

            {/* Online Reservations */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">💻 Online Reservations</CardTitle>
                <StatusBadge status="success">Growing</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Direct website bookings, conversion funnel analysis, and digital marketing ROI.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion Rate:</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 3.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Direct Revenue:</span>
                    <span className="font-medium">₹1.8L (35% of total)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Website Visits:</span>
                    <span className="font-medium">12,450 this month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile Bookings:</span>
                    <span className="font-medium">68% of online</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Online Report
                </Button>
              </CardContent>
            </Card>

            {/* Checkout-Wise Bookings */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">🏨 Checkout-Wise Bookings</CardTitle>
                <StatusBadge status="success">Active</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Checkout performance, payment collection rates, and settlement tracking.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collection Rate:</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 91.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Collected:</span>
                    <span className="font-medium">₹11.7L collected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Settlements:</span>
                    <span className="font-medium">₹85,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Settlement Time:</span>
                    <span className="font-medium">2.3 days</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Checkout Report
                </Button>
              </CardContent>
            </Card>

            {/* Complimentary Report */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">🎁 Complimentary Report</CardTitle>
                <StatusBadge status="warning">Monitor</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Complimentary stays, approval workflows, and impact on revenue.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Month:</span>
                    <span className="font-medium">12 stays</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Impact:</span>
                    <span className="font-medium text-warning flex items-center gap-1">📉 ₹1.8L value</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval Rate:</span>
                    <span className="font-medium">85% approved</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Reason:</span>
                    <span className="font-medium">VIP Guest (40%)</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Complimentary Report
                </Button>
              </CardContent>
            </Card>

            {/* Voucher Report */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">🎫 Voucher Report</CardTitle>
                <StatusBadge status="success">Active</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Voucher redemptions, promotional campaigns, and discount tracking.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redeemed:</span>
                    <span className="font-medium">67 vouchers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 ₹1.35L value</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redemption Rate:</span>
                    <span className="font-medium">78% redeemed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Campaign:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Summer Special</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Voucher Report
                </Button>
              </CardContent>
            </Card>

            {/* Auto-Release Summary */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">⏰ Auto-Release Summary</CardTitle>
                <StatusBadge status="warning">Action Needed</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Automated booking releases, efficiency metrics, and improvement opportunities.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-Released:</span>
                    <span className="font-medium">15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Release Rate:</span>
                    <span className="font-medium text-warning flex items-center gap-1">📉 4.8% rate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Lost:</span>
                    <span className="font-medium">₹2.1L potential</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Efficiency:</span>
                    <span className="font-medium">95.2% retained</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Auto-Release Report
                </Button>
              </CardContent>
            </Card>

            {/* History Bookings */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">📊 History Bookings</CardTitle>
                <StatusBadge status="success">Available</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Historical booking trends, seasonal patterns, and year-over-year comparisons.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Range:</span>
                    <span className="font-medium">3 years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Bookings:</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 4,127 bookings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">YoY Growth:</span>
                    <span className="font-medium">+23.5% vs last year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Season:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Dec-Jan</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open History Report
                </Button>
              </CardContent>
            </Card>

            {/* Future Bookings Pipeline */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  🔮 Future Bookings Pipeline
                </CardTitle>
                <StatusBadge status="success">Strong</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Upcoming bookings, revenue forecasts, and capacity planning insights.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next 30 days:</span>
                    <span className="font-medium">189</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Revenue:</span>
                    <span className="font-medium text-success flex items-center gap-1">📈 ₹6.8L expected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Occupancy Forecast:</span>
                    <span className="font-medium">87% projected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Period:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Week 3-4</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Pipeline Report
                </Button>
              </CardContent>
            </Card>

            {/* Discount Governance */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">💰 Discount Governance</CardTitle>
                <StatusBadge status="warning">Review</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Discount approvals, authorization levels, and revenue impact analysis.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Discount:</span>
                    <span className="font-medium">14.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Impact:</span>
                    <span className="font-medium text-warning flex items-center gap-1">📉 ₹2.8L impact</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval Rate:</span>
                    <span className="font-medium">92% approved</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Approver:</span>
                    <span className="font-medium flex items-center gap-1">🥇 Manager Level</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Discount Report
                </Button>
              </CardContent>
            </Card>

            {/* Booking Cancellations */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">❌ Booking Cancellations</CardTitle>
                <StatusBadge status="danger">High</StatusBadge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Cancellation reasons, patterns, and retention strategies analysis.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Month:</span>
                    <span className="font-medium">29</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancellation Rate:</span>
                    <span className="font-medium text-danger flex items-center gap-1">📉 9.3% rate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Lost:</span>
                    <span className="font-medium">₹1.2L lost</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top Reason:</span>
                    <span className="font-medium flex items-center gap-1">🥉 Change of Plans</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#009689] text-white hover:bg-[#007a6b] transition-colors">
                  Open Cancellation Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
