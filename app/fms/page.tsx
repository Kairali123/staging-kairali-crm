"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFMS } from "@/hooks/use-fms"
import { BackButton } from "@/components/back-button"
import {
  Calendar,
  FileText,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  Stethoscope,
  User,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

export default function FMSPage() {
  const { stats, loading, syncWithGoogleSheets } = useFMS()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    const result = await syncWithGoogleSheets()
    setSyncing(false)

    if (result.success) {
      toast.success("Data synchronized successfully!")
    } else {
      toast.error("Sync failed: " + result.error)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <BackButton />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">FMS Integration Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync with Google Sheets"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                V3 System
              </CardTitle>
              <CardDescription>Version 3 management and configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/fms/v3">
                  <Settings className="mr-2 h-4 w-4" />
                  Access V3 System
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                Riya Sharma
              </CardTitle>
              <CardDescription>Personal management and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/fms/riya-sharma">
                  <User className="mr-2 h-4 w-4" />
                  View Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-green-600" />
                Doctor Consultation FMS
              </CardTitle>
              <CardDescription>Medical consultation tracking and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/fms/doctor-consultation">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Manage Consultations
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">{stats.todayBookings} today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingBookings}</div>
              <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openComplaints}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionTime}d</div>
              <p className="text-xs text-muted-foreground">Average time to resolve</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                KTAHV Client Booking FMS
              </CardTitle>
              <CardDescription>Manage client appointments and bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Today's Bookings</p>
                  <p className="text-2xl font-bold">{stats.todayBookings}</p>
                </div>
                <Badge variant={stats.pendingBookings > 0 ? "destructive" : "default"}>
                  {stats.pendingBookings} Pending
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-lg font-semibold text-green-600">{stats.completedBookings}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/fms/bookings">
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage Bookings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href="/fms/bookings/new">New Booking</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                KTAHV CAPA FMS
              </CardTitle>
              <CardDescription>Customer complaints and corrective actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Open Complaints</p>
                  <p className="text-2xl font-bold">{stats.openComplaints}</p>
                </div>
                <Badge variant={stats.openComplaints > 5 ? "destructive" : "secondary"}>
                  {stats.openComplaints > 5 ? "High" : "Normal"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Resolved</p>
                  <p className="text-lg font-semibold text-green-600">{stats.resolvedComplaints}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/fms/complaints">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Manage CAPA
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href="/fms/complaints/new">New Complaint</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Google Sheets Integration Status
            </CardTitle>
            <CardDescription>Real-time synchronization with Google Sheets FMS systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Last Sync</p>
                <p className="text-sm text-muted-foreground">{new Date().toLocaleString()}</p>
              </div>
              <Badge variant="default">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>KTAHV CLIENT BOOKING FMS</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>KTAHV CAPA FMS</span>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
