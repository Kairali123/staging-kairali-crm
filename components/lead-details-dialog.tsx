"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Calendar } from "lucide-react"
import type { Lead } from "@/types/lead"
import { getPriorityColor, getStatusColor } from "@/lib/lead-badge"

export interface LeadDetailsDialogProps {
  lead: Lead
  onClose: () => void
  canEditLeads: boolean
  remarkText: string
  setRemarkText: (value: string) => void
  followUpDate: string
  setFollowUpDate: (value: string) => void
  addRemark: (leadId: string, remark: string) => Promise<void>
  scheduleFollowUp: (leadId: string, followUpDate: string) => Promise<void>
}

export function LeadDetailsDialog({
  lead,
  onClose,
  canEditLeads,
  remarkText,
  setRemarkText,
  followUpDate,
  setFollowUpDate,
  addRemark,
  scheduleFollowUp,
}: LeadDetailsDialogProps) {
  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lead Details - {lead.name}</DialogTitle>
          <DialogDescription>
            {lead.company} • {lead.source} • Created{" "}
            {new Date(lead.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Contact Information</Label>
              <div className="space-y-1 text-sm">
                <div>Email: {lead.email}</div>
                <div>Phone: {lead.phone}</div>
                {lead.location && <div>Location: {lead.location}</div>}
              </div>
            </div>
            <div>
              <Label>Lead Status</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(lead.priority)}>
                    {lead.priority} Priority
                  </Badge>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace("_", " ")}
                  </Badge>
                </div>
                {lead.nextFollowUpAt && (
                  <div className="text-sm text-muted-foreground">
                    Next follow-up: {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {lead.requirements && (
            <div>
              <Label>Requirements</Label>
              <p className="text-sm text-muted-foreground">{lead.requirements}</p>
            </div>
          )}

          <div>
            <Label>Remarks ({(lead.remarks ?? []).length})</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {(lead.remarks ?? []).map((remark, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  {remark}
                </div>
              ))}
            </div>
          </div>

          {canEditLeads && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label htmlFor="remark">Add Remark</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="remark"
                    placeholder="Add a remark..."
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      if (remarkText.trim()) {
                        await addRemark(lead.id, remarkText)
                        setRemarkText("")
                      }
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="followUp">Schedule Follow-up</Label>
                <div className="flex gap-2">
                  <Input
                    id="followUp"
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      if (followUpDate) {
                        await scheduleFollowUp(lead.id, followUpDate)
                        setFollowUpDate("")
                      }
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
