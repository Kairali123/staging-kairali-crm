"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Lead, LeadActivity, LeadStats, LeadPriority, LeadUrgency, LeadStatus } from "@/types/lead"
import { useAuth } from "@/hooks/use-auth"
import { clearLeadsCacheArtifacts, LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control"

interface LeadsContextType {
  leads: Lead[]
  activities: LeadActivity[]
  stats: LeadStats
  conversion: Map<string, any> | null
  spent: Map<string, any> | null
  createLead: (leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  assignLead: (leadId: string, assignedTo: string) => Promise<void>
  addRemark: (leadId: string, remark: string) => Promise<void>
  scheduleFollowUp: (leadId: string, followUpDate: string) => Promise<void>
  searchLeads: (query: string) => Lead[]
  getLeadsByAgent: (agentId: string) => Lead[]
  getLeadActivities: (leadId: string) => LeadActivity[]
  checkDuplicates: (phone: string, email: string) => Lead[]
  refreshLeads: (options?: { force?: boolean; silent?: boolean } | boolean) => Promise<void>
  clearLeadsCache: () => Promise<void>
  // page.tsx isse call karta hai fetched data pass karke — sirf state update hoti hai
  getLeads: (data: any[]) => void
  isLoading: boolean
  isInitialLoading: boolean
  error: string | null
  isLeadsLoaded: boolean
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined)

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwCVCcjxnLMWImPOxmiXUwAtMmt1oToow47etN7VjBpnmlPJHFoiblgTAY7nJ3YuE5IQ/exec"

class GoogleSheetsAPI {
  private baseUrl: string
  constructor(baseUrl: string) { this.baseUrl = baseUrl }

  async createLead(leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<{ id: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createLead', leadData }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'Failed to create lead')
    return result.data
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateLead', id, updates }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'Failed to update lead')
  }

  async addRemark(leadId: string, remark: string): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addRemark', leadId, remark }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'Failed to add remark')
  }
}

const aiVerifyLead = (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">): { priority: LeadPriority; urgency: LeadUrgency } => {
  let priority: LeadPriority = "medium"
  let urgency: LeadUrgency = "normal"
  if (["referral", "walk_in"].includes(lead.source)) { priority = "high"; urgency = "urgent" }
  if (lead.requirements?.toLowerCase().includes("urgent") || lead.requirements?.toLowerCase().includes("immediate")) {
    urgency = "urgent"; priority = "high"
  }
  if (lead.company === "KTAHV" && lead.requirements?.toLowerCase().includes("treatment")) priority = "high"
  return { priority, urgency }
}

const mockActivities: LeadActivity[] = [
  {
    id: "1", leadId: "2", type: "assigned",
    description: "Lead assigned to Priya Sharma",
    performedBy: "2", performedAt: "2024-01-14T16:00:00Z",
  },
  {
    id: "2", leadId: "2", type: "contacted",
    description: "Initial contact made via phone",
    performedBy: "3", performedAt: "2024-01-15T09:00:00Z",
  },
]

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [conversion, setConversion] = useState<Map<string, any> | null>(null)
  const [spent, setSpent] = useState<Map<string, any> | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>(mockActivities)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLeadsLoaded, setIsLeadsLoaded] = useState(false)

  const api = new GoogleSheetsAPI(GOOGLE_APPS_SCRIPT_URL)

  const calculateStats = (): LeadStats => {
    const total = leads.length
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const converted = statusCounts.converted || 0
    return {
      total,
      new: statusCounts.new || 0,
      assigned: statusCounts.assigned || 0,
      contacted: statusCounts.contacted || 0,
      followUp: statusCounts.follow_up || 0,
      converted,
      cold: statusCounts.cold || 0,
      notConnected: statusCounts.not_connected || 0,
      delayed: statusCounts.delayed || 0,
      untouched: statusCounts.untouched || 0,
      tatBreached: leads.filter((l) => l.tatBreached).length,
      duplicates: leads.filter((l) => l.isDuplicate).length,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      avgResponseTime: 2.5,
    }
  }

  // ─── KEY FUNCTION ────────────────────────────────────────────────────
  // page.tsx khud API fetch karta hai aur yahan data pass karta hai
  // Sirf leads state update hoti hai — koi API call nahi
  const getLeads = (data: any[]) => {
    setLeads(data)
    setIsLeadsLoaded(true)
  }
  // ─────────────────────────────────────────────────────────────────────

  // Internal refreshLeads — createLead/updateLead ke baad sync ke liye
  const refreshLeads = async (options?: { force?: boolean; silent?: boolean } | boolean) => {
    const normalized = typeof options === "boolean" ? { force: options } : (options ?? {})
    const force = normalized.force ?? false
    const silent = normalized.silent ?? false

    if (!silent) {
      setIsLoading(true)
      setError(null)
    }
    try {
      const url = new URL("/api/leads", window.location.origin)
      url.searchParams.set("page", "1")
      url.searchParams.set("limit", "999999")
      if (force) url.searchParams.set("force", "1")

      const response = await fetch(url.toString(), {
        cache: force ? "no-store" : "default",
        headers: force ? { "Cache-Control": "no-cache" } : undefined,
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to fetch leads')

      setLeads(result.data)

      if (result.conversion) {
        const conversionMap: Map<string, any> = Array.isArray(result.conversion)
          ? new Map<string, any>(result.conversion as [string, any][])
          : new Map<string, any>(Object.entries(result.conversion as Record<string, any>))
        setConversion(conversionMap)
      }
      setSpent(new Map<string, any>(Object.entries((result.spentAmount || {}) as Record<string, any>)))
      setIsLeadsLoaded(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads'
      setError(errorMessage)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const clearLeadsCache = async () => {
    await clearLeadsCacheArtifacts()

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(LEADS_CACHE_CLEARED_EVENT))
    }
  }

  const checkDuplicates = (phone: string, email: string): Lead[] => {
    return leads.filter((lead) => lead.phone === phone || lead.email.toLowerCase() === email.toLowerCase())
  }

  const createLead = async (leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">) => {
    setIsLoading(true)
    setError(null)
    try {
      const duplicates = checkDuplicates(leadData.phone, leadData.email)
      const isDuplicate = duplicates.length > 0
      const aiResult = aiVerifyLead(leadData)
      const enrichedLeadData = {
        ...leadData,
        priority: aiResult.priority,
        urgency: aiResult.urgency,
        isDuplicate,
        duplicateOf: isDuplicate ? duplicates[0].id : undefined,
        tatBreached: false,
        remarks: leadData.remarks || [],
        status: leadData.status || 'new' as LeadStatus,
      }
      const result = await api.createLead(enrichedLeadData)
      const activity: LeadActivity = {
        id: Date.now().toString(),
        leadId: result.id,
        type: "created",
        description: `Lead created from ${leadData.source}${isDuplicate ? " (Duplicate detected)" : ""}`,
        performedBy: user?.id || "system",
        performedAt: new Date().toISOString(),
      }
      setActivities((prev) => [...prev, activity])
      await refreshLeads()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lead'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.updateLead(id, updates)
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, ...updates, updatedAt: new Date().toISOString() } : lead))
      )
      if (updates.status) {
        const activity: LeadActivity = {
          id: Date.now().toString(),
          leadId: id,
          type: "status_changed",
          description: `Status changed to ${updates.status}`,
          performedBy: user?.id || "system",
          performedAt: new Date().toISOString(),
        }
        setActivities((prev) => [...prev, activity])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead'
      setError(errorMessage)
      await refreshLeads()
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const assignLead = async (leadId: string, assignedTo: string) => {
    await updateLead(leadId, {
      assignedTo,
      assignedBy: user?.id,
      status: "assigned" as LeadStatus,
    })
    const activity: LeadActivity = {
      id: Date.now().toString(),
      leadId,
      type: "assigned",
      description: `Lead assigned to agent`,
      performedBy: user?.id || "system",
      performedAt: new Date().toISOString(),
    }
    setActivities((prev) => [...prev, activity])
  }

  const addRemark = async (leadId: string, remark: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await api.addRemark(leadId, remark)
      const lead = leads.find((l) => l.id === leadId)
      if (lead) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, remarks: [...(l.remarks ?? []), remark], lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : l
          )
        )
      }
      const activity: LeadActivity = {
        id: Date.now().toString(),
        leadId,
        type: "remark_added",
        description: `Remark added: ${remark}`,
        performedBy: user?.id || "system",
        performedAt: new Date().toISOString(),
      }
      setActivities((prev) => [...prev, activity])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add remark'
      setError(errorMessage)
      await refreshLeads()
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const scheduleFollowUp = async (leadId: string, followUpDate: string) => {
    await updateLead(leadId, { nextFollowUpAt: followUpDate, status: "follow_up" as LeadStatus })
    const activity: LeadActivity = {
      id: Date.now().toString(),
      leadId,
      type: "follow_up_scheduled",
      description: `Follow-up scheduled for ${new Date(followUpDate).toLocaleDateString()}`,
      performedBy: user?.id || "system",
      performedAt: new Date().toISOString(),
    }
    setActivities((prev) => [...prev, activity])
  }

  const searchLeads = (query: string): Lead[] => {
    const lowercaseQuery = query.toLowerCase()
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(lowercaseQuery) ||
        lead.email.toLowerCase().includes(lowercaseQuery) ||
        lead.phone.includes(query) ||
        lead.source.toLowerCase().includes(lowercaseQuery) ||
        lead.requirements?.toLowerCase().includes(lowercaseQuery),
    )
  }

  const getLeadsByAgent = (agentId: string): Lead[] => leads.filter((lead) => lead.assignedTo === agentId)

  const getLeadActivities = (leadId: string): LeadActivity[] => activities.filter((activity) => activity.leadId === leadId)

  // TAT breach check — every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.status === "new" && !lead.tatBreached) {
            const hoursDiff = (now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60)
            if (hoursDiff > 4) {
              return { ...lead, tatBreached: true, tatBreachedAt: now.toISOString() }
            }
          }
          return lead
        })
      )
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const stats = calculateStats()

  return (
    <LeadsContext.Provider
      value={{
        leads,
        activities,
        stats,
        conversion,
        spent,
        createLead,
        updateLead,
        assignLead,
        addRemark,
        scheduleFollowUp,
        searchLeads,
        getLeadsByAgent,
        getLeadActivities,
        checkDuplicates,
        refreshLeads,
        clearLeadsCache,
        getLeads,
        isLoading,
        isInitialLoading,
        error,
        isLeadsLoaded,
      }}
    >
      {children}
    </LeadsContext.Provider>
  )
}

export function useLeads() {
  const context = useContext(LeadsContext)
  if (context === undefined) {
    throw new Error("useLeads must be used within a LeadsProvider")
  }
  return context
}
