export interface Lead {
  id: string
  serialNo: number
  generateDate: string
  enquiryDate: string
  leadId: string
  clientName: string
  mobile: string
  email: string
  subject: string
  notes: string
  url: string
  website: string
  dataSource: "KTAHV" | "KAPPL" | "VILLARAAG"
  assignedTo: string
  remarksHistory: string
  leadStatus: "New" | "Contacted" | "Qualified" | "Converted"
  leadIntent: "High" | "Medium" | "Low"
  priority: "Urgent" | "Normal" | "Low"
  currentEnquiryStatus: "Cold" | "First Followup" | "Under Conversion" | "Converted" | "Hot" | "Warm"
}

export interface FollowUp {
  id: string
  date: string
  time: string
  plannedDate: string
  actualDate: string
  enquiryStatus: "Cold" | "First Followup" | "Under Conversion" | "Converted" | "Hot" | "Warm"
  followUpDoneIn: "Dialer" | "Appsheet" | "Manual" | "WhatsApp"
  potentialValue: number
  sqv: number
  mobile: string
  email: string
  enquiryDetails: string
  agentRemarks: string
  nextAction: string
  nextFollowUpDate: string
  agent: string
  callStatus: "Connected" | "Not Connected" | "Busy" | "No Answer" | "Wrong Number" | "Switched Off"
  callRemarks: string
  recordingUrl?: string
  callDuration?: number
}

export type DataSourceFilter = "All" | "KTAHV" | "KAPPL" | "VILLARAAG"
