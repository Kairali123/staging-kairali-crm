// Lead status/priority badge class helpers shared by the Leads module.
// Moved verbatim from app/leads/page.tsx — behavior must stay identical.

import type { LeadStatus } from "@/types/lead"

export const getStatusColor = (status: LeadStatus) => {
  const colors = {
    new: "bg-blue-100 text-blue-800",
    assigned: "bg-yellow-100 text-yellow-800",
    contacted: "bg-green-100 text-green-800",
    follow_up: "bg-orange-100 text-orange-800",
    converted: "bg-emerald-100 text-emerald-800",
    cold: "bg-gray-100 text-gray-800",
    not_connected: "bg-red-100 text-red-800",
    delayed: "bg-purple-100 text-purple-800",
    untouched: "bg-slate-100 text-slate-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export const getPriorityColor = (priority: string) => {
  const colors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  }
  return priority in colors
    ? colors[priority as keyof typeof colors]
    : "bg-gray-100 text-gray-800"
}
