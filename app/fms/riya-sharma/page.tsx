"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BackButton } from "@/components/back-button"
import { User, Calendar, Phone, Mail, MapPin, Clock, CheckCircle } from "lucide-react"

export default function RiyaSharmaPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <BackButton />
        <h2 className="text-3xl font-bold tracking-tight">Riya Sharma - Profile Management</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src="/professional-woman-doctor.png" />
              <AvatarFallback>RS</AvatarFallback>
            </Avatar>
            <CardTitle>Dr. Riya Sharma</CardTitle>
            <CardDescription>Senior Consultant - KTAHV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                riya.sharma@ktahv.com
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                +91 98765 43210
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Kairali Ayurvedic Centre
              </div>
            </div>
            <Badge variant="default" className="w-full justify-center">
              Active Status
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Current month statistics and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">156</div>
                <p className="text-sm text-muted-foreground">Consultations</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">94%</div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">28</div>
                <p className="text-sm text-muted-foreground">Working Days</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">4.8</div>
                <p className="text-sm text-muted-foreground">Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Appointments and consultations for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Mrs. Priya Nair</p>
                  <p className="text-sm text-muted-foreground">General Consultation</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">10:00 AM</p>
                  <Badge variant="default">
                    Confirmed
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Mr. Rajesh Kumar</p>
                  <p className="text-sm text-muted-foreground">Follow-up</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">2:30 PM</p>
                  <Badge variant="secondary">
                    Pending
                  </Badge>
                </div>
              </div>
            </div>
            <Button className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              View Full Schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Completed consultation with Patient #1234</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 mt-1 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Updated treatment plan for chronic case</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Scheduled follow-up appointments</p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
            <Button className="w-full bg-transparent" variant="outline">
              <User className="mr-2 h-4 w-4" />
              View All Activities
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
