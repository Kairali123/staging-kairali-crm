"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  Search,
  Eye,
  Phone,
  Mail,
  Clock,
  Target,
  MoreHorizontal,
  UserCheck,
  Shield,
  CheckCircle2,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Database,
  Camera,
  Upload,
  X,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Calendar,
  Timer,
  Star,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Complaint {
  id: string
  generateDate: string
  generateTime: string
  chatDoneDate: string
  chatDoneTime: string
  chatId: string
  name: string
  roomNumber: string
  phone: string
  email: string
  conversationId: string
  conversationChat: string
  summaryOfConversation: string
  finalOutcome: string
  keyEmotion: string
  summaryType: string
  category: string
  subCategory: string
  issueType: string
  department: string
  urgency: "low" | "medium" | "high" | "critical"
  priority: "low" | "medium" | "high" | "critical"
  urgencyTAT: number
  suggestedAction: string
  uid: string
  score: number
  departmentStaffEmailId: string
  departmentStaffName: string
  departmentHeadName: string
  departmentHeadEmailId: string
  chatHistoryLink: string
  resolutionTAT: number
  finalReportPDFLink: string
  status: "open" | "investigating" | "action_taken" | "closed" | "escalated" | "resolved" | "in-progress"
  severity: "low" | "medium" | "high" | "critical"
  verificationStatus: "pending" | "verified" | "rejected"
  customerSatisfaction?: number
  createdAt: string
  updatedAt: string
  complaintSource: "internal" | "external"
  actionType: "corrective" | "preventive"
}

