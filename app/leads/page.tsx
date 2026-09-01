"use client"

import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { LeadsPageHeader } from "@/components/leads-page-header"
import { LeadStatsCards } from "@/components/lead-stats-cards"
import { LeadFiltersCard } from "@/components/lead-filters-card"
import { LeadsTableCard } from "@/components/leads-table-card"
import { LeadDetailsDialog } from "@/components/lead-details-dialog"
import type { Lead } from "@/types/lead"

export default function LeadsPage() {
  const { user, isLoading, hasPermission, getAllUsers } = useAuth()
  const { leads, stats, createLead, updateLead, assignLead, addRemark, scheduleFollowUp, searchLeads } = useLeads()
  const router = useRouter()
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [remarkText, setRemarkText] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  useEffect(() => {
    let filtered = leads

    // Filter by company if not admin
    if (user && !user.permissions.includes("all")) {
      filtered = filtered.filter((lead) => lead.company === user.company)
    }

    // Filter by assigned agent if sales agent
    if (user?.role === "sales_agent") {
      filtered = filtered.filter((lead) => lead.assignedTo === user.id)
    }

    // Apply search
    if (searchTerm) {
      filtered = searchLeads(searchTerm)
    }

    // Apply filters
    if (filterStatus !== "all") {
      filtered = filtered.filter((lead) => lead.status === filterStatus)
    }
    if (filterSource !== "all") {
      filtered = filtered.filter((lead) => lead.source === filterSource)
    }
    if (filterPriority !== "all") {
      filtered = filtered.filter((lead) => lead.priority === filterPriority)
    }

    setFilteredLeads(filtered)
  }, [leads, searchTerm, filterStatus, filterSource, filterPriority, user, searchLeads])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !hasPermission("leads.view")) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <LeadsPageHeader
          canCreateLeads={hasPermission("leads.create")}
          isCreateDialogOpen={isCreateDialogOpen}
          setIsCreateDialogOpen={setIsCreateDialogOpen}
          createLead={createLead}
        />

        {/* Stats Cards */}
        <LeadStatsCards stats={stats} />

        {/* Filters */}
        <LeadFiltersCard
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterSource={filterSource}
          setFilterSource={setFilterSource}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
          resultCount={filteredLeads.length}
        />

        {/* Leads Table */}
        <LeadsTableCard
          leads={filteredLeads}
          canMakeCalls={hasPermission("calls.make")}
          onSelectLead={setSelectedLead}
          getAllUsers={getAllUsers}
        />

        {/* Lead Details Dialog */}
        {selectedLead && (
          <LeadDetailsDialog
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            canEditLeads={hasPermission("leads.edit")}
            remarkText={remarkText}
            setRemarkText={setRemarkText}
            followUpDate={followUpDate}
            setFollowUpDate={setFollowUpDate}
            addRemark={addRemark}
            scheduleFollowUp={scheduleFollowUp}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
