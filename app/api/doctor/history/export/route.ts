import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasDoctorConsultationAccess } from "@/lib/authz"

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasDoctorConsultationAccess(user)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "csv"
  const range = searchParams.get("range") || "last-30-days"

  // Mock export data
  const exportData = [
    {
      date: "2024-01-15",
      patientName: "Mrs. Priya Nair",
      patientId: "P-1001",
      stage: "Completed",
      doer: "Dr. Smith",
      property: "KAPPL",
      completionTime: "2.5 days",
      slaCompliance: "Yes",
    },
    {
      date: "2024-01-16",
      patientName: "Mr. Rajesh Kumar",
      patientId: "P-1002",
      stage: "Pending",
      doer: "Dr. Johnson",
      property: "KTAHV",
      completionTime: "1.2 days",
      slaCompliance: "Yes",
    },
    {
      date: "2024-01-17",
      patientName: "Ms. Anjali Singh",
      patientId: "P-1003",
      stage: "In Progress",
      doer: "Dr. Williams",
      property: "Online",
      completionTime: "0.8 days",
      slaCompliance: "Yes",
    },
  ]

  if (format === "csv") {
    // Generate CSV
    const headers = Object.keys(exportData[0]).join(",")
    const rows = exportData.map((row) => Object.values(row).join(",")).join("\n")
    const csv = `${headers}\n${rows}`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="doctor-consultation-history-${range}.csv"`,
      },
    })
  } else if (format === "pdf") {
    // For PDF, we'd typically use a library like puppeteer or jsPDF on the server
    // For now, return a simple text response
    const textData = exportData
      .map(
        (row) =>
          `Date: ${row.date}, Patient: ${row.patientName} (${row.patientId}), Stage: ${row.stage}, Doer: ${row.doer}, Property: ${row.property}, Completion Time: ${row.completionTime}, SLA Compliance: ${row.slaCompliance}`,
      )
      .join("\n\n")

    return new NextResponse(textData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="doctor-consultation-history-${range}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
}
