export interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  category: "IT" | "HR" | "Facilities" | "Finance" | "General"
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in-progress" | "pending" | "resolved" | "closed"
  assignedTo?: string
  assignedTeam?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  closedAt?: string
  dueDate?: string
  tags: string[]
  attachments?: string[]
  comments: TicketComment[]
  slaBreached: boolean
  escalated: boolean
}

export interface TicketComment {
  id: string
  ticketId: string
  userId: string
  userName: string
  userRole: string
  content: string
  isInternal: boolean
  createdAt: string
  attachments?: string[]
}

export interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  views: number
  helpful: number
  notHelpful: number
  createdBy: string
  createdAt: string
  updatedAt: string
  published: boolean
}

export interface HelpdeskStats {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedToday: number
  avgResolutionTime: number
  slaBreaches: number
  escalatedTickets: number
  ticketsByCategory: Record<string, number>
  ticketsByPriority: Record<string, number>
}