export default function ComplaintsPage() {
  const [complaints] = useState<Complaint[]>([
    {
      id: "CAPA001",
      generateDate: "2024-01-10",
      generateTime: "08:30 AM",
      chatDoneDate: "2024-01-10",
      chatDoneTime: "09:15 AM",
      chatId: "CHT-2024-001",
      name: "Anitha Menon",
      roomNumber: "R-205",
      phone: "+91 9876543212",
      email: "anitha@email.com",
      conversationId: "CONV-2024-001",
      conversationChat: "Customer complained about skin irritation after massage therapy session",
      summaryOfConversation:
        "Patient experienced adverse reaction to oil used during Ayurvedic massage. Immediate medical attention was provided.",
      finalOutcome: "Medical consultation provided, treatment revised, customer satisfied with resolution",
      keyEmotion: "Frustrated initially, satisfied after resolution",
      summaryType: "Service Quality Issue",
      category: "Treatment",
      subCategory: "Ayurvedic Massage",
      issueType: "Adverse Reaction",
      department: "Ayurveda Department",
      urgency: "high",
      priority: "high",
      urgencyTAT: 60,
      suggestedAction: "Immediate medical consultation and treatment revision",
      uid: "UID-2024-001",
      score: 8.5,
      departmentStaffEmailId: "dr.priya@ktahv.com",
      departmentStaffName: "Dr. Priya Nair",
      departmentHeadName: "Dr. Suresh Kumar",
      departmentHeadEmailId: "dr.suresh@ktahv.com",
      chatHistoryLink: "https://chat.ktahv.com/history/CHT-2024-001",
      resolutionTAT: 240,
      finalReportPDFLink: "https://reports.ktahv.com/CAPA001-final-report.pdf",
      status: "resolved",
      severity: "high",
      verificationStatus: "verified",
      customerSatisfaction: 4,
      createdAt: "2024-01-10",
      updatedAt: "2024-01-14",
      complaintSource: "external",
      actionType: "corrective",
    },
    {
      id: "CAPA002",
      generateDate: "2024-01-12",
      generateTime: "10:45 AM",
      chatDoneDate: "2024-01-12",
      chatDoneTime: "11:30 AM",
      chatId: "CHT-2024-002",
      name: "Ravi Krishnan",
      roomNumber: "R-301",
      phone: "+91 9876543213",
      email: "ravi@email.com",
      conversationId: "CONV-2024-002",
      conversationChat: "Customer complained about incorrect billing amount",
      summaryOfConversation: "Overcharged for consultation, bill amount incorrect due to system error",
      finalOutcome: "Refund processed, bill corrected",
      keyEmotion: "Annoyed, satisfied after refund",
      summaryType: "Billing Issue",
      category: "Finance",
      subCategory: "Billing Error",
      issueType: "Overcharge",
      department: "Accounts Department",
      urgency: "medium",
      priority: "medium",
      urgencyTAT: 120,
      suggestedAction: "Process refund and audit billing system",
      uid: "UID-2024-002",
      score: 7.2,
      departmentStaffEmailId: "accounts@ktahv.com",
      departmentStaffName: "Accounts Manager",
      departmentHeadName: "Finance Head",
      departmentHeadEmailId: "finance@ktahv.com",
      chatHistoryLink: "https://chat.ktahv.com/history/CHT-2024-002",
      resolutionTAT: 180,
      finalReportPDFLink: "https://reports.ktahv.com/CAPA002-final-report.pdf",
      status: "investigating",
      severity: "medium",
      verificationStatus: "pending",
      createdAt: "2024-01-12",
      updatedAt: "2024-01-13",
      complaintSource: "external",
      actionType: "preventive",
    },
    {
      id: "CAPA003",
      generateDate: "2024-01-15",
      generateTime: "02:15 PM",
      chatDoneDate: "2024-01-15",
      chatDoneTime: "03:00 PM",
      chatId: "CHT-2024-003",
      name: "Priya Sharma",
      roomNumber: "R-102",
      phone: "+91 9876543214",
      email: "priya@email.com",
      conversationId: "CONV-2024-003",
      conversationChat: "Customer complained about delayed appointment and poor staff behavior",
      summaryOfConversation: "Long waiting time and unprofessional behavior from reception staff",
      finalOutcome: "Staff counseled, process improved",
      keyEmotion: "Very frustrated, moderately satisfied",
      summaryType: "Service Issue",
      category: "Customer Service",
      subCategory: "Staff Behavior",
      issueType: "Unprofessional Conduct",
      department: "Reception",
      urgency: "critical",
      priority: "high",
      urgencyTAT: 30,
      suggestedAction: "Immediate staff training and process review",
      uid: "UID-2024-003",
      score: 9.1,
      departmentStaffEmailId: "reception@ktahv.com",
      departmentStaffName: "Reception Manager",
      departmentHeadName: "Operations Head",
      departmentHeadEmailId: "operations@ktahv.com",
      chatHistoryLink: "https://chat.ktahv.com/history/CHT-2024-003",
      resolutionTAT: 360,
      finalReportPDFLink: "https://reports.ktahv.com/CAPA003-final-report.pdf",
      status: "action_taken",
      severity: "critical",
      verificationStatus: "verified",
      customerSatisfaction: 3,
      createdAt: "2024-01-15",
      updatedAt: "2024-01-16",
      complaintSource: "internal",
      actionType: "corrective",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [issueDetailsFilter, setIssueDetailsFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [actionTypeFilter, setActionTypeFilter] = useState("all")

  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [modalType, setModalType] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionNotes, setActionNotes] = useState("")

  const [staffActionStatus, setStaffActionStatus] = useState("")
  const [staffActionPoints, setStaffActionPoints] = useState("")
  const [staffRemarks, setStaffRemarks] = useState("")
  const [resolvedBy, setResolvedBy] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const [gmActionStatus, setGmActionStatus] = useState("")
  const [gmRemarks, setGmRemarks] = useState("")
  const [managementActionStatus, setManagementActionStatus] = useState("")
  const [managementAction, setManagementAction] = useState("")
  const [managementRemarks, setManagementRemarks] = useState("")

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
      case "closed":
        return "bg-green-100 text-green-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "escalated":
        return "bg-purple-100 text-purple-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case "internal":
        return "bg-blue-100 text-blue-800"
      case "external":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "corrective":
        return "bg-orange-100 text-orange-800"
      case "preventive":
        return "bg-teal-100 text-teal-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTAT = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredComplaints = complaints
    .filter((complaint) => {
      const matchesSearch =
        complaint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.summaryOfConversation.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || complaint.status === statusFilter
      const matchesSeverity = severityFilter === "all" || complaint.severity === severityFilter
      const matchesSource = sourceFilter === "all" || complaint.complaintSource.toLowerCase() === sourceFilter
      const matchesCategory = categoryFilter === "all" || complaint.category === categoryFilter
      const matchesDepartment = departmentFilter === "all" || complaint.department === departmentFilter
      // Added actionTypeFilter to the filter logic
      const matchesActionType = actionTypeFilter === "all" || complaint.actionType === actionTypeFilter

      // Date filtering logic
      let matchesDate = true
      if (dateFilter !== "all") {
        const complaintDate = new Date(complaint.generateDate)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(today.getDate() - 7)
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        switch (dateFilter) {
          case "today":
            matchesDate = complaintDate.toDateString() === today.toDateString()
            break
          case "yesterday":
            matchesDate = complaintDate.toDateString() === yesterday.toDateString()
            break
          case "last_week":
            matchesDate = complaintDate >= lastWeek
            break
          case "last_month":
            matchesDate = complaintDate >= lastMonth
            break
          case "custom":
            if (customDateRange.start && customDateRange.end) {
              const startDate = new Date(customDateRange.start)
              const endDate = new Date(customDateRange.end)
              matchesDate = complaintDate >= startDate && complaintDate <= endDate
            }
            break
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSeverity &&
        matchesSource &&
        matchesCategory &&
        matchesDepartment &&
        matchesDate &&
        matchesActionType // Include action type filter
      )
    })
    .sort((a, b) => {
      if (!sortField) return 0

      let aValue: any = a[sortField as keyof Complaint]
      let bValue: any = b[sortField as keyof Complaint]

      // Handle date sorting
      if (sortField === "generateDate") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle numeric sorting
      if (sortField === "score" || sortField === "customerSatisfaction") {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      // Handle string sorting
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary" />
    )
  }

  const handleActionClick = (complaint: Complaint, actionType: string) => {
    setSelectedComplaint(complaint)
    setModalType(actionType)
    setIsModalOpen(true)
    setActionNotes("")
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedComplaint(null)
    setModalType("")
    setActionNotes("")
    setStaffActionStatus("")
    setStaffActionPoints("")
    setStaffRemarks("")
    setResolvedBy("")
    setUploadedFile(null)
    setCapturedImage(null)
    setIsCameraOpen(false)
    setGmActionStatus("")
    setGmRemarks("")
    setManagementActionStatus("")
    setManagementAction("")
    setManagementRemarks("")
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOpen(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("Unable to access camera. Please check permissions.")
    }
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (context) {
        context.drawImage(video, 0, 0)
        const imageDataUrl = canvas.toDataURL("image/png")
        setCapturedImage(imageDataUrl)

        // Stop camera
        const stream = video.srcObject as MediaStream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
        setIsCameraOpen(false)
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      setIsCameraOpen(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setCapturedImage(null) // Clear captured image if file is uploaded
    }
  }

  const handleActionSubmit = () => {
    handleModalClose()
  }

  const getModalTitle = () => {
    switch (modalType) {
      case "view":
        return "View Complaint Details"
      case "staff":
        return "Department Staff Action"
      case "head":
        return "Department Head Action"
      case "manager":
        return "General Manager Verification"
      case "management":
        return "Management Check"
      case "edit":
        return "Edit Complaint"
      default:
        return "Action Required"
    }
  }

  const getModalDescription = () => {
    switch (modalType) {
      case "view":
        return "Complete details and history of the complaint"
      case "staff":
        return "Take action as department staff member"
      case "head":
        return "Review and approve as department head"
      case "manager":
        return "Verify resolution as general manager"
      case "management":
        return "Final management review and closure"
      case "edit":
        return "Modify complaint details and information"
      default:
        return "Please provide details for this action"
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">KTAHV CAPA FMS</h2>
          <p className="text-muted-foreground">Customer Complaints & Corrective/Preventive Actions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40 h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-36 h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                placeholder="Start Date"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-36 h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                placeholder="End Date"
              />
            </div>
          )}
        </div>
      </div>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Search className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-semibold">Search & Filter Complaints</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by client name, complaint ID, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Severity" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food & Dining Issues</SelectItem>
                  <SelectItem value="accommodation">Accommodation Issues</SelectItem>
                  <SelectItem value="doctor">Doctor Issues</SelectItem>
                  <SelectItem value="laundry">Laundry Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={issueDetailsFilter} onValueChange={setIssueDetailsFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Issues" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="billing">Billing Issue</SelectItem>
                  <SelectItem value="service">Service Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Action Types" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                  <SelectItem value="all">All Action Types</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
              <Input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                placeholder="End Date"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Complaints</CardTitle>
            <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">47</div>
              <div className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">+12%</span>
              </div>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="font-medium">Internal: 28</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Corrective: 18 | Preventive: 10
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="font-medium">External: 19</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Corrective: 13 | Preventive: 6
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/30 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">Open Cases</CardTitle>
            <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">12</div>
              <div className="flex items-center text-red-600 dark:text-red-400">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">-5%</span>
              </div>
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 space-y-2">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="font-medium">Internal: 7</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Corrective: 5 | Preventive: 2
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="font-medium">External: 5</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Corrective: 3 | Preventive: 2
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/30 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Avg Resolution</CardTitle>
            <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
              <Timer className="h-4 w-4 text-green-600 dark:text-green-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">2.4h</div>
              <div className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">+8%</span>
              </div>
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 space-y-2">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium">Internal: 1.8h</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Corrective: 1.5h | Preventive: 2.2h
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="font-medium">External: 3.2h</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                    Corrective: 2.8h | Preventive: 3.8h
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Satisfaction</CardTitle>
            <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
              <Star className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">4.2</div>
              <div className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">+15%</span>
              </div>
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300 space-y-2">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span className="font-medium">Internal: 4.5</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                    Corrective: 4.3 | Preventive: 4.8
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  <span className="font-medium">External: 3.8</span>
                </div>
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    Corrective: 3.6 | Preventive: 4.2
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
        <CardHeader className="bg-gradient-to-r from-slate-800 via-gray-800 to-slate-900 text-white rounded-t-lg border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Database className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  KTAHV CAPA FMS Records
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                    Live Data
                  </Badge>
                </CardTitle>
                <p className="text-slate-200 mt-1 text-sm">Comprehensive complaint tracking and management system</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm">
                <FileText className="h-3 w-3 mr-1" />
                {filteredComplaints.length} Records
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-100 border-blue-400/30">
                Total: {complaints.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-b-2 border-gray-200 dark:border-gray-700">
                    <TableHead className="w-[100px] font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("id")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        CAPA ID
                        <SortIcon field="id" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("name")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Customer Details
                        <SortIcon field="name" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      Issue Details
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("category")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Category
                        <SortIcon field="category" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("department")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Department
                        <SortIcon field="department" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("severity")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Priority
                        <SortIcon field="severity" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("status")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Status
                        <SortIcon field="status" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("complaintSource")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Source
                        <SortIcon field="complaintSource" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("actionType")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Action Type
                        <SortIcon field="actionType" />
                      </Button>
                    </TableHead>

                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("generateDate")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Date & Time
                        <SortIcon field="generateDate" />
                      </Button>
                    </TableHead>

                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("score")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Score
                        <SortIcon field="score" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold bg-gray-50 dark:bg-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("customerSatisfaction")}
                        className="h-auto p-0 font-semibold hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Satisfaction
                        <SortIcon field="customerSatisfaction" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold text-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      Chat History
                    </TableHead>
                    <TableHead className="font-semibold text-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      Final Report
                    </TableHead>
                    <TableHead className="w-[120px] font-semibold text-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint, index) => (
                    <TableRow
                      key={complaint.id}
                      className={`
                      ${index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/30"}
                      hover:bg-blue-50/50 dark:hover:bg-blue-950/20
                      transition-colors duration-150
                      border-b border-gray-100 dark:border-gray-800
                    `}
                    >
                      <TableCell className="font-mono text-sm py-4">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">{complaint.id}</div>
                        <div className="text-xs text-muted-foreground">{complaint.uid}</div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{complaint.name}</div>
                          <div className="text-xs text-muted-foreground">Room: {complaint.roomNumber}</div>
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            {complaint.phone}
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {complaint.email}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1 max-w-[300px]">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {complaint.summaryType}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {complaint.category} → {complaint.subCategory}
                          </div>
                          <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            {complaint.issueType}
                          </div>
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={complaint.summaryOfConversation}
                          >
                            {complaint.summaryOfConversation}
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Emotion:</span> {complaint.keyEmotion}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2 py-1 rounded-full border ${
                            complaint.category === "Treatment"
                              ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
                              : complaint.category === "Finance"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                                : complaint.category === "Customer Service"
                                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                  : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                          }`}
                        >
                          {complaint.category}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {complaint.department}
                          </div>
                          <div className="text-xs">
                            <div className="font-medium">Staff:</div>
                            <div>{complaint.departmentStaffName}</div>
                          </div>
                          <div className="text-xs">
                            <div className="font-medium">Head:</div>
                            <div>{complaint.departmentHeadName}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-2 min-w-[120px]">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Priority</div>
                            <Badge className={getSeverityColor(complaint.severity)} variant="secondary">
                              {complaint.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Urgency</div>
                            <Badge className={getSeverityColor(complaint.urgency)} variant="outline">
                              {complaint.urgency.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">TAT: {formatTAT(complaint.urgencyTAT)}</div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-2 min-w-[120px]">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
                            <Badge className={getStatusColor(complaint.status)} variant="secondary">
                              {complaint.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Verification</div>
                            <Badge
                              className={getVerificationColor(complaint.verificationStatus)}
                              variant="outline"
                            >
                              {complaint.verificationStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-2 min-w-[100px]">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Source</div>
                            <Badge className={getSourceColor(complaint.complaintSource)} variant="secondary">
                              {complaint.complaintSource.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-2 min-w-[110px]">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Action</div>
                            <Badge className={getActionTypeColor(complaint.actionType)} variant="secondary">
                              {complaint.actionType.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 bg-white dark:bg-gray-800">
                        <div className="space-y-1 text-xs min-w-[120px]">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              <span>{complaint.generateDate}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-gray-500" />
                              <span>{complaint.generateTime}</span>
                            </div>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            <div>Chat: {complaint.chatDoneDate}</div>
                            <div>TAT: {formatTAT(complaint.resolutionTAT)}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{complaint.score}/10</div>
                          <div className="text-xs text-muted-foreground">AI Score</div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-center">
                          {complaint.customerSatisfaction ? (
                            <>
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {complaint.customerSatisfaction}/5
                              </div>
                              <div className="text-xs text-muted-foreground">Customer Rating</div>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground">Not Rated</div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800 dark:text-blue-300"
                            onClick={() => window.open(complaint.chatHistoryLink, "_blank")}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Chat History
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800 dark:text-red-300"
                            onClick={() => window.open(complaint.finalReportPDFLink, "_blank")}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Final Report
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-[220px] bg-white dark:bg-gray-800 border shadow-lg rounded-md p-1"
                          >
                            <DropdownMenuItem
                              onClick={() => handleActionClick(complaint, "view")}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-2 cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4 text-blue-600" />
                              <span className="font-medium">View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleActionClick(complaint, "staff")}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-2 cursor-pointer"
                            >
                              <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                              <span className="font-medium">Department Staff Action</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleActionClick(complaint, "head")}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-2 cursor-pointer"
                            >
                              <Shield className="mr-2 h-4 w-4 text-purple-600" />
                              <span className="font-medium">Department Head Action</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleActionClick(complaint, "manager")}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-2 cursor-pointer"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4 text-orange-600" />
                              <span className="font-medium">General Manager Verify</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleActionClick(complaint, "management")}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-2 cursor-pointer"
                            >
                              <Settings className="mr-2 h-4 w-4 text-gray-600" />
                              <span className="font-medium">Management Check</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white dark:bg-gray-950 border-b p-6 z-10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{getModalTitle()}</DialogTitle>
              <DialogDescription>{getModalDescription()}</DialogDescription>
            </DialogHeader>
          </div>

          {selectedComplaint && (
            <div className="p-6 space-y-6">
              {/* Complaint Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Complaint Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p>
                      <strong>CAPA ID:</strong> {selectedComplaint.id}
                    </p>
                    <p>
                      <strong>Customer:</strong> {selectedComplaint.name}
                    </p>
                    <p>
                      <strong>Room:</strong> {selectedComplaint.roomNumber}
                    </p>
                    <p>
                      <strong>Phone:</strong> {selectedComplaint.phone}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Department:</strong> {selectedComplaint.department}
                    </p>
                    <p>
                      <strong>Priority:</strong>
                      <Badge className={`ml-2 ${getSeverityColor(selectedComplaint.severity)}`}>
                        {selectedComplaint.severity.toUpperCase()}
                      </Badge>
                    </p>
                    <p>
                      <strong>Status:</strong>
                      <Badge className={`ml-2 ${getStatusColor(selectedComplaint.status)}`}>
                        {selectedComplaint.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>

              {/* Issue Details */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Issue Details</h3>
                <div className="space-y-2">
                  <p>
                    <strong>Category:</strong> {selectedComplaint.category} → {selectedComplaint.subCategory}
                  </p>
                  <p>
                    <strong>Issue Type:</strong> {selectedComplaint.issueType}
                  </p>
                  <p>
                    <strong>Summary:</strong> {selectedComplaint.summaryOfConversation}
                  </p>
                  <p>
                    <strong>Key Emotion:</strong> {selectedComplaint.keyEmotion}
                  </p>
                  <p>
                    <strong>Suggested Action:</strong> {selectedComplaint.suggestedAction}
                  </p>
                </div>
              </div>

              {/* Department Information */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Department Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p>
                      <strong>Staff:</strong> {selectedComplaint.departmentStaffName}
                    </p>
                    <p>
                      <strong>Staff Email:</strong> {selectedComplaint.departmentStaffEmailId}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Head:</strong> {selectedComplaint.departmentHeadName}
                    </p>
                    <p>
                      <strong>Head Email:</strong> {selectedComplaint.departmentHeadEmailId}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Details Modal */}
              {modalType === "view" && (
                <div className="space-y-6">
                  {/* Basic Information Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-bold text-lg mb-4 text-blue-800 dark:text-blue-200 flex items-center flex-wrap">
                      <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Basic Information</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Generate Date & Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            5/4/2025 10:53:51
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Chat Done Date & Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            5/4/2025 10:42:47
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Chat ID:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border font-mono break-all">
                            Kairali_9um7ahtue
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Conversation ID:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border font-mono break-all">
                            Kairali_9um7ahtue/2
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">UID:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border font-mono break-all">
                            Case-CAPA_URGENT-Kairali_9um7ahtue/2-1
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Chat History Link:</p>
                          <a
                            href="https://tinyurl.com/274wnxp4"
                            target="_blank"
                            className="text-sm text-blue-600 hover:text-blue-800 underline break-all inline-block bg-white dark:bg-gray-800 p-3 rounded border w-full"
                            rel="noreferrer"
                          >
                            View Chat History
                          </a>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Resolution TAT:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">0:15:00</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Final Report PDF:</p>
                          <a
                            href="https://tinyurl.com/25fabpo5"
                            target="_blank"
                            className="text-sm text-blue-600 hover:text-blue-800 underline break-all inline-block bg-white dark:bg-gray-800 p-3 rounded border w-full"
                            rel="noreferrer"
                          >
                            Download Report
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversation Details Section */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 sm:p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="font-bold text-lg mb-4 text-green-800 dark:text-green-200 flex items-center flex-wrap">
                      <Phone className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Conversation Details</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Conversation Chat:</p>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                          <div className="space-y-3">
                            <div className="border-l-4 border-blue-500 pl-3">
                              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">User:</p>
                              <p className="text-sm mt-1 break-words">Service staff not available in canteen</p>
                            </div>
                            <div className="border-l-4 border-green-500 pl-3">
                              <p className="text-sm font-medium text-green-700 dark:text-green-300">Assistant:</p>
                              <p className="text-sm mt-1 break-words">
                                I apologize for the inconvenience caused by the unavailability of service staff in the
                                canteen. I will escalate this issue to ensure it is addressed promptly. Thank you for
                                bringing this to our attention.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Summary of Conversation:
                          </p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            Client reported unavailability of service staff in the canteen.
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Final Outcome:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border">Actionable</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Emotion:</p>
                          <Badge className="bg-red-100 text-red-800">Frustrated</Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Summary:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            Service staff not available in canteen.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Classification Details Section */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 sm:p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h3 className="font-bold text-lg mb-4 text-orange-800 dark:text-orange-200 flex items-center flex-wrap">
                      <Target className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Classification Details</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Type:</p>
                        <Badge className="bg-blue-100 text-blue-800">Complaint</Badge>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Category:</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border break-words">
                          Food & Dining Issues
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Sub Category:</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border break-words">
                          Service & Staff Issues
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Issue Type:</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border break-words">
                          Delayed food service in restaurant
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Department:</p>
                        <Badge className="bg-purple-100 text-purple-800">F&B / Kitchen Department</Badge>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Urgency:</p>
                        <Badge className="bg-red-100 text-red-800">Urgency</Badge>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority:</p>
                        <Badge className="bg-red-100 text-red-800">High</Badge>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Urgency TAT (Mins):</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">15-60</p>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-1">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Suggested Action:</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border break-words">
                          Notify management to ensure adequate staffing in the canteen.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Department Staff Action Section */}
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 p-4 sm:p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="font-bold text-lg mb-4 text-green-800 dark:text-green-200 flex items-center flex-wrap">
                      <UserCheck className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Department Staff Action Details</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Staff Email ID:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border break-all">fb@ktahv.com</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Staff Name:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">Biju.R</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Planned Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/4/2025 11:08:51</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Actual Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/4/2025 11:09:30</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Delay:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">0:00:40</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Action Status:</p>
                          <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Action Points:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            Staff will be present
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Remarks:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            For the canteen operation, staff will be dedicated to the kitchen area for initial setup and
                            will maintain a constant presence inside throughout service hours. Team members will need to
                            move between the canteen, room side and kitchen as part of their duties
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Proof Screenshot:</p>
                          <a
                            href="https://tinyurl.com/22dfqu9x"
                            target="_blank"
                            className="text-sm text-blue-600 hover:text-blue-800 underline break-all inline-block bg-white dark:bg-gray-800 p-2 rounded border w-full"
                            rel="noreferrer"
                          >
                            View Screenshot
                          </a>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Resolved By:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">Biju.R</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Department Head Action Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 p-4 sm:p-6 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h3 className="font-bold text-lg mb-4 text-purple-800 dark:text-purple-200 flex items-center flex-wrap">
                      <Shield className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Department Head Action Details</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Head Name:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">Bonny Thomas</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Head Email ID:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border break-all">fb@ktahv.com</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Planned Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/4/2025 11:08:51</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Actual Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/5/2025 14:25:12</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Delay:</p>
                          <p className="text-sm bg-red-100 text-red-800 p-2 rounded border">27:16:21</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Action Status:</p>
                          <Badge className="bg-green-100 text-green-800">Verify and Close</Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Remarks:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border break-words">
                            Staff will be present in canteen during the operation hrs
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Alert Status:</p>
                          <p className="text-sm bg-yellow-100 text-yellow-800 p-2 rounded border break-words">
                            HT Sent - 05-05-25 09:18:07
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* General Manager Action Section */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-4 sm:p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h3 className="font-bold text-lg mb-4 text-orange-800 dark:text-orange-200 flex items-center flex-wrap">
                      <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>General Manager Action Details</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Planned Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/4/2025 11:08:51</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Actual Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/8/2025 3:28:07</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Delay:</p>
                          <p className="text-sm bg-red-100 text-red-800 p-2 rounded border">88:19:16</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Doer:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">Anoop Vijayaraj</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">GM Action Status:</p>
                          <Badge className="bg-green-100 text-green-800">Resolved-Closed</Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">GM Remarks:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border">Done</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Alert Status:</p>
                          <p className="text-sm bg-yellow-100 text-yellow-800 p-2 rounded border break-words">
                            HT Sent - 05-05-25 09:18:09
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Management Action Section */}
                  <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200 flex items-center flex-wrap">
                      <Settings className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Management Action Details</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Planned Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/4/2025 11:08:51</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Actual Time:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/8/2025 3:28:07</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Delay:</p>
                          <p className="text-sm bg-red-100 text-red-800 p-2 rounded border">88:19:16</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Doer:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">Abhilash Sir</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Management Action Status:
                          </p>
                          <Badge className="bg-green-100 text-green-800">Resolved-Closed</Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Management Action:</p>
                          <Badge className="bg-gray-100 text-gray-800">NO ACTION</Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Alert Status:</p>
                          <p className="text-sm bg-gray-100 text-gray-800 p-2 rounded border">NA</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-4 sm:p-6 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <h3 className="font-bold text-lg mb-4 text-indigo-800 dark:text-indigo-200 flex items-center flex-wrap">
                      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>Additional Information</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">WhatsApp To HR:</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">NA</p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          WhatsApp To Department Staff:
                        </p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">NA</p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          WhatsApp To Department Head:
                        </p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">NA</p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Date:</p>
                        <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">5/4/2025</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalType !== "view" && (
                <div>
                  {/* Department Staff Action Modal */}
                  {modalType === "staff" && (
                    <div className="space-y-6">
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          As department staff, you can take immediate action on this complaint and provide resolution
                          details.
                        </p>
                      </div>

                      <div className="border-2 border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-600 p-6 rounded-lg shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                          <h4 className="font-bold text-lg text-green-800 dark:text-green-200">
                            Department Staff Action Details
                          </h4>
                          <Badge className="ml-3 bg-green-600 text-white">Action Required</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <Label
                              htmlFor="staffActionStatus"
                              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                              DEPARTMENT STAFF ACTION STATUS
                            </Label>
                            <Select value={staffActionStatus} onValueChange={setStaffActionStatus}>
                              <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Select action status" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                                <SelectItem value="resolved" className="hover:bg-green-100 dark:hover:bg-green-900/30">
                                  Resolved
                                </SelectItem>
                                <SelectItem
                                  value="escalate"
                                  className="hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                >
                                  Escalate
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="staffActionPoints"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            DEPARTMENT STAFF ACTION POINTS
                          </Label>
                          <Textarea
                            id="staffActionPoints"
                            placeholder="Enter detailed action points taken..."
                            value={staffActionPoints}
                            onChange={(e) => setStaffActionPoints(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm resize-none"
                          />
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="staffRemarks"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            DEPARTMENT STAFF REMARKS
                          </Label>
                          <Textarea
                            id="staffRemarks"
                            placeholder="Enter detailed remarks about the action taken..."
                            value={staffRemarks}
                            onChange={(e) => setStaffRemarks(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                          />
                        </div>

                        <div className="mt-6">
                          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            DEPARTMENT STAFF UPLOAD PROOF OF SCREENSHOT
                          </Label>
                          <div className="mt-3 space-y-4">
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={startCamera}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                disabled={isCameraOpen}
                              >
                                <Camera className="h-4 w-4" />
                                Capture Image
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 hover:bg-green-50 dark:hover:bg-green-900/30"
                              >
                                <Upload className="h-4 w-4" />
                                Upload File
                              </Button>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />

                            {/* Camera View */}
                            {isCameraOpen && (
                              <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  className="w-full max-w-md border-2 border-gray-300 rounded-lg"
                                />
                                <div className="flex gap-2">
                                  <Button onClick={captureImage} size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Camera className="h-4 w-4 mr-1" />
                                    Capture
                                  </Button>
                                  <Button onClick={stopCamera} variant="outline" size="sm">
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Hidden canvas for image capture */}
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Preview captured image */}
                            {capturedImage && (
                              <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-green-300">
                                <p className="text-sm font-medium text-green-600">Captured Image:</p>
                                <img
                                  src={capturedImage || "/placeholder.svg"}
                                  alt="Captured proof"
                                  className="max-w-md border-2 border-gray-300 rounded-lg"
                                />
                                <Button onClick={() => setCapturedImage(null)} variant="outline" size="sm">
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            )}

                            {/* Preview uploaded file */}
                            {uploadedFile && (
                              <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-300">
                                <p className="text-sm font-medium text-blue-600">Uploaded File:</p>
                                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded border">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                                  <Button onClick={() => setUploadedFile(null)} variant="ghost" size="sm">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="resolvedBy"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            RESOLVED BY
                          </Label>
                          <Select value={resolvedBy} onValueChange={setResolvedBy}>
                            <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                              <SelectItem value="vibin-s" className="hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                Vibin S
                              </SelectItem>
                              <SelectItem value="sheeji-c" className="hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                Sheeji C
                              </SelectItem>
                              <SelectItem value="achanya-b" className="hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                Achanya B
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Department Head Action Modal */}
                  {modalType === "head" && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          As department head, you can review and take action on this complaint and provide resolution
                          details.
                        </p>
                      </div>

                      <div className="border-2 border-purple-300 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-600 p-6 rounded-lg shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                          <h4 className="font-bold text-lg text-purple-800 dark:text-purple-200">
                            Department Head Action Details
                          </h4>
                          <Badge className="ml-3 bg-purple-600 text-white">Action Required</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <Label
                              htmlFor="headActionStatus"
                              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                              DEPARTMENT HEAD ACTION STATUS
                            </Label>
                            <Select value={staffActionStatus} onValueChange={setStaffActionStatus}>
                              <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Select action status" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                                <SelectItem value="resolved" className="hover:bg-green-100 dark:hover:bg-green-900/30">
                                  Resolved
                                </SelectItem>
                                <SelectItem
                                  value="escalate"
                                  className="hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                >
                                  Escalate
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="headActionPoints"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            DEPARTMENT HEAD ACTION POINTS
                          </Label>
                          <Textarea
                            id="headActionPoints"
                            placeholder="Enter detailed action points taken..."
                            value={staffActionPoints}
                            onChange={(e) => setStaffActionPoints(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm resize-none"
                          />
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="headRemarks"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            DEPARTMENT HEAD REMARKS
                          </Label>
                          <Textarea
                            id="headRemarks"
                            placeholder="Enter detailed remarks about the action taken..."
                            value={staffRemarks}
                            onChange={(e) => setStaffRemarks(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                          />
                        </div>

                        <div className="mt-6">
                          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            DEPARTMENT HEAD UPLOAD PROOF OF SCREENSHOT
                          </Label>
                          <div className="mt-3 space-y-4">
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={startCamera}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                disabled={isCameraOpen}
                              >
                                <Camera className="h-4 w-4" />
                                Capture Image
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 hover:bg-green-50 dark:hover:bg-green-900/30"
                              >
                                <Upload className="h-4 w-4" />
                                Upload File
                              </Button>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />

                            {/* Camera View */}
                            {isCameraOpen && (
                              <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  className="w-full max-w-md border-2 border-gray-300 rounded-lg"
                                />
                                <div className="flex gap-2">
                                  <Button onClick={captureImage} size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Camera className="h-4 w-4 mr-1" />
                                    Capture
                                  </Button>
                                  <Button onClick={stopCamera} variant="outline" size="sm">
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Hidden canvas for image capture */}
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Preview captured image */}
                            {capturedImage && (
                              <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-green-300">
                                <p className="text-sm font-medium text-green-600">Captured Image:</p>
                                <img
                                  src={capturedImage || "/placeholder.svg"}
                                  alt="Captured proof"
                                  className="max-w-md border-2 border-gray-300 rounded-lg"
                                />
                                <Button onClick={() => setCapturedImage(null)} variant="outline" size="sm">
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            )}

                            {/* Preview uploaded file */}
                            {uploadedFile && (
                              <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-300">
                                <p className="text-sm font-medium text-blue-600">Uploaded File:</p>
                                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded border">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                                  <Button onClick={() => setUploadedFile(null)} variant="ghost" size="sm">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="headResolvedBy"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            RESOLVED BY
                          </Label>
                          <Select value={resolvedBy} onValueChange={setResolvedBy}>
                            <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                              <SelectItem value="vibin-s" className="hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                Vibin S
                              </SelectItem>
                              <SelectItem value="sheeji-c" className="hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                Sheeji C
                              </SelectItem>
                              <SelectItem value="achanya-b" className="hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                Achanya B
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* General Manager Verification Modal */}
                  {modalType === "manager" && (
                    <div className="space-y-6">
                      <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          As general manager, you can verify the resolution and provide final approval.
                        </p>
                      </div>

                      <div className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 dark:bg-gradient-to-br dark:from-orange-950/30 dark:to-orange-900/20 dark:border-orange-600 p-6 rounded-lg shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="w-3 h-3 bg-orange-500 rounded-full mr-3 animate-pulse"></div>
                          <h4 className="font-bold text-lg text-orange-800 dark:text-orange-200">
                            General Manager Action Details
                          </h4>
                          <Badge className="ml-3 bg-orange-600 text-white">Action Required</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <Label
                              htmlFor="gmActionStatus"
                              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                              GM ACTION STATUS
                            </Label>
                            <Select value={gmActionStatus} onValueChange={setGmActionStatus}>
                              <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Select action status" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                                <SelectItem
                                  value="resolved-closed"
                                  className="hover:bg-green-100 dark:hover:bg-green-900/30"
                                >
                                  Resolved-Closed
                                </SelectItem>
                                <SelectItem value="not-resolved" className="hover:bg-red-100 dark:hover:bg-red-900/30">
                                  Not Resolved
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="gmActionPoints"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            GM ACTION POINTS
                          </Label>
                          <Textarea
                            id="gmActionPoints"
                            placeholder="Enter detailed action points taken..."
                            value={staffActionPoints}
                            onChange={(e) => setStaffActionPoints(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm resize-none"
                          />
                        </div>

                        <div className="mt-6">
                          <Label htmlFor="gmRemarks" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            GM REMARKS
                          </Label>
                          <Textarea
                            id="gmRemarks"
                            placeholder="Enter detailed remarks about the verification..."
                            value={gmRemarks}
                            onChange={(e) => setGmRemarks(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Management Check Modal */}
                  {modalType === "management" && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg">
                        <p className="text-sm text-slate-800 dark:text-slate-200">
                          Final management review and action on the complaint resolution.
                        </p>
                      </div>

                      <div className="border-2 border-slate-400 bg-gradient-to-br from-slate-100 to-slate-200 dark:bg-gradient-to-br dark:from-slate-950/40 dark:to-slate-900/30 dark:border-slate-500 p-6 rounded-lg shadow-md">
                        <div className="flex items-center mb-4">
                          <div className="w-3 h-3 bg-slate-600 rounded-full mr-3 animate-pulse"></div>
                          <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                            Management Action Details
                          </h4>
                          <Badge className="ml-3 bg-slate-700 text-white">Action Required</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <Label
                              htmlFor="managementActionStatus"
                              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                              MANAGEMENT ACTION STATUS
                            </Label>
                            <Select value={managementActionStatus} onValueChange={setManagementActionStatus}>
                              <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Select action status" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                                <SelectItem
                                  value="resolved-closed"
                                  className="hover:bg-green-100 dark:hover:bg-green-900/30"
                                >
                                  Resolved-Closed
                                </SelectItem>
                                <SelectItem
                                  value="resolved-preventive"
                                  className="hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                >
                                  Resolved-Send to Preventive
                                </SelectItem>
                                <SelectItem
                                  value="not-resolved-reopen"
                                  className="hover:bg-red-100 dark:hover:bg-red-900/30"
                                >
                                  Not Resolved-Reopen
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="managementAction"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            MANAGEMENT ACTION
                          </Label>
                          <Select value={managementAction} onValueChange={setManagementAction}>
                            <SelectTrigger className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm">
                              <SelectValue placeholder="Select management action" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                              <SelectItem value="no-action" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                NO ACTION
                              </SelectItem>
                              <SelectItem value="warning" className="hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
                                WARNING
                              </SelectItem>
                              <SelectItem value="half-day" className="hover:bg-orange-100 dark:hover:bg-orange-900/30">
                                HALF DAY
                              </SelectItem>
                              <SelectItem value="lop" className="hover:bg-red-100 dark:hover:bg-red-900/30">
                                LOP
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mt-6">
                          <Label
                            htmlFor="managementRemarks"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                          >
                            MANAGEMENT REMARKS
                          </Label>
                          <Textarea
                            id="managementRemarks"
                            placeholder="Enter detailed management remarks..."
                            value={managementRemarks}
                            onChange={(e) => setManagementRemarks(e.target.value)}
                            rows={4}
                            className="mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={handleModalClose}>
                  {modalType === "view" ? "Close" : "Cancel"}
                </Button>
                {modalType !== "view" && (
                  <Button onClick={handleActionSubmit} className="bg-blue-600 hover:bg-blue-700">
                    {modalType === "staff"
                      ? "Submit Staff Action"
                      : modalType === "head"
                        ? "Submit Head Action"
                        : modalType === "manager"
                          ? "Submit GM Verification"
                          : modalType === "management"
                            ? "Submit Management Review"
                            : "Submit Changes"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
