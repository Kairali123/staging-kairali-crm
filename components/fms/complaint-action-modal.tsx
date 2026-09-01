"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Eye, UserCheck, Shield, CheckCircle2, Settings, Save } from "lucide-react"

interface ComplaintActionModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  type: "view" | "department-staff" | "department-head" | "general-manager" | "management"
  complaint: any
}

export function ComplaintActionModal({ isOpen, onClose, title, type, complaint }: ComplaintActionModalProps) {
  const [actionData, setActionData] = useState({
    status: "",
    priority: "",
    assignedTo: "",
    comments: "",
    resolution: "",
    nextAction: "",
    escalate: false,
  })

  const getModalIcon = () => {
    switch (type) {
      case "view":
        return <Eye className="h-5 w-5" />
      case "department-staff":
        return <UserCheck className="h-5 w-5" />
      case "department-head":
        return <Shield className="h-5 w-5" />
      case "general-manager":
        return <CheckCircle2 className="h-5 w-5" />
      case "management":
        return <Settings className="h-5 w-5" />
      default:
        return <Eye className="h-5 w-5" />
    }
  }

  const handleSubmit = () => {
    // Handle the action submission
    onClose()
  }

  const renderViewContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Complaint ID</p>
          <p className="text-sm font-mono">{complaint.id}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <Badge variant="outline">{complaint.status}</Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Priority</p>
          <Badge variant="outline">{complaint.priority}</Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Department</p>
          <p className="text-sm">{complaint.department}</p>
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Customer Details</p>
        <div className="bg-muted p-3 rounded-md space-y-1">
          <p className="text-sm">
            <strong>Name:</strong> {complaint.name}
          </p>
          <p className="text-sm">
            <strong>Phone:</strong> {complaint.phone}
          </p>
          <p className="text-sm">
            <strong>Email:</strong> {complaint.email}
          </p>
          <p className="text-sm">
            <strong>Room:</strong> {complaint.roomNumber}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Issue Summary</p>
        <p className="text-sm bg-muted p-3 rounded-md">{complaint.summaryOfConversation}</p>
      </div>
    </div>
  )

  const renderActionContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Update Status</Label>
          <Select value={actionData.status} onValueChange={(value) => setActionData({ ...actionData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="action_taken">Action Taken</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Update Priority</Label>
          <Select
            value={actionData.priority}
            onValueChange={(value) => setActionData({ ...actionData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === "department-staff" && (
        <div>
          <Label htmlFor="resolution">Resolution Details</Label>
          <Textarea
            id="resolution"
            placeholder="Describe the resolution or action taken..."
            value={actionData.resolution}
            onChange={(e) => setActionData({ ...actionData, resolution: e.target.value })}
            rows={3}
          />
        </div>
      )}

      {type === "department-head" && (
        <div>
          <Label htmlFor="assignedTo">Reassign To</Label>
          <Select
            value={actionData.assignedTo}
            onValueChange={(value) => setActionData({ ...actionData, assignedTo: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dr-priya">Dr. Priya Nair</SelectItem>
              <SelectItem value="dr-suresh">Dr. Suresh Menon</SelectItem>
              <SelectItem value="operations">Operations Manager</SelectItem>
              <SelectItem value="quality">Quality Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(type === "general-manager" || type === "management") && (
        <div>
          <Label htmlFor="nextAction">Next Action Required</Label>
          <Textarea
            id="nextAction"
            placeholder="Specify next actions or recommendations..."
            value={actionData.nextAction}
            onChange={(e) => setActionData({ ...actionData, nextAction: e.target.value })}
            rows={3}
          />
        </div>
      )}

      <div>
        <Label htmlFor="comments">Comments</Label>
        <Textarea
          id="comments"
          placeholder="Add your comments..."
          value={actionData.comments}
          onChange={(e) => setActionData({ ...actionData, comments: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getModalIcon()}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Complaint Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Complaint: {complaint.id}</h4>
              <div className="flex gap-2">
                <Badge variant="outline">{complaint.severity}</Badge>
                <Badge variant="outline">{complaint.status}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {complaint.name} - {complaint.summaryType}
            </p>
          </div>

          {type === "view" ? renderViewContent() : renderActionContent()}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {type !== "view" && (
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Save Action
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
