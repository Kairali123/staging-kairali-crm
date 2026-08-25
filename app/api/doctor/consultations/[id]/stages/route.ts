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
  const today = new Date()
  const d0Str = today.toISOString().split("T")[0]

  const mockStages = [
    {
      stage: 1,
      label: "Intake",
      doer: "System",
      problemSolver: "Sunaj Sahoo",
      plannedAt: `${d0Str}T08:00:00Z`,
      dueAt: `${d0Str}T09:00:00Z`,
      doneAt: `${d0Str}T08:30:00Z`,
      status: "done" as const,
      link: null,
      notes: "Auto-generated from SQV system",
    },
    {
      stage: 2,
      label: "Appointment Fix",
      doer: "Sunaina Bali",
      problemSolver: "Sunaj Sahoo",
      plannedAt: `${d0Str}T08:30:00Z`,
      dueAt: `${d0Str}T09:30:00Z`,
      doneAt: `${d0Str}T09:00:00Z`,
      status: "done" as const,
      link: null,
      notes: "Appointment confirmed with patient",
    },
    {
      stage: 3,
      label: "Pre-Consult Docs",
      doer: "Team Ops",
      problemSolver: "Sunaj Sahoo",
      plannedAt: `${d0Str}T09:00:00Z`,
      dueAt: `${d0Str}T08:00:00Z`, // 2 hours before scheduled
      doneAt: `${d0Str}T07:45:00Z`,
      status: "done" as const,
      link: "https://docs.google.com/forms/d/e/1FAIpQLSc...",
      notes: "Pre-consultation documents sent to patient",
    },
    {
      stage: 4,
      label: "Day-Of Reminder",
      doer: "System",
      problemSolver: "Sunaj Sahoo",
      plannedAt: `${d0Str}T09:00:00Z`,
      dueAt: `${d0Str}T09:00:00Z`, // 1 hour before scheduled
      doneAt: `${d0Str}T09:00:00Z`,
      status: "done" as const,
      link: null,
      notes: "Automated reminder sent to patient",
    },
    {
      stage: 5,
      label: "Post-Consult Upload",
      doer: "Dr. Riya Sharma",
      problemSolver: "Sunaj Sahoo",
      plannedAt: `${d0Str}T10:45:00Z`,
      dueAt: `${d0Str}T11:45:00Z`, // 1 hour after end
      doneAt: `${d0Str}T11:15:00Z`,
      status: "done" as const,
      link: "https://forms.gle/xyz789",
      notes: "Consultation notes and prescription uploaded",
    },
    {
      stage: 6,
      label: "Handover to KAPPL/KTAHV",
      doer: "Sunaina Bali",
      problemSolver: "Sunaj Sahoo",
      plannedAt: `${d0Str}T11:45:00Z`,
      dueAt: `${d0Str}T23:59:59Z`, // Same day
      doneAt: `${d0Str}T12:00:00Z`,
      status: "done" as const,
      link: null,
      notes: "Patient case handed over to KTAHV team",
    },
  ]

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  return NextResponse.json(mockStages)
}
