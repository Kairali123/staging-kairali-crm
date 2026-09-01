"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ChevronLeft, ChevronRight, Eye, Plus, Clock, User, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface CalendarEvent {
  id: string
  title: string
  patientName: string
  patientId: string
  stage: string
  status: "upcoming" | "pending" | "completed" | "overdue"
  startTime: string
  endTime: string
  doer: string
  property: string
  date: string
}

const statusColors = {
  upcoming: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
}

export default function DoctorConsultationCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [stageFilter, setStageFilter] = useState("all")
  const [doerFilter, setDoerFilter] = useState("all")
  const [propertyFilter, setPropertyFilter] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [currentDate, stageFilter, doerFilter, propertyFilter])

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        date: currentDate.toISOString(),
        view,
        stage: stageFilter,
        doer: doerFilter,
        property: propertyFilter,
      })

      const response = await fetch(`/api/doctor/calendar?${params}`)
      const data = await response.json()
      setEvents(Array.isArray(data) ? data : data.events || [])
      setLoading(false)
    } catch (error) {
      console.error("Error fetching events:", error)
      setEvents([])
      setLoading(false)
    }
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const getDateRange = () => {
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    } else if (view === "week") {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    } else {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startDate = new Date(startOfMonth)
    startDate.setDate(startDate.getDate() - startOfMonth.getDay())

    const days = []
    const currentDateObj = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dayEvents = events.filter((event) => new Date(event.date).toDateString() === currentDateObj.toDateString())

      days.push(
        <div
          key={i}
          className={`min-h-[120px] p-2 border border-[#dfe7e2] ${
            currentDateObj.getMonth() !== currentDate.getMonth() ? "bg-gray-50 text-gray-400" : "bg-white"
          }`}
        >
          <div className="font-medium text-sm mb-2">{currentDateObj.getDate()}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <Sheet key={event.id}>
                <SheetTrigger asChild>
                  <div
                    className={`text-xs p-1 rounded cursor-pointer ${statusColors[event.status]}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="truncate">{event.patientName}</div>
                    <div className="truncate">{event.startTime}</div>
                  </div>
                </SheetTrigger>
                <SheetContent>
                  <EventDrawer event={selectedEvent} />
                </SheetContent>
              </Sheet>
            ))}
            {dayEvents.length > 3 && <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>}
          </div>
        </div>,
      )
      currentDateObj.setDate(currentDateObj.getDate() + 1)
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-[#dfe7e2]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-3 bg-[#2f6b4f] text-white text-center font-medium">
            {day}
          </div>
        ))}
        {days}
      </div>
    )
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)

      const dayEvents = events.filter((event) => new Date(event.date).toDateString() === day.toDateString())

      days.push(
        <div key={i} className="border-r border-[#dfe7e2] last:border-r-0">
          <div className="p-3 bg-[#2f6b4f] text-white text-center font-medium">
            <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
            <div className="text-lg">{day.getDate()}</div>
          </div>
          <div className="p-2 space-y-2 min-h-[400px]">
            {dayEvents.map((event) => (
              <Sheet key={event.id}>
                <SheetTrigger asChild>
                  <div
                    className={`p-2 rounded cursor-pointer ${statusColors[event.status]}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="font-medium text-sm">{event.patientName}</div>
                    <div className="text-xs">
                      {event.startTime} - {event.endTime}
                    </div>
                    <div className="text-xs">{event.stage}</div>
                  </div>
                </SheetTrigger>
                <SheetContent>
                  <EventDrawer event={selectedEvent} />
                </SheetContent>
              </Sheet>
            ))}
          </div>
        </div>,
      )
    }

    return <div className="grid grid-cols-7 border border-[#dfe7e2]">{days}</div>
  }

  const renderDayView = () => {
    const dayEvents = events.filter((event) => new Date(event.date).toDateString() === currentDate.toDateString())

    return (
      <div className="border border-[#dfe7e2] bg-white">
        <div className="p-4 bg-[#2f6b4f] text-white">
          <h3 className="text-lg font-medium">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {dayEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No consultations scheduled for this day</p>
          ) : (
            dayEvents.map((event) => (
              <Sheet key={event.id}>
                <SheetTrigger asChild>
                  <Card
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                      event.status === "upcoming"
                        ? "border-l-blue-500"
                        : event.status === "pending"
                          ? "border-l-yellow-500"
                          : event.status === "completed"
                            ? "border-l-green-500"
                            : "border-l-red-500"
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-[#1f2a2e]">{event.patientName}</h4>
                          <p className="text-sm text-gray-600">{event.patientId}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {event.startTime} - {event.endTime}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {event.doer}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.property}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={statusColors[event.status]}>{event.status}</Badge>
                          <p className="text-sm text-gray-600 mt-1">{event.stage}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>
                <SheetContent>
                  <EventDrawer event={selectedEvent} />
                </SheetContent>
              </Sheet>
            ))
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2f6b4f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/doctor-consultation">
            <Button
              variant="outline"
              size="sm"
              className="border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1f2a2e]">Consultation Calendar</h1>
            <p className="text-gray-600">Schedule and manage consultation appointments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/doctor-consultation/history">
            <Button
              variant="outline"
              className="border-[#b6864a] text-[#b6864a] hover:bg-[#b6864a] hover:text-white bg-transparent"
            >
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-[#dfe7e2]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-medium text-[#1f2a2e] min-w-[200px] text-center">{getDateRange()}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                className="border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              {["month", "week", "day"].map((viewType) => (
                <Button
                  key={viewType}
                  variant={view === viewType ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView(viewType as any)}
                  className={
                    view === viewType
                      ? "bg-[#2f6b4f] hover:bg-[#2f6b4f]/90"
                      : "border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white"
                  }
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full md:w-48 border-[#dfe7e2]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Intake">Intake</SelectItem>
                <SelectItem value="Appointment Fix">Appointment Fix</SelectItem>
                <SelectItem value="Pre-Consult Docs">Pre-Consult Docs</SelectItem>
                <SelectItem value="Day-Of Reminder">Day-Of Reminder</SelectItem>
                <SelectItem value="Post-Consult Upload">Post-Consult Upload</SelectItem>
                <SelectItem value="Handover to KAPPL/KTAHV">Handover to KAPPL/KTAHV</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doerFilter} onValueChange={setDoerFilter}>
              <SelectTrigger className="w-full md:w-48 border-[#dfe7e2]">
                <SelectValue placeholder="Filter by doer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doers</SelectItem>
                <SelectItem value="Dr. Smith">Dr. Smith</SelectItem>
                <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                <SelectItem value="Dr. Williams">Dr. Williams</SelectItem>
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full md:w-48 border-[#dfe7e2]">
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="KAPPL">KAPPL</SelectItem>
                <SelectItem value="KTAHV">KTAHV</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <div>
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
      </div>
    </div>
  )
}

function EventDrawer({ event }: { event: CalendarEvent | null }) {
  if (!event) return null

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="text-[#1f2a2e]">Consultation Details</SheetTitle>
      </SheetHeader>

      <Card className="border-[#dfe7e2]">
        <CardHeader>
          <CardTitle className="text-[#1f2a2e]">Event Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Patient Name</label>
              <p className="text-[#1f2a2e]">{event.patientName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Patient ID</label>
              <p className="text-[#1f2a2e]">{event.patientId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Stage</label>
              <Badge variant="outline" className="border-[#2f6b4f] text-[#2f6b4f]">
                {event.stage}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <Badge className={statusColors[event.status]}>{event.status}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Time</label>
              <p className="text-[#1f2a2e]">
                {event.startTime} - {event.endTime}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Assigned Doer</label>
              <p className="text-[#1f2a2e]">{event.doer}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Property</label>
              <p className="text-[#1f2a2e]">{event.property}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Link href={`/doctor-consultation?consultation=${event.id}`}>
              <Button size="sm" className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
            <Link href={`/doctor-consultation/prescription/new?consultation=${event.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-[#b6864a] text-[#b6864a] hover:bg-[#b6864a] hover:text-white bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Prescription
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
