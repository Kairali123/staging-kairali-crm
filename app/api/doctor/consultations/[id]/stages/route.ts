import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { id: consultationId } = await params

  // Mock stage timeline data
  const mockStages = [
    {
      stage: 1,
      label: "Intake",
      doer: "System",
      problemSolver: "Sunaj Sahoo",
      plannedAt: "2024-01-15T08:00:00Z",
      dueAt: "2024-01-15T09:00:00Z",
      doneAt: "2024-01-15T08:30:00Z",
      status: "done" as const,
      link: null,
      notes: "Auto-generated from SQV system",
    },
    {
      stage: 2,
      label: "Appointment Fix",
      doer: "Sunaina Bali",
      problemSolver: "Sunaj Sahoo",
      plannedAt: "2024-01-15T08:30:00Z",
      dueAt: "2024-01-15T09:30:00Z",
      doneAt: "2024-01-15T09:00:00Z",
      status: "done" as const,
      link: null,
      notes: "Appointment confirmed with patient",
    },
    {
      stage: 3,
      label: "Pre-Consult Docs",
      doer: "Team Ops",
      problemSolver: "Sunaj Sahoo",
      plannedAt: "2024-01-15T09:00:00Z",
      dueAt: "2024-01-15T08:00:00Z", // 2 hours before scheduled
      doneAt: "2024-01-15T07:45:00Z",
      status: "done" as const,
      link: "https://docs.google.com/forms/d/e/1FAIpQLSc...",
      notes: "Pre-consultation documents sent to patient",
    },
    {
      stage: 4,
      label: "Day-Of Reminder",
      doer: "System",
      problemSolver: "Sunaj Sahoo",
      plannedAt: "2024-01-15T09:00:00Z",
      dueAt: "2024-01-15T09:00:00Z", // 1 hour before scheduled
      doneAt: "2024-01-15T09:00:00Z",
      status: "done" as const,
      link: null,
      notes: "Automated reminder sent to patient",
    },
    {
      stage: 5,
      label: "Post-Consult Upload",
      doer: "Dr. Riya Sharma",
      problemSolver: "Sunaj Sahoo",
      plannedAt: "2024-01-15T10:45:00Z",
      dueAt: "2024-01-15T11:45:00Z", // 1 hour after end
      doneAt: "2024-01-15T11:15:00Z",
      status: "done" as const,
      link: "https://forms.gle/xyz789",
      notes: "Consultation notes and prescription uploaded",
    },
    {
      stage: 6,
      label: "Handover to KAPPL/KTAHV",
      doer: "Sunaina Bali",
      problemSolver: "Sunaj Sahoo",
      plannedAt: "2024-01-15T11:45:00Z",
      dueAt: "2024-01-15T23:59:59Z", // Same day
      doneAt: "2024-01-15T12:00:00Z",
      status: "done" as const,
      link: null,
      notes: "Patient case handed over to KTAHV team",
    },
  ]

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  return NextResponse.json(mockStages)
}
