"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/back-button"
import { ComplaintActionModal } from "@/components/fms/complaint-action-modal"

// Mock complaint data with all the requested fields
const mockComplaintDetail = {
  id: "CAPA001",
  generateDate: "2024-01-10T08:30:00Z",
  generateTime: "08:30 AM",
  chatDoneDate: "2024-01-10T09:15:00Z",
  chatDoneTime: "09:15 AM",
  chatId: "CHT-2024-001",
  name: "Anitha Menon",
  roomNumber: "R-205",
  phone: "+91 9876543212",
  email: "anitha@email.com",
  conversationId: "CONV-2024-001",
  conversationChat: "Customer complained about skin irritation after massage therapy session",
  summaryOfConversation:
    "Patient experienced adverse reaction to oil used during Ayurvedic massage. Immediate medical attention was provided. Customer expressed dissatisfaction with treatment outcome.",
  finalOutcome: "Medical consultation provided, treatment revised, customer satisfied with resolution",
  keyEmotion: "Frustrated initially, satisfied after resolution",
  summaryType: "Service Quality Issue",
  category: "Treatment",
  subCategory: "Ayurvedic Massage",
  issueType: "Adverse Reaction",
  department: "Ayurveda Department",
  urgency: "High",
  priority: "High",
  urgencyTAT: 60, // minutes
  suggestedAction: "Immediate medical consultation and treatment revision",
  uid: "UID-2024-001",
  score: 8.5,
  departmentStaffEmailId: "dr.priya@ktahv.com",
  departmentStaffName: "Dr. Priya Nair",
  departmentHeadName: "Dr. Suresh Kumar",
  departmentHeadEmailId: "dr.suresh@ktahv.com",
  chatHistoryLink: "https://chat.ktahv.com/history/CHT-2024-001",
  resolutionTAT: 240, // minutes
  finalReportPDFLink: "https://reports.ktahv.com/CAPA001-final-report.pdf",
  status: "resolved",
  severity: "high",
  verificationStatus: "verified",
  customerSatisfaction: 4,
}

