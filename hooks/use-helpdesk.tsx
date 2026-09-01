"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import type { Ticket, TicketComment, KnowledgeBaseArticle, HelpdeskStats } from "@/types/helpdesk"

const mockTickets: Ticket[] = [
  {
    id: "1",
    ticketNumber: "HD-2024-001",
    title: "Computer not starting",
    description: "My workstation won't boot up after the power outage yesterday",
    category: "IT",
    priority: "high",
    status: "in-progress",
    assignedTo: "IT Support Team",
    assignedTeam: "IT",
    createdBy: "emp_001",
    createdAt: "2024-01-19T09:00:00Z",
    updatedAt: "2024-01-19T10:30:00Z",
    dueDate: "2024-01-20T17:00:00Z",
    tags: ["hardware", "urgent"],
    comments: [
      {
        id: "c1",
        ticketId: "1",
        userId: "it_001",
        userName: "Ravi Kumar",
        userRole: "IT Support",
        content: "Checking the hardware components. Will update soon.",
        isInternal: false,
        createdAt: "2024-01-19T10:30:00Z",
      },
    ],
    slaBreached: false,
    escalated: false,
  },
  {
    id: "2",
    ticketNumber: "HD-2024-002",
    title: "Leave application not working",
    description: "Unable to submit leave application through the portal",
    category: "HR",
    priority: "medium",
    status: "open",
    createdBy: "emp_002",
    createdAt: "2024-01-19T11:15:00Z",
    updatedAt: "2024-01-19T11:15:00Z",
    dueDate: "2024-01-22T17:00:00Z",
    tags: ["portal", "leave"],
    comments: [],
    slaBreached: false,
    escalated: false,
  },
]

const mockKnowledgeBase: KnowledgeBaseArticle[] = [
  {
    id: "1",
    title: "How to reset your password",
    content: "Step-by-step guide to reset your system password...",
    category: "IT",
    tags: ["password", "login", "security"],
    views: 245,
    helpful: 23,
    notHelpful: 2,
    createdBy: "it_admin",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    published: true,
  },
  {
    id: "2",
    title: "Leave policy and procedures",
    content: "Complete guide to leave application and approval process...",
    category: "HR",
    tags: ["leave", "policy", "procedures"],
    views: 189,
    helpful: 18,
    notHelpful: 1,
    createdBy: "hr_admin",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
    published: true,
  },
]

const HelpdeskContext = createContext<{
  tickets: Ticket[]
  knowledgeBase: KnowledgeBaseArticle[]
  stats: HelpdeskStats
  loading: boolean
  createTicket: (
    ticket: Omit<Ticket, "id" | "ticketNumber" | "createdAt" | "updatedAt" | "comments" | "slaBreached" | "escalated">,
  ) => Promise<{ success: boolean; data?: Ticket; error?: string }>
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<{ success: boolean; error?: string }>
  addComment: (
    ticketId: string,
    comment: Omit<TicketComment, "id" | "createdAt">,
  ) => Promise<{ success: boolean; error?: string }>
  searchKnowledgeBase: (query: string) => KnowledgeBaseArticle[]
} | null>(null)

export function HelpdeskProvider({ children }: { children: React.ReactNode }) {
  const helpdesk = useHelpdesk()
  return <HelpdeskContext.Provider value={helpdesk}>{children}</HelpdeskContext.Provider>
}

export function useHelpdeskContext() {
  const context = useContext(HelpdeskContext)
  if (!context) {
    throw new Error("useHelpdeskContext must be used within HelpdeskProvider")
  }
  return context
}

const useHelpdeskHook = () => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseArticle[]>(mockKnowledgeBase)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<HelpdeskStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedToday: 0,
    avgResolutionTime: 0,
    slaBreaches: 0,
    escalatedTickets: 0,
    ticketsByCategory: {},
    ticketsByPriority: {},
  })

  useEffect(() => {
    calculateStats()
  }, [tickets])

  const calculateStats = () => {
    const today = new Date().toISOString().split("T")[0]

    const newStats: HelpdeskStats = {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === "open").length,
      inProgressTickets: tickets.filter((t) => t.status === "in-progress").length,
      resolvedToday: tickets.filter((t) => t.resolvedAt?.startsWith(today)).length,
      avgResolutionTime: 1.5, // Mock average in days
      slaBreaches: tickets.filter((t) => t.slaBreached).length,
      escalatedTickets: tickets.filter((t) => t.escalated).length,
      ticketsByCategory: tickets.reduce(
        (acc, ticket) => {
          acc[ticket.category] = (acc[ticket.category] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      ticketsByPriority: tickets.reduce(
        (acc, ticket) => {
          acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    setStats(newStats)
  }

  const createTicket = async (
    ticket: Omit<Ticket, "id" | "ticketNumber" | "createdAt" | "updatedAt" | "comments" | "slaBreached" | "escalated">,
  ) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newTicket: Ticket = {
        ...ticket,
        id: Date.now().toString(),
        ticketNumber: `HD-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, "0")}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        slaBreached: false,
        escalated: false,
      }

      setTickets((prev) => [...prev, newTicket])
      return { success: true, data: newTicket }
    } catch (error) {
      return { success: false, error: "Failed to create ticket" }
    } finally {
      setLoading(false)
    }
  }

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === id
            ? {
                ...ticket,
                ...updates,
                updatedAt: new Date().toISOString(),
                resolvedAt: updates.status === "resolved" ? new Date().toISOString() : ticket.resolvedAt,
                closedAt: updates.status === "closed" ? new Date().toISOString() : ticket.closedAt,
              }
            : ticket,
        ),
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to update ticket" }
    } finally {
      setLoading(false)
    }
  }

  const addComment = async (ticketId: string, comment: Omit<TicketComment, "id" | "createdAt">) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const newComment: TicketComment = {
        ...comment,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                comments: [...ticket.comments, newComment],
                updatedAt: new Date().toISOString(),
              }
            : ticket,
        ),
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to add comment" }
    } finally {
      setLoading(false)
    }
  }

  const searchKnowledgeBase = (query: string) => {
    return knowledgeBase.filter(
      (article) =>
        article.published &&
        (article.title.toLowerCase().includes(query.toLowerCase()) ||
          article.content.toLowerCase().includes(query.toLowerCase()) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))),
    )
  }

  return {
    tickets,
    knowledgeBase,
    stats,
    loading,
    createTicket,
    updateTicket,
    addComment,
    searchKnowledgeBase,
  }
}

export const useHelpdesk = useHelpdeskHook
