export type LeadSource = "website" | "facebook" | "google_ads" | "referral" | "walk_in" | "phone" | "email" | "whatsapp"

export type LeadPriority = "high" | "medium" | "low"
export type LeadUrgency = "urgent" | "normal" | "low"
export type LeadStatus =
  | "new"
  | "assigned"
  | "contacted"
  | "follow_up"
  | "converted"
  | "cold"
  | "not_connected"
  | "delayed"
  | "untouched"

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company: "KAPPL" | "KTAHV" | "VILLARAAG"
  source: LeadSource | string
  priority: LeadPriority
  urgency?: LeadUrgency
  status: LeadStatus
  assignedTo?: string
  assignedBy?: string
  createdAt: string
  updatedAt?: string
  tat?: number | null
  lastContactedAt?: string
  nextFollowUpAt?: string
  convertedAt?: string
  convertedAmount?: number
  remarks?: string[]
  isDuplicate?: boolean
  duplicateOf?: string
  tatBreached: boolean
  tatBreachedAt?: string
  tags?: string[]
  category?: string
  location?: string
  requirements?: string
  subject?: string
  notes?: string
  ivrUrl?: string | null
  websiteName?: string
  timestampTranscription?: string
  userName?: string
  userPhone?: string
  userEmail?: string
  country?: string
  contactTime?: string
  conversationSummary?: string
  leadOutcome?: string
  leadCategory?: string
  preferredContact?: string
  lastCallDate?: string
  lastDisposition?: string
  lastRemarks?: string
  callRecordingUrl?: string | null
}

export interface LeadActivity {
  id: string
  leadId: string
  type: "created" | "assigned" | "contacted" | "status_changed" | "remark_added" | "follow_up_scheduled"
  description: string
  performedBy: string
  performedAt: string
  metadata?: Record<string, any>
}

export interface LeadStats {
  total: number
  new: number
  assigned: number
  contacted: number
  followUp: number
  converted: number
  cold: number
  notConnected: number
  delayed: number
  untouched: number
  tatBreached: number
  duplicates: number
  conversionRate: number
  avgResponseTime: number
}