export default function ComplaintDetailPage({ params }: { params: { id: string } }) {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800"
      case "investigating":
        return "bg-yellow-100 text-yellow-800"
      case "action_taken":
        return "bg-blue-100 text-blue-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "escalated":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "low":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTAT = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start gap-6">
            <BackButton />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Complaint Details</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={mockComplaintDetail.severity === "high" ? "destructive" : "secondary"}
                    className="text-xs font-medium"
                  >
                    {mockComplaintDetail.severity.toUpperCase()}
                  </Badge>
                  <Badge
                    variant={mockComplaintDetail.status === "resolved" ? "default" : "outline"}
                    className="text-xs font-medium"
                  >
                    {mockComplaintDetail.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">#</span>
                  <span className="font-mono">{mockComplaintDetail.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📅</span>
                  <span>{formatDateTime(mockComplaintDetail.generateDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">⭐</span>
                  <span className="font-medium">{mockComplaintDetail.score}/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveModal("view")}
              className="flex items-center gap-2 h-auto py-3 px-4 text-left justify-start hover:bg-blue-50"
            >
              <span className="text-blue-600">👁️</span>
              <span className="text-sm font-medium break-words">View Details</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModal("department-staff")}
              className="flex items-center gap-2 h-auto py-3 px-4 text-left justify-start hover:bg-green-50"
            >
              <span className="text-green-600">👤</span>
              <span className="text-sm font-medium break-words">Staff Action</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModal("department-head")}
              className="flex items-center gap-2 h-auto py-3 px-4 text-left justify-start hover:bg-purple-50"
            >
              <span className="text-purple-600">🛡️</span>
              <span className="text-sm font-medium break-words">Head Action</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModal("general-manager")}
              className="flex items-center gap-2 h-auto py-3 px-4 text-left justify-start hover:bg-orange-50"
            >
              <span className="text-orange-600">✅</span>
              <span className="text-sm font-medium break-words">GM Verify</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModal("management")}
              className="flex items-center gap-2 h-auto py-3 px-4 text-left justify-start hover:bg-red-50"
            >
              <span className="text-red-600">⚙️</span>
              <span className="text-sm font-medium break-words">Management</span>
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">👤</span>
              Customer Information
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Customer Name</p>
                  <p className="text-base font-semibold text-gray-900 break-words">{mockComplaintDetail.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Room Number</p>
                  <p className="text-base font-mono text-gray-900">{mockComplaintDetail.roomNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Contact Information</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📞</span>
                      <span className="text-sm text-gray-900 break-all">{mockComplaintDetail.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">✉️</span>
                      <span className="text-sm text-gray-900 break-all">{mockComplaintDetail.email}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Chat ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{mockComplaintDetail.chatId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Conversation ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{mockComplaintDetail.conversationId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Unique ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{mockComplaintDetail.uid}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-orange-600">⚠️</span>
              Issue Classification
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <p className="text-base font-medium text-gray-900 break-words">{mockComplaintDetail.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Sub Category</p>
                  <p className="text-base text-gray-900 break-words">{mockComplaintDetail.subCategory}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Issue Type</p>
                  <p className="text-base text-gray-900 break-words">{mockComplaintDetail.issueType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Summary Type</p>
                  <p className="text-base text-gray-900 break-words">{mockComplaintDetail.summaryType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Priority Level</p>
                  <Badge variant={mockComplaintDetail.priority === "High" ? "destructive" : "secondary"}>
                    {mockComplaintDetail.priority}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Urgency TAT</p>
                  <p className="text-base font-medium text-gray-900">{formatTAT(mockComplaintDetail.urgencyTAT)}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-purple-600">🏢</span>
              Department & Staff Assignment
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Department</p>
                  <p className="text-base font-semibold text-gray-900 break-words">{mockComplaintDetail.department}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Department Staff</p>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-gray-900 break-words">
                      {mockComplaintDetail.departmentStaffName}
                    </p>
                    <p className="text-xs text-gray-500 break-all">{mockComplaintDetail.departmentStaffEmailId}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Department Head</p>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-gray-900 break-words">
                      {mockComplaintDetail.departmentHeadName}
                    </p>
                    <p className="text-xs text-gray-500 break-all">{mockComplaintDetail.departmentHeadEmailId}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-green-600">⏰</span>
              Timeline & Resolution
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Generated</p>
                  <p className="text-base text-gray-900 break-words">
                    {formatDateTime(mockComplaintDetail.generateDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Chat Completed</p>
                  <p className="text-base text-gray-900 break-words">
                    {formatDateTime(mockComplaintDetail.chatDoneDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Resolution TAT</p>
                  <p className="text-base font-medium text-gray-900">{formatTAT(mockComplaintDetail.resolutionTAT)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Customer Satisfaction</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-lg ${
                            i < mockComplaintDetail.customerSatisfaction ? "text-yellow-400" : "text-gray-300"
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    <span className="text-base font-medium text-gray-900">
                      {mockComplaintDetail.customerSatisfaction}/5
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Key Emotion</p>
                  <p className="text-base text-gray-900 break-words">{mockComplaintDetail.keyEmotion}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">💬</span>
              Conversation Details
            </h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-3">Initial Complaint</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg break-words">
                  {mockComplaintDetail.conversationChat}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-3">Summary of Conversation</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg break-words">
                  {mockComplaintDetail.summaryOfConversation}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-3">Suggested Action</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg break-words">
                  {mockComplaintDetail.suggestedAction}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-3">Final Outcome</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg break-words">
                  {mockComplaintDetail.finalOutcome}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-indigo-600">📄</span>
              Documents & Links
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" size="sm" asChild className="flex items-center gap-2 bg-transparent">
                  <a href={mockComplaintDetail.chatHistoryLink} target="_blank" rel="noopener noreferrer">
                    <span className="text-blue-600">🔗</span>
                    <span className="break-words">View Chat History</span>
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex items-center gap-2 bg-transparent">
                  <a href={mockComplaintDetail.finalReportPDFLink} target="_blank" rel="noopener noreferrer">
                    <span className="text-green-600">⬇️</span>
                    <span className="break-words">Download Final Report</span>
                  </a>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Action Modals */}
      <ComplaintActionModal
        isOpen={activeModal === "view"}
        onClose={() => setActiveModal(null)}
        title="View Complaint Details"
        type="view"
        complaint={mockComplaintDetail}
      />

      <ComplaintActionModal
        isOpen={activeModal === "department-staff"}
        onClose={() => setActiveModal(null)}
        title="Department Staff Action"
        type="department-staff"
        complaint={mockComplaintDetail}
      />

      <ComplaintActionModal
        isOpen={activeModal === "department-head"}
        onClose={() => setActiveModal(null)}
        title="Department Head Action"
        type="department-head"
        complaint={mockComplaintDetail}
      />

      <ComplaintActionModal
        isOpen={activeModal === "general-manager"}
        onClose={() => setActiveModal(null)}
        title="General Manager Verification"
        type="general-manager"
        complaint={mockComplaintDetail}
      />

      <ComplaintActionModal
        isOpen={activeModal === "management"}
        onClose={() => setActiveModal(null)}
        title="Management Check"
        type="management"
        complaint={mockComplaintDetail}
      />
    </div>
  )
}
