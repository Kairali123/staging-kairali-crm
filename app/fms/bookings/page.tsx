"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Download,
  Upload,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Globe,
  CreditCard,
  Gift,
  History,
  Settings,
  XCircle,
  Clock,
  DollarSign,
  BarChart3,
  PieChart,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Zap,
  Eye,
  TrendingDown,
  Percent,
  FileCheck,
} from "lucide-react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Tooltip,
  Legend,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function BookingsPage() {
  const [dateFilter, setDateFilter] = useState("today")
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" })

  const [searchTerm, setSearchTerm] = useState("")

  const verificationStats = {
    verified: {
      active: 70,
      total: 50,
      confirmed: 50,
      invoiceAmount: 20200,
      conversionRate: 29,
      percentage: 71,
      trend: { value: 12.5, direction: "up" },
    },
    unverified: {
      reviewNeeded: 30,
      total: 20,
      pending: 20,
      invoiceAmount: 30200,
      conversionRate: 21,
      percentage: 29,
      trend: { value: 8.3, direction: "down" },
      pendingReasons: {
        salesTeam: {
          count: 12,
          bookings: [
            {
              id: "BK001",
              guestName: "Rajesh Kumar",
              status: "Follow-up Required",
              remarks: "Customer needs pricing clarification",
              assignedTo: "Priya S.",
              daysWaiting: 3,
            },
            {
              id: "BK002",
              guestName: "Anita Sharma",
              status: "Documentation Pending",
              remarks: "ID proof verification needed",
              assignedTo: "Rahul M.",
              daysWaiting: 2,
            },
            {
              id: "BK003",
              guestName: "Vikram Singh",
              status: "Payment Confirmation",
              remarks: "Awaiting advance payment",
              assignedTo: "Neha K.",
              daysWaiting: 5,
            },
          ],
        },
        accountsTeam: {
          count: 10,
          bookings: [
            {
              id: "BK004",
              guestName: "Meera Patel",
              status: "Payment Verification",
              remarks: "Bank transfer confirmation pending",
              assignedTo: "Accounts Team",
              daysWaiting: 1,
            },
            {
              id: "BK005",
              guestName: "Suresh Gupta",
              status: "Invoice Generation",
              remarks: "GST details verification required",
              assignedTo: "Finance Dept",
              daysWaiting: 4,
            },
            {
              id: "BK006",
              guestName: "Kavita Joshi",
              status: "Refund Processing",
              remarks: "Cancellation refund approval needed",
              assignedTo: "Accounts Head",
              daysWaiting: 2,
            },
          ],
        },
        frontOffice: {
          count: 8,
          bookings: [
            {
              id: "BK007",
              guestName: "Amit Verma",
              status: "Room Allocation",
              remarks: "Special room request pending approval",
              assignedTo: "Front Office",
              daysWaiting: 1,
            },
            {
              id: "BK008",
              guestName: "Deepika Roy",
              status: "Check-in Preparation",
              remarks: "Early check-in arrangement needed",
              assignedTo: "Reception Team",
              daysWaiting: 3,
            },
            {
              id: "BK009",
              guestName: "Ravi Nair",
              status: "Service Confirmation",
              remarks: "Ayurvedic treatment schedule pending",
              assignedTo: "Guest Relations",
              daysWaiting: 2,
            },
          ],
        },
      },
    },
  }

  const leadSourceData = [
    {
      name: "Facebook",
      count: 156,
      amount: 45.2,
      percentage: 18.5,
      trend: "up",
      growth: 12.3,
      color: "#1877F2",
      icon: "📘",
    },
    {
      name: "Google",
      count: 142,
      amount: 41.8,
      percentage: 17.1,
      trend: "up",
      growth: 8.7,
      color: "#4285F4",
      icon: "🔍",
    },
    {
      name: "PriyaSharma AI-Web",
      count: 128,
      amount: 38.4,
      percentage: 15.7,
      trend: "up",
      growth: 15.2,
      color: "#10B981",
      icon: "🤖",
    },
    {
      name: "PriyaSharma AI-WhatsApp",
      count: 115,
      amount: 34.5,
      percentage: 14.1,
      trend: "up",
      growth: 22.1,
      color: "#25D366",
      icon: "💬",
    },
    {
      name: "Website",
      count: 98,
      amount: 29.4,
      percentage: 12.0,
      trend: "down",
      growth: -3.2,
      color: "#6366F1",
      icon: "🌐",
    },
    {
      name: "Site Exit Pop-Up",
      count: 87,
      amount: 26.1,
      percentage: 10.7,
      trend: "up",
      growth: 5.8,
      color: "#F59E0B",
      icon: "⚡",
    },
    {
      name: "Reference",
      count: 76,
      amount: 22.8,
      percentage: 9.3,
      trend: "up",
      growth: 7.4,
      color: "#8B5CF6",
      icon: "👥",
    },
    {
      name: "Others",
      count: 65,
      amount: 19.5,
      percentage: 8.0,
      trend: "down",
      growth: -1.8,
      color: "#6B7280",
      icon: "📊",
    },
    {
      name: "PriyaSharma AI-Instagram",
      count: 54,
      amount: 16.2,
      percentage: 6.6,
      trend: "up",
      growth: 18.9,
      color: "#E4405F",
      icon: "📸",
    },
    {
      name: "PriyaSharma AI Chat",
      count: 43,
      amount: 12.9,
      percentage: 5.3,
      trend: "up",
      growth: 11.2,
      color: "#0EA5E9",
      icon: "💭",
    },
    {
      name: "Referral",
      count: 38,
      amount: 11.4,
      percentage: 4.7,
      trend: "up",
      growth: 9.1,
      color: "#F97316",
      icon: "🔗",
    },
    {
      name: "Zopim",
      count: 32,
      amount: 9.6,
      percentage: 3.9,
      trend: "down",
      growth: -2.5,
      color: "#EF4444",
      icon: "💬",
    },
    {
      name: "IVR",
      count: 28,
      amount: 8.4,
      percentage: 3.4,
      trend: "down",
      growth: -4.1,
      color: "#84CC16",
      icon: "📞",
    },
    {
      name: "Magento Failure Order",
      count: 24,
      amount: 7.2,
      percentage: 2.9,
      trend: "down",
      growth: -6.3,
      color: "#F43F5E",
      icon: "⚠️",
    },
    {
      name: "OTA",
      count: 21,
      amount: 6.3,
      percentage: 2.6,
      trend: "up",
      growth: 3.7,
      color: "#06B6D4",
      icon: "✈️",
    },
    {
      name: "Online Booking Engine",
      count: 18,
      amount: 5.4,
      percentage: 2.2,
      trend: "up",
      growth: 4.2,
      color: "#8B5CF6",
      icon: "🎯",
    },
    {
      name: "Management",
      count: 15,
      amount: 4.5,
      percentage: 1.8,
      trend: "down",
      growth: -1.2,
      color: "#64748B",
      icon: "👔",
    },
    {
      name: "PriyaSharma AI-Facebook",
      count: 12,
      amount: 3.6,
      percentage: 1.5,
      trend: "up",
      growth: 25.8,
      color: "#1877F2",
      icon: "🤖",
    },
  ].sort((a, b) => b.count - a.count)

  const packagePerformanceData = [
    { package: "Panchakarma", bookings: 45, revenue: 12.5, occupancy: 85 },
    { package: "Ayurvedic Consultation", bookings: 32, revenue: 8.2, occupancy: 72 },
    { package: "Wellness Retreat", bookings: 28, revenue: 15.8, occupancy: 90 },
    { package: "Detox Program", bookings: 22, revenue: 9.4, occupancy: 68 },
  ]

  const autoReleaseData = [
    { month: "Jan", releases: 12, efficiency: 94.2 },
    { month: "Feb", releases: 8, efficiency: 96.1 },
    { month: "Mar", releases: 15, efficiency: 92.8 },
    { month: "Apr", releases: 6, efficiency: 97.5 },
    { month: "May", releases: 10, efficiency: 95.3 },
  ]

  const cancellationData = [
    { month: "Jan", cancellations: 18, refunds: 15.2 },
    { month: "Feb", cancellations: 12, refunds: 10.8 },
    { month: "Mar", cancellations: 25, refunds: 22.1 },
    { month: "Apr", cancellations: 14, refunds: 12.5 },
    { month: "May", cancellations: 20, refunds: 18.3 },
  ]

  const onlineReservationData = [
    { day: "Mon", bookings: 12, conversion: 3.2 },
    { day: "Tue", bookings: 18, conversion: 4.1 },
    { day: "Wed", bookings: 15, conversion: 3.8 },
    { day: "Thu", bookings: 22, conversion: 4.5 },
    { day: "Fri", bookings: 28, conversion: 5.2 },
    { day: "Sat", bookings: 35, conversion: 6.1 },
    { day: "Sun", bookings: 25, conversion: 4.8 },
  ]

  const otaChannels = [
    {
      name: "Booking.com",
      rating: 8.9,
      revenue: 3.6,
      bookings: 145,
      percentage: 32.1,
      growth: 12.5,
      commission: 15.0,
      color: "#0066CC",
      rank: 1,
    },
    {
      name: "Expedia",
      rating: 8.7,
      revenue: 2.6,
      bookings: 98,
      percentage: 21.7,
      growth: -3.2,
      commission: 18.0,
      color: "#FFC72C",
      rank: 2,
    },
    {
      name: "Agoda",
      rating: 8.8,
      revenue: 2.2,
      bookings: 87,
      percentage: 19.3,
      growth: 8.7,
      commission: 16.5,
      color: "#FF6B35",
      rank: 3,
    },
    {
      name: "MakeMyTrip",
      rating: 8.6,
      revenue: 1.8,
      bookings: 65,
      percentage: 14.4,
      growth: 5.3,
      commission: 12.0,
      color: "#E74C3C",
      rank: 4,
    },
    {
      name: "Goibibo",
      rating: 8.5,
      revenue: 1.4,
      bookings: 57,
      percentage: 12.6,
      growth: -1.8,
      commission: 14.0,
      color: "#F39C12",
      rank: 5,
    },
  ].sort((a, b) => b.revenue - a.revenue)

  const kpiData = {
    bookingsCreated: {
      value: 312,
      today: 18,
      week: 127,
      growth: 18.5,
      trend: "up",
      icon: Calendar,
    },
    bookingStatus: {
      confirmed: 238,
      percentage: 76.3,
      cancelled: 29,
      cancelledPercentage: 9.3,
      pending: 45,
      pendingPercentage: 14.4,
      trend: "up",
      growth: 5.2,
      icon: CheckCircle,
    },
    collections: {
      collected: 12.7,
      outstanding: 3.2,
      trend: "up",
      growth: 15.8,
      icon: DollarSign,
    },
    discount: {
      percentage: 14.2,
      avgPerBooking: 2847,
      trend: "down",
      growth: 2.1,
      icon: Target,
    },
    autoRelease: {
      count: 15,
      rate: 4.8,
      efficiency: 95.2,
      trend: "down",
      growth: 1.2,
      icon: Settings,
    },
    conversion: {
      rate: 71.4,
      target: 65,
      leads: 437,
      trend: "up",
      growth: 8.7,
      icon: TrendingUp,
    },
    alos: {
      value: 3.4,
      target: 3.0,
      trend: "up",
      growth: 6.3,
      icon: Clock,
    },
    occupancy: {
      rate: 82.3,
      occupied: 247,
      total: 300,
      trend: "up",
      growth: 4.1,
      icon: Activity,
    },
  } as const

  const detailedReports = [
    {
      title: "Employee-Wise Bookings",
      status: "Active",
      description: "Track individual salesperson performance, targets vs actuals, and commission calculations.",
      topPerformer: "Priya S.",
      performance: "116% of target",
      revenue: "₹4.2L this month",
      commission: "₹21,000",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Travel Agent Bookings",
      status: "Active",
      description: "Monitor travel agent partnerships, commission rates, and booking volumes.",
      topPerformer: "Skyline Tours",
      performance: "32 Active Agents",
      revenue: "₹2.4L this month",
      commission: "12.5% Avg Commission",
      icon: Globe,
      color: "text-blue-600",
    },
    {
      title: "OTA Bookings",
      status: "Monitor",
      description: "Online travel agency performance, commission costs, and channel optimization.",
      topPerformer: "Booking.com",
      performance: "32% market share",
      revenue: "₹45,000 Commission Cost",
      commission: "4.2% Conversion Rate",
      icon: ExternalLink,
      color: "text-orange-600",
    },
    {
      title: "Online Reservations",
      status: "Growing",
      description: "Direct website bookings, conversion funnel analysis, and digital marketing ROI.",
      topPerformer: "3.8% Conversion Rate",
      performance: "₹1.8L (35% of total)",
      revenue: "12,450 Website Visits",
      commission: "68% Mobile Bookings",
      icon: Globe,
      color: "text-green-600",
    },
    {
      title: "Checkout-Wise Bookings",
      status: "Active",
      description: "Checkout performance, payment collection rates, and settlement tracking.",
      topPerformer: "91.8% Collection Rate",
      performance: "₹11.7L collected",
      revenue: "₹85,000 Pending",
      commission: "2.3 days Avg Settlement",
      icon: CreditCard,
      color: "text-blue-600",
    },
    {
      title: "Complimentary Report",
      status: "Monitor",
      description: "Complimentary stays, approval workflows, and impact on revenue.",
      topPerformer: "12 stays This Month",
      performance: "₹1.8L value",
      revenue: "85% Approval Rate",
      commission: "VIP Guest (40%)",
      icon: Gift,
      color: "text-purple-600",
    },
    {
      title: "Voucher Report",
      status: "Active",
      description: "Voucher redemptions, promotional campaigns, and discount tracking.",
      topPerformer: "67 vouchers Redeemed",
      performance: "₹1.35L Total Value",
      revenue: "78% Redemption Rate",
      commission: "Summer Special",
      icon: Gift,
      color: "text-green-600",
    },
    {
      title: "Auto-Release Summary",
      status: "Action Needed",
      description: "Automated booking releases, efficiency metrics, and improvement opportunities.",
      topPerformer: "15 Auto-Released",
      performance: "4.8% Release Rate",
      revenue: "₹2.1L Revenue Lost",
      commission: "95.2% Efficiency",
      icon: Settings,
      color: "text-red-600",
    },
    {
      title: "History Bookings",
      status: "Available",
      description: "Historical booking trends, seasonal patterns, and year-over-year comparisons.",
      topPerformer: "3 years Data Range",
      performance: "4,127 Total Bookings",
      revenue: "+23.5% YoY Growth",
      commission: "Dec-Jan Peak Season",
      icon: History,
      color: "text-blue-600",
    },
    {
      title: "Future Bookings Pipeline",
      status: "Strong",
      description: "Upcoming bookings, revenue forecasts, and capacity planning insights.",
      topPerformer: "189 Next 30 days",
      performance: "₹6.8L Expected Revenue",
      revenue: "87% Occupancy Forecast",
      commission: "Week 3-4 Peak Period",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Discount Governance",
      status: "Review",
      description: "Discount approvals, authorization levels, and revenue impact analysis.",
      topPerformer: "14.2% Avg Discount",
      performance: "₹2.8L Revenue Impact",
      revenue: "92% Approval Rate",
      commission: "Manager Level",
      icon: Target,
      color: "text-yellow-600",
    },
    {
      title: "Booking Cancellations",
      status: "High",
      description: "Cancellation reasons, patterns, and retention strategies analysis.",
      topPerformer: "29 This Month",
      performance: "9.3% Cancellation Rate",
      revenue: "₹1.2L Revenue Lost",
      commission: "Change of Plans",
      icon: XCircle,
      color: "text-red-600",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Growing":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Monitor":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "Action Needed":
        return "bg-red-50 text-red-700 border-red-200"
      case "High":
        return "bg-red-50 text-red-700 border-red-200"
      case "Review":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "Available":
        return "bg-slate-50 text-slate-700 border-slate-200"
      case "Strong":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const TrendIndicator = ({ trend, growth }: { trend: "up" | "down"; growth: number }) => (
    <div className={`flex items-center gap-1 ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
      {trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      <span className="text-sm font-medium">{growth}%</span>
    </div>
  )

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Booking FMS</h1>
            <p className="text-slate-600 mt-1">Comprehensive booking management and analytics dashboard</p>
          </div>

          {/* Date Filter and Action Links moved to header */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <Calendar className="h-4 w-4 text-slate-600" />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customDateRange.from}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className="w-36"
                  />
                  <span className="text-slate-500">to</span>
                  <Input
                    type="date"
                    value={customDateRange.to}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className="w-36"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <a
                  href="https://script.google.com/macros/s/AKfycbxd1cRN0uqxEw1I6eoThGDI1vkYHQAyfJlYHc5d-NI4QsHf4AeBCGXWV7iKJKOFF2DE5g/exec?ktahvId=KTAHV-PMS-6699&user=Harpal%20Singh&bookingType=Individual&resId=4740"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  New Booking
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a
                  href="https://script.google.com/macros/s/AKfycbzzVJc9kRmXlfjepuxwr-3lmklapuXtRZ7YjIMMau_4bfmXiidoy8I8mcCDEhccGkHMVg/exec?bookingId=KTAHV-PMS-6699"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Payment Details
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSfzWW1e7fhnUqGebcQ_aV6zQuLXgZPSxc0v7goJK1NY5X58fQ/viewform?usp=pp_url&entry.509858388=KTAHV-PMS-6699&entry.1274588545=MR. DERRUAU"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileCheck className="mr-1 h-4 w-4" />
                  Approval Upload
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Verification Status */}
      {/* Removed grid layout and sidebar column - content now full width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ... existing verified bookings code ... */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-3 text-emerald-800">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                Verified Bookings
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1">Active</Badge>
                <TrendIndicator
                  trend={verificationStats.verified.trend.direction as "up" | "down"}
                  growth={verificationStats.verified.trend.value}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-700">{verificationStats.verified.active}</div>
                <div className="text-sm text-emerald-600 font-medium">Total Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-700">{verificationStats.verified.confirmed}</div>
                <div className="text-sm text-emerald-600 font-medium flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Confirmed
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-700">
                  ₹{verificationStats.verified.invoiceAmount.toLocaleString()}
                </div>
                <div className="text-sm text-emerald-600 font-medium flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Invoice Amount
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-700">{verificationStats.verified.conversionRate}%</div>
                <div className="text-sm text-emerald-600 font-medium flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Conversion Rate
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-100 rounded-lg">
              <Badge className="bg-emerald-200 text-emerald-800 border-emerald-300">
                <BarChart3 className="h-3 w-3 mr-1" />
                High
              </Badge>
              <span className="text-sm font-medium text-emerald-700">
                {verificationStats.verified.percentage}% of total bookings verified
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Employee-wise Performance</span>
              </div>

              <div className="space-y-3">
                {/* Top Performer */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        PK
                      </div>
                      <div>
                        <div className="font-semibold text-emerald-800">Pushpanshu Kumar</div>
                        <div className="text-xs text-emerald-600">Sales Executive</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">+18.5%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-emerald-700">24</div>
                      <div className="text-xs text-emerald-600">Bookings</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-700">₹4.2L</div>
                      <div className="text-xs text-emerald-600">Amount</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-700">34.3%</div>
                      <div className="text-xs text-emerald-600">Share</div>
                    </div>
                  </div>
                </div>

                {/* Second Performer */}
                <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        HS
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Harpal Singh</div>
                        <div className="text-xs text-slate-600">Sales Manager</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-medium text-green-600">+12.3%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-base font-bold text-slate-700">18</div>
                      <div className="text-xs text-slate-600">Bookings</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-700">₹3.1L</div>
                      <div className="text-xs text-slate-600">Amount</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-700">25.7%</div>
                      <div className="text-xs text-slate-600">Share</div>
                    </div>
                  </div>
                </div>

                {/* Third Performer */}
                <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        PK
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Pawan Kamra</div>
                        <div className="text-xs text-slate-600">Front Office</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-sm font-medium text-red-600">-5.2%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-base font-bold text-slate-700">12</div>
                      <div className="text-xs text-slate-600">Bookings</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-700">₹2.3L</div>
                      <div className="text-xs text-slate-600">Amount</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-700">17.1%</div>
                      <div className="text-xs text-slate-600">Share</div>
                    </div>
                  </div>
                </div>

                {/* View All Employees Link */}
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-transparent"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View All Employees (16 more)
                  </Button>
                </div>
              </div>
            </div>

            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/fms/bookings/verified">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Unverified Bookings */}
        <div className="lg:col-span-1">
          <Card className="border-amber-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-3 text-amber-800">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  Unverified Bookings
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1">Review Needed</Badge>
                  <TrendIndicator
                    trend={verificationStats.unverified.trend.direction as "up" | "down"}
                    growth={verificationStats.unverified.trend.value}
                  />
                </div>
              </div>

              {/* Header Statistics */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-2xl font-bold text-amber-800">{verificationStats.unverified.reviewNeeded}</div>
                  <div className="text-sm text-amber-600">Total Bookings</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-2xl font-bold text-amber-800">
                    ₹{verificationStats.unverified.invoiceAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-amber-600">Pending Amount</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* ... existing unverified bookings content without Employee Work Status Summary ... */}
              {/* Sales Team Pending */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-800">Sales Team Pending</span>
                  </div>
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {verificationStats.unverified.pendingReasons.salesTeam.count} bookings
                  </Badge>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      guestName: "John Smith",
                      id: "KTAHV-PMS-6701",
                      status: "Payment Pending",
                      assignedTo: "Harpal Singh",
                      daysWaiting: 3,
                      remarks: "Payment confirmation awaited from client",
                      delayReason: "Client payment processing",
                    },
                    {
                      guestName: "Sarah Johnson",
                      id: "KTAHV-PMS-6702",
                      status: "PI Generation Pending",
                      assignedTo: "Pawan Kamra",
                      daysWaiting: 5,
                      remarks: "Proforma Invoice generation in progress",
                      delayReason: "Document preparation delay",
                    },
                    {
                      guestName: "Mike Wilson",
                      id: "KTAHV-PMS-6703",
                      status: "Approval Upload Pending",
                      assignedTo: "Sadik Rehman",
                      daysWaiting: 2,
                      remarks: "Management approval document upload required",
                      delayReason: "Approval documentation pending",
                    },
                  ].map((booking, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-red-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-900">{booking.guestName}</span>
                          <span className="text-slate-600 ml-2">({booking.id})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-red-600 font-medium text-sm">{booking.status}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {booking.daysWaiting}d delay
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        <div className="font-medium">Remarks: {booking.remarks}</div>
                        <div className="text-slate-500 mt-1">Assigned to: {booking.assignedTo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounts Team Pending */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-800">Accounts Team Verification</span>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    {verificationStats.unverified.pendingReasons.accountsTeam.count} bookings
                  </Badge>
                </div>
                <div className="space-y-2">
                  {verificationStats.unverified.pendingReasons.accountsTeam.bookings
                    .slice(0, 2)
                    .map((booking, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm bg-white p-2 rounded border"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{booking.guestName}</span>
                          <span className="text-slate-600 ml-2">({booking.id})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-600 font-medium">{booking.status}</div>
                          <div className="text-xs text-slate-500">
                            {booking.assignedTo} • {booking.daysWaiting}d waiting
                          </div>
                        </div>
                      </div>
                    ))}
                  {verificationStats.unverified.pendingReasons.accountsTeam.count > 2 && (
                    <div className="text-xs text-orange-600 text-center">
                      +{verificationStats.unverified.pendingReasons.accountsTeam.count - 2} more bookings
                    </div>
                  )}
                </div>
              </div>

              {/* Front Office Team Pending */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Front Office Team</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {verificationStats.unverified.pendingReasons.frontOffice.count} bookings
                  </Badge>
                </div>
                <div className="space-y-2">
                  {verificationStats.unverified.pendingReasons.frontOffice.bookings
                    .slice(0, 2)
                    .map((booking, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm bg-white p-2 rounded border"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{booking.guestName}</span>
                          <span className="text-slate-600 ml-2">({booking.id})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-blue-600 font-medium">{booking.status}</div>
                          <div className="text-xs text-slate-500">
                            {booking.assignedTo} • {booking.daysWaiting}d waiting
                          </div>
                        </div>
                      </div>
                    ))}
                  {verificationStats.unverified.pendingReasons.frontOffice.count > 2 && (
                    <div className="text-xs text-blue-600 text-center">
                      +{verificationStats.unverified.pendingReasons.frontOffice.count - 2} more bookings
                    </div>
                  )}
                </div>
              </div>

              <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                <Link href="/fms/bookings/unverified">
                  <Eye className="mr-2 h-4 w-4" />
                  View All Pending Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-slate-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-slate-600" />
            </div>
            Employee Work Status Summary
          </CardTitle>
          <p className="text-slate-600">Overview of pending work across all team members</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-medium text-slate-700">Employee Name</th>
                  <th className="text-center p-3 font-medium text-slate-700">New Bookings</th>
                  <th className="text-center p-3 font-medium text-slate-700">Account Verify</th>
                  <th className="text-center p-3 font-medium text-slate-700">Final Transfer</th>
                  <th className="text-center p-3 font-medium text-slate-700">Delete Complete</th>
                  <th className="text-center p-3 font-medium text-slate-700">Total Pending</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "Pushpanshu Kumar",
                    newBookings: 26,
                    accountVerify: 8,
                    finalTransfer: 12,
                    deleteComplete: 4,
                  },
                  {
                    name: "Harpal Singh",
                    newBookings: 21,
                    accountVerify: 6,
                    finalTransfer: 9,
                    deleteComplete: 2,
                  },
                  { name: "Pawan Kamra", newBookings: 8, accountVerify: 3, finalTransfer: 5, deleteComplete: 1 },
                  {
                    name: "Sadik Rehman",
                    newBookings: 12,
                    accountVerify: 4,
                    finalTransfer: 7,
                    deleteComplete: 3,
                  },
                  { name: "Vibin S", newBookings: 7, accountVerify: 2, finalTransfer: 4, deleteComplete: 1 },
                  {
                    name: "Vikesh Kumar",
                    newBookings: 10,
                    accountVerify: 3,
                    finalTransfer: 6,
                    deleteComplete: 2,
                  },
                  { name: "Rohit Ahuja", newBookings: 10, accountVerify: 2, finalTransfer: 5, deleteComplete: 1 },
                  { name: "Suresh Kumar", newBookings: 0, accountVerify: 0, finalTransfer: 0, deleteComplete: 6 },
                ].map((employee, index) => {
                  const total =
                    employee.newBookings + employee.accountVerify + employee.finalTransfer + employee.deleteComplete
                  return (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{employee.name}</td>
                      <td className="text-center p-3">
                        <Badge
                          variant={
                            employee.newBookings > 15
                              ? "destructive"
                              : employee.newBookings > 5
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {employee.newBookings}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge
                          variant={
                            employee.accountVerify > 5
                              ? "destructive"
                              : employee.accountVerify > 2
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {employee.accountVerify}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge
                          variant={
                            employee.finalTransfer > 8
                              ? "destructive"
                              : employee.finalTransfer > 4
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {employee.finalTransfer}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge
                          variant={
                            employee.deleteComplete > 3
                              ? "destructive"
                              : employee.deleteComplete > 1
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {employee.deleteComplete}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge
                          variant={total > 25 ? "destructive" : total > 15 ? "secondary" : "default"}
                          className="font-semibold"
                        >
                          {total}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl flex items-center gap-3 text-slate-900">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            Analytics Charts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-10 pt-6">
          {/* Lead Source Distribution */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PieChart className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Lead Source Wise Distribution</h3>
                  <p className="text-sm text-slate-600">
                    Booking source breakdown with revenue impact and performance trends
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadSourceData.map((source, index) => (
                <Card
                  key={index}
                  className="p-4 border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-slate-300"
                >
                  <div className="space-y-3">
                    {/* Header with rank and source name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          #{index + 1}
                        </div>
                        <span className="text-lg">{source.icon}</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          source.trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {source.trend === "up" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(source.growth)}%
                      </div>
                    </div>

                    {/* Source name */}
                    <div className="font-semibold text-slate-900 text-sm leading-tight">{source.name}</div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{source.count}</div>
                        <div className="text-xs text-slate-500">Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold" style={{ color: source.color }}>
                          ₹{source.amount}L
                        </div>
                        <div className="text-xs text-slate-500">Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{source.percentage}%</div>
                        <div className="text-xs text-slate-500">Share</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${source.percentage}%`,
                          backgroundColor: source.color,
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {leadSourceData.reduce((sum, source) => sum + source.count, 0)}
                </div>
                <div className="text-sm text-blue-700">Total Bookings</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ₹{leadSourceData.reduce((sum, source) => sum + source.amount, 0).toFixed(1)}L
                </div>
                <div className="text-sm text-green-700">Total Revenue</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {leadSourceData.filter((source) => source.trend === "up").length}
                </div>
                <div className="text-sm text-purple-700">Growing Sources</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {(leadSourceData.reduce((sum, source) => sum + source.growth, 0) / leadSourceData.length).toFixed(1)}%
                </div>
                <div className="text-sm text-orange-700">Avg Growth</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Package Wise Performance
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Room category performance and occupancy rates</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={packagePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="package" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" radius={[4, 4, 0, 0]} />
                <Bar dataKey="occupancy" fill="#10b981" name="Occupancy %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Auto Release Policy Trends
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Monthly auto-release patterns and efficiency metrics</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={autoReleaseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="releases"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  name="Releases"
                  dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Efficiency %"
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cancellation Analysis */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Cancellation & Refund Analysis</h3>
            <p className="text-sm text-muted-foreground mb-4">Monthly cancellation trends and refund processing</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cancellationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Area type="monotone" dataKey="cancellations" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="refunds" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Online Reservation Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Online Reservation Performance</h3>
            <p className="text-sm text-muted-foreground mb-4">Daily website booking performance and conversion rates</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={onlineReservationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Bar dataKey="bookings" fill="#8884d8" />
                <Bar dataKey="conversion" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* OTA Channel Performance */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900">OTA Channel Performance</h3>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                5 Active Channels
              </Badge>
            </div>
            <p className="text-slate-600">Online travel agency booking volumes and commission rates</p>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">452</div>
                  <div className="text-sm text-blue-600">Total Bookings</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">₹11.6L</div>
                  <div className="text-sm text-green-600">Total Revenue</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700">15.1%</div>
                  <div className="text-sm text-purple-600">Avg Commission</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-700">8.7</div>
                  <div className="text-sm text-orange-600">Avg Rating</div>
                </div>
              </Card>
            </div>

            <div className="grid gap-4">
              {otaChannels.map((channel, index) => (
                <Card
                  key={index}
                  className="p-6 border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-slate-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: `${channel.color}20` }}>
                          <Globe className="h-6 w-6" style={{ color: channel.color }} />
                        </div>
                        <Badge
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: channel.color }}
                        >
                          {channel.rank}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-bold text-lg text-slate-900">{channel.name}</div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>Rating: {channel.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Percent className="h-4 w-4 text-slate-500" />
                            <span>Commission: {channel.commission}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {channel.growth > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <span
                        className={`text-sm font-semibold ${channel.growth > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {channel.growth > 0 ? "+" : ""}
                        {channel.growth}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xl font-bold text-slate-900">{channel.bookings}</div>
                      <div className="text-xs text-slate-600">Bookings</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xl font-bold" style={{ color: channel.color }}>
                        ₹{channel.revenue}L
                      </div>
                      <div className="text-xs text-slate-600">Revenue</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xl font-bold text-slate-900">{channel.percentage}%</div>
                      <div className="text-xs text-slate-600">Market Share</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xl font-bold text-slate-900">{channel.commission}%</div>
                      <div className="text-xs text-slate-600">Commission</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>Market Share</span>
                      <span>{channel.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${channel.percentage}%`,
                          backgroundColor: channel.color,
                        }}
                      ></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl flex items-center gap-3 text-slate-900">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            Key Performance Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-blue-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <kpiData.bookingsCreated.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <TrendIndicator trend={kpiData.bookingsCreated.trend} growth={kpiData.bookingsCreated.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Bookings Created</div>
                  <div className="text-3xl font-bold text-slate-900">{kpiData.bookingsCreated.value}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Today: {kpiData.bookingsCreated.today} • Week: {kpiData.bookingsCreated.week}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-blue-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-green-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <kpiData.bookingStatus.icon className="h-5 w-5 text-green-600" />
                  </div>
                  <TrendIndicator trend={kpiData.bookingStatus.trend} growth={kpiData.bookingStatus.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Booking Status</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Confirmed</span>
                      <span className="font-semibold text-green-600">
                        {kpiData.bookingStatus.confirmed} ({kpiData.bookingStatus.percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Cancelled</span>
                      <span className="font-semibold text-red-500">
                        {kpiData.bookingStatus.cancelled} ({kpiData.bookingStatus.cancelledPercentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Pending</span>
                      <span className="font-semibold text-amber-600">
                        {kpiData.bookingStatus.pending} ({kpiData.bookingStatus.pendingPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-green-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-emerald-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <kpiData.collections.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <TrendIndicator trend={kpiData.collections.trend} growth={kpiData.collections.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Collections vs Outstanding</div>
                  <div className="text-3xl font-bold text-emerald-600">₹{kpiData.collections.collected}L</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Collected • Outstanding: ₹{kpiData.collections.outstanding}L
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-emerald-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-orange-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <kpiData.discount.icon className="h-5 w-5 text-orange-600" />
                  </div>
                  <TrendIndicator trend={kpiData.discount.trend} growth={kpiData.discount.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Discount %</div>
                  <div className="text-3xl font-bold text-orange-600">{kpiData.discount.percentage}%</div>
                  <div className="text-xs text-slate-500 mt-1">
                    vs revenue • Avg: ₹{kpiData.discount.avgPerBooking.toLocaleString()} per booking
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-orange-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-purple-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <kpiData.autoRelease.icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <TrendIndicator trend={kpiData.autoRelease.trend} growth={kpiData.autoRelease.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Auto-Release Count & Rate</div>
                  <div className="text-3xl font-bold text-purple-600">{kpiData.autoRelease.count}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {kpiData.autoRelease.rate}% auto-release rate • Efficiency: {kpiData.autoRelease.efficiency}%
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-purple-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-indigo-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <kpiData.conversion.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <TrendIndicator trend={kpiData.conversion.trend} growth={kpiData.conversion.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Conversion %</div>
                  <div className="text-3xl font-bold text-indigo-600">{kpiData.conversion.rate}%</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Lead → Booking • Target: {kpiData.conversion.target}% | Leads: {kpiData.conversion.leads}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-indigo-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-teal-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <kpiData.alos.icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <TrendIndicator trend={kpiData.alos.trend} growth={kpiData.alos.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Avg Length of Stay (ALOS)</div>
                  <div className="text-3xl font-bold text-teal-600">{kpiData.alos.value}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    nights per booking • Target: {kpiData.alos.target} nights
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-teal-50">
                  View Full Report
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 hover:shadow-md transition-all duration-200 hover:border-cyan-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <kpiData.occupancy.icon className="h-5 w-5 text-cyan-600" />
                  </div>
                  <TrendIndicator trend={kpiData.occupancy.trend} growth={kpiData.occupancy.growth} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Occupancy Rate</div>
                  <div className="text-3xl font-bold text-cyan-600">{kpiData.occupancy.rate}%</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Current month • Occupied: {kpiData.occupancy.occupied}/{kpiData.occupancy.total} rooms
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent hover:bg-cyan-50">
                  View Full Report
                </Button>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Detailed Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {detailedReports.map((report, index) => (
              <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <report.icon className={`h-5 w-5 ${report.color}`} />
                      <div className="font-semibold text-sm">{report.title}</div>
                    </div>
                    <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">{report.description}</p>

                  <div className="space-y-1">
                    <div className="text-xs">
                      <span className="font-medium">Top Performer: </span>
                      <span className="text-blue-600">🏆 {report.topPerformer}</span>
                    </div>
                    <div className="text-xs">
                      <span className="font-medium">Performance: </span>
                      {report.performance}
                    </div>
                    <div className="text-xs">
                      <span className="font-medium">Total Revenue: </span>
                      {report.revenue}
                    </div>
                    <div className="text-xs">
                      <span className="font-medium">Commission Earned: </span>
                      {report.commission}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <Link
                      href={
                        report.title === "Employee-Wise Bookings"
                          ? "/fms/bookings/employee-wise"
                          : report.title === "Travel Agent Bookings"
                            ? "/fms/bookings/travel-agent"
                            : report.title === "OTA Bookings"
                              ? "/fms/bookings/ota"
                              : report.title === "Online Reservations"
                                ? "/fms/bookings/online"
                                : "#"
                      }
                    >
                      Open {report.title.split(" ")[0]} Report
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
