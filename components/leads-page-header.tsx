"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BackButton } from "@/components/back-button"
import { LeadForm } from "@/components/lead-form"
import { Plus } from "lucide-react"
import type { Lead } from "@/types/lead"

export interface LeadsPageHeaderProps {
  canCreateLeads: boolean
  isCreateDialogOpen: boolean
  setIsCreateDialogOpen: (open: boolean) => void
  createLead: (leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">) => Promise<void>
}

export function LeadsPageHeader({
  canCreateLeads,
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  createLead,
}: LeadsPageHeaderProps) {
  return (
    <>
      <BackButton className="mb-4" />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Manage and track your leads</p>
        </div>
        {canCreateLeads && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
                <DialogDescription>Add a new lead to the system</DialogDescription>
              </DialogHeader>
              <LeadForm
                onSubmit={async (leadData) => {
                  await createLead(leadData)
                  setIsCreateDialogOpen(false)
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  )
}
