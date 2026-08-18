"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BackButton } from "@/components/back-button"
import { Stethoscope, Users, Clock, Search, Plus, FileText } from "lucide-react"
import { useState } from "react"

export default function DoctorConsultationPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const consultations = [
    {
      id: "CONS001",
      patientName: "Mrs. Priya Nair",
      doctor: "Dr. Riya Sharma",
      date: "2024-01-15",
      time: "10:00 AM",
      type: "General Consultation",
      status: "Completed",
      duration: "45 min",
    },
    {
      id: "CONS002",
      patientName: "Mr. Rajesh Kumar",
      doctor: "Dr. Riya Sharma",
      date: "2024-01-15",
      time: "2:30 PM",
      type: "Follow-up",
      status: "Scheduled",
      duration: "30 min",
    },
    {
      id: "CONS003",
      patientName: "Ms. Anjali Singh",
      doctor: "Dr. Amit Patel",
      date: "2024-01-16",
      time: "11:00 AM",
      type: "Specialized Treatment",
      status: "In Progress",
      duration: "60 min",
    },
  ]

  const filteredConsultations = consultations.filter(
    (consultation) =>
      consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <BackButton />
        <h2 className="text-3xl font-bold tracking-tight">Doctor Consultation FMS</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Consultations</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Scheduled appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">On duty today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Consultation</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42min</div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96%</div>
            <p className="text-xs text-muted-foreground">Patient satisfaction</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Consultation Management</CardTitle>
              <CardDescription>Track and manage doctor consultations</CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Consultation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search consultations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-3">
            {filteredConsultations.map((consultation) => (
              <div key={consultation.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{consultation.patientName}</p>
                    <Badge variant="outline">
                      {consultation.id}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {consultation.doctor} • {consultation.type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {consultation.date} at {consultation.time} • {consultation.duration}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <Badge
                    variant={
                      consultation.status === "Completed"
                        ? "default"
                        : consultation.status === "In Progress"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {consultation.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                    <Button size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
