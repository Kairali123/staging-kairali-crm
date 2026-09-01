import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

function getMockCalendarEvents() {
  const today = new Date()
  const d0 = new Date(today)
  const d1 = new Date(today)
  d1.setDate(today.getDate() + 1)
  const d2 = new Date(today)
  d2.setDate(today.getDate() + 2)

  const date0Str = d0.toISOString().split("T")[0]
  const date1Str = d1.toISOString().split("T")[0]
  const date2Str = d2.toISOString().split("T")[0]

  return [
    {
      id: "C-1001",
      title: "Mrs. Priya Nair - General Consultation",
      start: `${date0Str}T10:00:00Z`,
      end: `${date0Str}T10:45:00Z`,
      status: "completed",
      stage: 6,
      patientName: "Mrs. Priya Nair",
    },
    {
      id: "C-1002",
      title: "Mr. Rajesh Kumar - Follow-up",
      start: `${date0Str}T14:30:00Z`,
      end: `${date0Str}T15:00:00Z`,
      status: "pending",
      stage: 4,
      patientName: "Mr. Rajesh Kumar",
    },
    {
      id: "C-1003",
      title: "Ms. Anjali Singh - Specialized Treatment",
      start: `${date1Str}T11:00:00Z`,
      end: `${date1Str}T12:00:00Z`,
      status: "in_progress",
      stage: 5,
      patientName: "Ms. Anjali Singh",
    },
    {
      id: "C-1004",
      title: "Mr. Vikram Patel - Initial Consultation",
      start: `${date2Str}T09:30:00Z`,
      end: `${date2Str}T10:15:00Z`,
      status: "upcoming",
      stage: 2,
      patientName: "Mr. Vikram Patel",
    },
  ]
}

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  // Extract optional filters
  const doctorId = searchParams.get("doctorId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const property = searchParams.getAll("property[]")
  const stage = searchParams.getAll("stage[]")
  const status = searchParams.getAll("status[]")
  const doer = searchParams.getAll("doer[]")
  const q = searchParams.get("q")

  const transformedEvents = getMockCalendarEvents().map((event) => ({
    id: event.id,
    title: event.title,
    patientName: event.patientName,
    patientId: event.id,
    stage: getStageNameFromNumber(event.stage),
    status: event.status === "in_progress" ? "pending" : event.status,
    startTime: new Date(event.start).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    endTime: new Date(event.end).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    doer: "Dr. Smith",
    property: "KAPPL",
    date: event.start,
  }))

  // Apply filters (mock implementation)
  let filteredEvents = [...transformedEvents]

  if (status.length > 0) {
    filteredEvents = filteredEvents.filter((event) => status.includes(event.status))
  }

  if (stage.length > 0) {
    filteredEvents = filteredEvents.filter((event) => stage.includes(event.stage))
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  return NextResponse.json({ events: filteredEvents })
}

function getStageNameFromNumber(stage: number): string {
  const stageNames = [
    "Intake",
    "Appointment Fix",
    "Pre-Consult Docs",
    "Day-Of Reminder",
    "Post-Consult Upload",
    "Handover to KAPPL/KTAHV",
  ]
  return stageNames[stage - 1] || "Unknown"
}
