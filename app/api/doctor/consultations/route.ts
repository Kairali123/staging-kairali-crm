import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

const mockConsultations = [
  {
    id: "C-1001",
    consultationId: "CONS-2024-001",
    enquiryId: "ENQ-2024-001",
    patientName: "Mrs. Priya Nair",
    patientId: "P-2001",
    mobile: "+91 9876543210",
    email: "priya.nair@email.com",
    subjects: "Ayurvedic Treatment, Diabetes Management",
    notes: "Patient has diabetes and looking for natural treatment options",
    ivrUrl: "https://ivr.kairali.com/call/001",
    websiteName: "Kairali Ayurveda",
    dataSource: "SQV",
    assignedSalesRep: "Sunaj Sahoo",
    remarksHistory: "Initial consultation completed, follow-up scheduled",
    dataFromSheet: "Lead Sheet Q1 2024",
    doctorCalendarLink: "https://calendar.google.com/doctor-001",
    appointmentType: "Video Consultation",
    appointmentStatus: "completed",
    doctorAlignment: "Dr. Riya Sharma - Ayurveda Specialist",
    scheduledDateTime: "2024-01-15T10:00:00Z",
    remarks: "Patient responded well to initial consultation",
    clientReportLink: "https://reports.kairali.com/client/001",
    submitStatus: "submitted",
    clientReportsLink: "https://reports.kairali.com/client/001/reports",
    clientReportsRemarks: "All reports uploaded successfully",
    doshaTestReportLink: "https://reports.kairali.com/dosha/001",
    healthAssessmentReportLink: "https://reports.kairali.com/health/001",
    clientReminderStatus: "sent",
    doctorReminderStatus: "sent",
    consultationDoneStatus: "completed",
    reportsUploadUrl: "https://upload.kairali.com/reports/001",
    postConsultationRemarks: "Treatment plan provided, follow-up in 2 weeks",
    finalCaseStatus: "active",
    postConsultationUploadedBy: "Dr. Riya Sharma",
    transferToUserStatus: "transferred",
    stage: "Handover to KAPPL/KTAHV",
    status: "completed" as const,
    scheduledDate: "2024-01-15T10:00:00Z",
    doer: "Sunaina Bali",
    slaStatus: "on-time" as const,
    timeRemaining: "Completed",
    hasPrescription: true,
    createdAt: "2024-01-10T09:00:00Z",
  },
  {
    id: "C-1002",
    consultationId: "CONS-2024-002",
    enquiryId: "ENQ-2024-002",
    patientName: "Mr. Rajesh Kumar",
    patientId: "P-2002",
    mobile: "+91 9876543211",
    email: "rajesh.kumar@email.com",
    subjects: "Weight Management, Stress Relief",
    notes: "Looking for holistic approach to weight loss and stress management",
    ivrUrl: "https://ivr.kairali.com/call/002",
    websiteName: "Kairali Ayurveda",
    dataSource: "Users",
    assignedSalesRep: "Team Ops",
    remarksHistory: "Initial inquiry received, appointment being scheduled",
    dataFromSheet: "Website Leads Q1 2024",
    doctorCalendarLink: "https://calendar.google.com/doctor-002",
    appointmentType: "In-Person Consultation",
    appointmentStatus: "pending",
    doctorAlignment: "Dr. Amit Patel - Panchakarma Specialist",
    scheduledDateTime: "2024-01-15T14:30:00Z",
    remarks: "Awaiting patient confirmation for appointment time",
    clientReportLink: "",
    submitStatus: "pending",
    clientReportsLink: "",
    clientReportsRemarks: "Awaiting initial consultation",
    doshaTestReportLink: "",
    healthAssessmentReportLink: "",
    clientReminderStatus: "pending",
    doctorReminderStatus: "pending",
    consultationDoneStatus: "pending",
    reportsUploadUrl: "",
    postConsultationRemarks: "",
    finalCaseStatus: "new",
    postConsultationUploadedBy: "",
    transferToUserStatus: "pending",
    stage: "Day-Of Reminder",
    status: "pending" as const,
    scheduledDate: "2024-01-15T14:30:00Z",
    doer: "Team Ops",
    slaStatus: "at-risk" as const,
    timeRemaining: "2 hours remaining",
    hasPrescription: false,
    createdAt: "2024-01-12T11:00:00Z",
  },
  {
    id: "C-1003",
    consultationId: "CONS-2024-003",
    enquiryId: "ENQ-2024-003",
    patientName: "Ms. Anjali Singh",
    patientId: "P-2003",
    mobile: "+91 9876543212",
    email: "anjali.singh@email.com",
    subjects: "Skin Care, Hair Care",
    notes: "Specialized Ayurvedic treatment for skin and hair issues",
    ivrUrl: "https://ivr.kairali.com/call/003",
    websiteName: "Kairali Ayurveda",
    dataSource: "Google Form",
    assignedSalesRep: "Sunaina Bali",
    remarksHistory: "Consultation completed, reports being uploaded",
    dataFromSheet: "Google Form Leads Q1 2024",
    doctorCalendarLink: "https://calendar.google.com/doctor-001",
    appointmentType: "Video Consultation",
    appointmentStatus: "completed",
    doctorAlignment: "Dr. Riya Sharma - Ayurveda Specialist",
    scheduledDateTime: "2024-01-16T11:00:00Z",
    remarks: "Excellent response to treatment recommendations",
    clientReportLink: "https://reports.kairali.com/client/003",
    submitStatus: "submitted",
    clientReportsLink: "https://reports.kairali.com/client/003/reports",
    clientReportsRemarks: "Reports being processed",
    doshaTestReportLink: "https://reports.kairali.com/dosha/003",
    healthAssessmentReportLink: "https://reports.kairali.com/health/003",
    clientReminderStatus: "sent",
    doctorReminderStatus: "sent",
    consultationDoneStatus: "completed",
    reportsUploadUrl: "https://upload.kairali.com/reports/003",
    postConsultationRemarks: "Customized treatment plan provided",
    finalCaseStatus: "active",
    postConsultationUploadedBy: "Dr. Riya Sharma",
    transferToUserStatus: "in-progress",
    stage: "Post-Consult Upload",
    status: "pending" as const,
    scheduledDate: "2024-01-16T11:00:00Z",
    doer: "Sunaina Bali",
    slaStatus: "on-time" as const,
    timeRemaining: "1 day remaining",
    hasPrescription: false,
    createdAt: "2024-01-13T10:30:00Z",
  },
]

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  // Extract pagination and filters
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
  const doctorId = searchParams.get("doctorId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const property = searchParams.getAll("property[]")
  const stage = searchParams.getAll("stage[]")
  const status = searchParams.getAll("status[]")
  const doer = searchParams.getAll("doer[]")
  const q = searchParams.get("q")

  // Apply filters (mock implementation)
  let filteredConsultations = [...mockConsultations]

  if (q) {
    filteredConsultations = filteredConsultations.filter(
      (consultation) =>
        consultation.patientName.toLowerCase().includes(q.toLowerCase()) ||
        consultation.doctorAlignment.toLowerCase().includes(q.toLowerCase()) ||
        consultation.id.toLowerCase().includes(q.toLowerCase()),
    )
  }

  if (status.length > 0) {
    filteredConsultations = filteredConsultations.filter((consultation) => status.includes(consultation.status))
  }

  if (stage.length > 0) {
    filteredConsultations = filteredConsultations.filter((consultation) => stage.includes(consultation.stage))
  }

  // Pagination
  const total = filteredConsultations.length
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const items = filteredConsultations.slice(startIndex, endIndex)

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  return NextResponse.json({
    consultations: items,
    items,
    page,
    pageSize,
    total,
  })
}
