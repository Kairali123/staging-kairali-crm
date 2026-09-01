"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Phone, AlertTriangle } from "lucide-react"
import type { Lead } from "@/types/lead"
import type { User } from "@/hooks/use-auth"
import { getPriorityColor, getStatusColor } from "@/lib/lead-badge"

export interface LeadsTableCardProps {
  leads: Lead[]
  canMakeCalls: boolean
  onSelectLead: (lead: Lead) => void
  getAllUsers: () => User[]
}

export function LeadsTableCard({ leads, canMakeCalls, onSelectLead, getAllUsers }: LeadsTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads ({leads.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead Details</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className={lead.tatBreached ? "bg-red-50" : ""}>
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {lead.name}
                      {lead.isDuplicate && (
                        <Badge variant="destructive" className="text-xs">
                          Duplicate
                        </Badge>
                      )}
                      {lead.tatBreached && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground">{lead.email}</div>
                    <div className="text-sm text-muted-foreground">{lead.phone}</div>
                    <Badge variant="outline" className="text-xs">
                      {lead.company}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {lead.source.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(lead.priority)}>{lead.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(lead.status)}>{lead.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  {lead.assignedTo ? (
                    <div className="text-sm">
                      {getAllUsers().find((u) => u.id === lead.assignedTo)?.name || "Unknown"}
                    </div>
                  ) : (
                    <Badge variant="outline">Unassigned</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onSelectLead(lead)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canMakeCalls && (
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
