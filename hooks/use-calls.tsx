"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { CallLog, CallSession, AgentPerformance, CallDisposition, CallType } from "@/types/call"
import type { Lead } from "@/types/lead"
import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"

interface CallsContextType {
  callLogs: CallLog[]
  currentSession: CallSession | null
  agentPerformance: AgentPerformance[]
  startCall: (lead: Lead, callType: CallType) => Promise<string>
  endCall: (
    callId: string,
    disposition: CallDisposition,
    remarks: string,
    followUpDate?: string,
    meetingDate?: string,
    convertedAmount?: number,
  ) => Promise<void>
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  getCallHistory: (leadId?: string) => CallLog[]
  getTodayPerformance: (agentId: string) => AgentPerformance | null
  getCallsByDateRange: (startDate: string, endDate: string) => CallLog[]
  isLoading: boolean
}

const CallsContext = createContext<CallsContextType | undefined>(undefined)

const mockCallLogs: CallLog[] = [
  {
    id: "1",
    leadId: "1",
    agentId: "3",
    phoneNumber: "+91-9876543210",
    callType: "new_call",
    disposition: "connected",
    duration: 180,
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:03:00Z",
    remarks: "Initial contact made, customer interested in consultation",
    followUpDate: "2024-01-16T10:00:00Z",
    createdAt: "2024-01-15T10:03:00Z",
  },
  {
    id: "2",
    leadId: "2",
    agentId: "3",
    phoneNumber: "+91-9876543211",
    callType: "follow_up",
    disposition: "meeting_scheduled",
    duration: 240,
    startTime: "2024-01-15T11:00:00Z",
    endTime: "2024-01-15T11:04:00Z",
    remarks: "Meeting scheduled for consultation",
    meetingScheduled: "2024-01-17T14:00:00Z",
    createdAt: "2024-01-15T11:04:00Z",
  },
]

