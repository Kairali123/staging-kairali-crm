"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  ArrowLeft,
  Eye,
  CheckCircle,
  Clock,
} from "lucide-react"
import Link from "next/link"

export default function UnverifiedBookingsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  // Mock data for unverified bookings
  const unverifiedBookings = [
    {
      id: "BK101",
      guestName: "Anita Desai",
      phone: "+91 9876543213",
      email: "anita@email.com",
      checkIn: "2024-01-25",
      checkOut: "2024-01-28",
      package: "Ayurvedic Consultation",
      roomType: "Standard",
      amount: 8000,
      status: "Pending Verification",
      priority: "High",
      source: "Direct Website",
      submittedDate: "2024-01-20",
      daysWaiting: 5,
      reason: "Document verification pending",
    },
    {
      id: "BK102",
      guestName: "Vikram Singh",
      phone: "+91 9876543214",
      email: "vikram@email.com",
      checkIn: "2024-01-30",
      checkOut: "2024-02-02",
      package: "Wellness Retreat",
      roomType: "Deluxe",
      amount: 18000,
      status: "Under Review",
      priority: "Medium",
      source: "Expedia",
      submittedDate: "2024-01-18",
      daysWaiting: 7,
      reason: "Payment verification required",
    },
    {
      id: "BK103",
      guestName: "Priya Nair",
      phone: "+91 9876543215",
      email: "priya@email.com",
      checkIn: "2024-02-05",
      checkOut: "2024-02-08",
      package: "Detox Program",
      roomType: "Premium",
      amount: 22000,
      status: "Pending Verification",
      priority: "High",
      source: "Travel Agent",
      submittedDate: "2024-01-15",
      daysWaiting: 10,
      reason: "Medical history review needed",
    },
    // Add more mock data...
  ]

  const filteredBookings = unverifiedBookings.filter((booking) => {
    const matchesSearch =
      booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.includes(searchTerm) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPriority = priorityFilter === "all" || booking.priority.toLowerCase() === priorityFilter

    return matchesSearch && matchesPriority
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Verification":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "Under Review":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

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
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                Unverified Bookings
              </h1>
              <p className="text-lg text-slate-600">Bookings requiring verification and review</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            Bulk Verify
          </Button>
          <Button variant="outline" className="border-slate-300 hover:bg-slate-50 bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Pending Review</p>
                <p className="text-3xl font-bold text-amber-700">30</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">High Priority</p>
                <p className="text-3xl font-bold text-red-700">12</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Potential Revenue</p>
                <p className="text-3xl font-bold text-blue-700">₹30.2L</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Wait Time</p>
                <p className="text-3xl font-bold text-purple-700">7.3 days</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
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
                  placeholder="Search by guest name, booking ID, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Unverified Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Unverified Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Guest Details</TableHead>
                  <TableHead>Check-in/Check-out</TableHead>
                  <TableHead>Package & Room</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Waiting</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.guestName}</div>
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {booking.phone}
                        </div>
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {booking.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">In:</span>{" "}
                          {new Date(booking.checkIn).toLocaleDateString("en-IN")}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Out:</span>{" "}
                          {new Date(booking.checkOut).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.package}</div>
                        <div className="text-sm text-slate-600">{booking.roomType}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">₹{booking.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(booking.priority)}>{booking.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`font-medium ${booking.daysWaiting > 7 ? "text-red-600" : booking.daysWaiting > 3 ? "text-amber-600" : "text-green-600"}`}
                      >
                        {booking.daysWaiting} days
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600 max-w-32 truncate" title={booking.reason}>
                        {booking.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
