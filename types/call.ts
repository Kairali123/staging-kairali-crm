export type CallDisposition =
  | "connected"
  | "not_connected"
  | "busy"
  | "no_answer"
  | "wrong_number"
  | "interested"
  | "not_interested"
  | "callback_requested"
  | "meeting_scheduled"
  | "converted"

export type CallType = "new_call" | "follow_up" | "callback"

export interface CallLog {
  id: string
  leadId: string
  agentId: string
  phoneNumber: string
  callType: CallType
  disposition: CallDisposition
  duration: number // in seconds
  startTime: string
  endTime?: string
  remarks: string
  followUpDate?: string
  meetingScheduled?: string
  convertedAmount?: number
  createdAt: string
}

export interface CallSession {
  id: string
  agentId: string
  startTime: string
  endTime?: string
  totalCalls: number
  connectedCalls: number
  followUpCalls: number
  newCalls: number
  conversions: number
  totalTalkTime: number // in seconds
  isActive: boolean
}

export interface AgentPerformance {
  agentId: string
  date: string
  totalCalls: number
  connectedCalls: number
  followUpCalls: number
  newCalls: number
  conversions: number
  conversionAmount: number
  talkTime: number
  loginTime: string
  logoutTime?: string
  pauseTime: number
  liveTime: number
  score: number
  rank: number
}
