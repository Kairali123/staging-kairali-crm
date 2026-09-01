export interface BookingEntry {
  id: string
  clientName: string
  phoneNumber: string
  email?: string
  service: string
  appointmentDate: string
  appointmentTime: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  assignedDoctor?: string
  department: string
  remarks?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ComplaintEntry {
  id: string
  complaintId: string
  clientName: string
  phoneNumber: string
  email?: string
  complaintType: "service" | "billing" | "staff" | "facility" | "other"
  priority: "low" | "medium" | "high" | "critical"
  description: string
  status: "open" | "in-progress" | "resolved" | "closed"
  assignedTo?: string
  department: string
  resolution?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  createdBy: string
}

export interface FMSStats {
  totalBookings: number
  todayBookings: number
  pendingBookings: number
  completedBookings: number
  totalComplaints: number
  openComplaints: number
  resolvedComplaints: number
  avgResolutionTime: number
}