export function CallsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { updateLead } = useLeads()
  const [callLogs, setCallLogs] = useState<CallLog[]>(mockCallLogs)
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null)
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeCall, setActiveCall] = useState<string | null>(null)

  // Calculate agent performance
  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split("T")[0]
      const todayCalls = callLogs.filter((call) => call.agentId === user.id && call.createdAt.startsWith(today))

      const performance: AgentPerformance = {
        agentId: user.id,
        date: today,
        totalCalls: todayCalls.length,
        connectedCalls: todayCalls.filter((call) => call.disposition === "connected").length,
        followUpCalls: todayCalls.filter((call) => call.callType === "follow_up").length,
        newCalls: todayCalls.filter((call) => call.callType === "new_call").length,
        conversions: todayCalls.filter((call) => call.disposition === "converted").length,
        conversionAmount: todayCalls.reduce((sum, call) => sum + (call.convertedAmount || 0), 0),
        talkTime: todayCalls.reduce((sum, call) => sum + call.duration, 0),
        loginTime: currentSession?.startTime || new Date().toISOString(),
        pauseTime: 0,
        liveTime: currentSession ? Date.now() - new Date(currentSession.startTime).getTime() : 0,
        score: calculateAgentScore(todayCalls),
        rank: 1,
      }

      setAgentPerformance((prev) => {
        const filtered = prev.filter((p) => p.agentId !== user.id || p.date !== today)
        return [...filtered, performance]
      })
    }
  }, [callLogs, currentSession, user])

  const calculateAgentScore = (calls: CallLog[]): number => {
    if (calls.length === 0) return 0

    const connectedRate = calls.filter((c) => c.disposition === "connected").length / calls.length
    const conversionRate = calls.filter((c) => c.disposition === "converted").length / calls.length
    const avgTalkTime = calls.reduce((sum, c) => sum + c.duration, 0) / calls.length

    // Score based on connection rate (40%), conversion rate (40%), and talk time (20%)
    return Math.round(
      connectedRate * 40 + conversionRate * 40 + Math.min(avgTalkTime / 300, 1) * 20, // Max 5 minutes talk time for full score
    )
  }

  const startSession = async () => {
    if (!user) return

    const session: CallSession = {
      id: Date.now().toString(),
      agentId: user.id,
      startTime: new Date().toISOString(),
      totalCalls: 0,
      connectedCalls: 0,
      followUpCalls: 0,
      newCalls: 0,
      conversions: 0,
      totalTalkTime: 0,
      isActive: true,
    }

    setCurrentSession(session)
  }

  const endSession = async () => {
    if (currentSession) {
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              endTime: new Date().toISOString(),
              isActive: false,
            }
          : null,
      )
    }
  }

  const pauseSession = async () => {
    if (currentSession) {
      setCurrentSession((prev) => (prev ? { ...prev, isActive: false } : null))
    }
  }

  const resumeSession = async () => {
    if (currentSession) {
      setCurrentSession((prev) => (prev ? { ...prev, isActive: true } : null))
    }
  }

  const startCall = async (lead: Lead, callType: CallType): Promise<string> => {
    if (!user) throw new Error("User not authenticated")

    const callId = Date.now().toString()
    setActiveCall(callId)

    // Update session stats
    if (currentSession) {
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              totalCalls: prev.totalCalls + 1,
              newCalls: callType === "new_call" ? prev.newCalls + 1 : prev.newCalls,
              followUpCalls: callType === "follow_up" ? prev.followUpCalls + 1 : prev.followUpCalls,
            }
          : null,
      )
    }

    return callId
  }

  const endCall = async (
    callId: string,
    disposition: CallDisposition,
    remarks: string,
    followUpDate?: string,
    meetingDate?: string,
    convertedAmount?: number,
  ) => {
    if (!user || !activeCall) return

    const startTime = new Date(Date.now() - 60000).toISOString() // Mock start time
    const endTime = new Date().toISOString()
    const duration = 60 // Mock duration

    const callLog: CallLog = {
      id: callId,
      leadId: activeCall,
      agentId: user.id,
      phoneNumber: "+91-9876543210", // This would come from the lead
      callType: "new_call", // This would be passed from startCall
      disposition,
      duration,
      startTime,
      endTime,
      remarks,
      followUpDate,
      meetingScheduled: meetingDate,
      convertedAmount,
      createdAt: endTime,
    }

    setCallLogs((prev) => [...prev, callLog])

    // Update session stats
    if (currentSession) {
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              connectedCalls: disposition === "connected" ? prev.connectedCalls + 1 : prev.connectedCalls,
              conversions: disposition === "converted" ? prev.conversions + 1 : prev.conversions,
              totalTalkTime: prev.totalTalkTime + duration,
            }
          : null,
      )
    }

    // Update lead status based on disposition
    let newStatus = "contacted"
    if (disposition === "converted") newStatus = "converted"
    else if (disposition === "not_interested") newStatus = "cold"
    else if (followUpDate) newStatus = "follow_up"

    await updateLead(activeCall, {
      status: newStatus as any,
      lastContactedAt: endTime,
      nextFollowUpAt: followUpDate,
      convertedAt: disposition === "converted" ? endTime : undefined,
      convertedAmount: convertedAmount,
    })

    setActiveCall(null)
  }

  const getCallHistory = (leadId?: string): CallLog[] => {
    if (leadId) {
      return callLogs.filter((call) => call.leadId === leadId)
    }
    return callLogs.filter((call) => user?.permissions.includes("all") || call.agentId === user?.id)
  }

  const getTodayPerformance = (agentId: string): AgentPerformance | null => {
    const today = new Date().toISOString().split("T")[0]
    return agentPerformance.find((p) => p.agentId === agentId && p.date === today) || null
  }

  const getCallsByDateRange = (startDate: string, endDate: string): CallLog[] => {
    return callLogs.filter((call) => {
      const callDate = call.createdAt.split("T")[0]
      return callDate >= startDate && callDate <= endDate
    })
  }

  return (
    <CallsContext.Provider
      value={{
        callLogs,
        currentSession,
        agentPerformance,
        startCall,
        endCall,
        startSession,
        endSession,
        pauseSession,
        resumeSession,
        getCallHistory,
        getTodayPerformance,
        getCallsByDateRange,
        isLoading,
      }}
    >
      {children}
    </CallsContext.Provider>
  )
}

export function useCalls() {
  const context = useContext(CallsContext)
  if (context === undefined) {
    throw new Error("useCalls must be used within a CallsProvider")
  }
  return context
}
