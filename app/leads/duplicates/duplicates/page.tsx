"use client"

import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Copy, Merge, Eye } from "lucide-react"
import type { Lead } from "@/types/lead"

export default function DuplicateLeadsPage() {
  const { user, isLoading, hasPermission, getAllUsers } = useAuth()
  const { leads, updateLead } = useLeads()
  const router = useRouter()
  const [duplicateGroups, setDuplicateGroups] = useState<Lead[][]>([])
  const [selectedGroup, setSelectedGroup] = useState<Lead[] | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  useEffect(() => {
    // Group duplicates by phone or email
    const duplicateMap = new Map<string, Lead[]>()

    leads.forEach((lead) => {
      if (user && !user.permissions.includes("all") && lead.company !== user.company) {
        return
      }

      const key = lead.phone + "|" + lead.email.toLowerCase()
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, [])
      }
      duplicateMap.get(key)!.push(lead)
    })

    // Filter groups with more than one lead
    const groups = Array.from(duplicateMap.values()).filter((group) => group.length > 1)
    setDuplicateGroups(groups)
  }, [leads, user])

  const markAsNotDuplicate = async (leadId: string) => {
    await updateLead(leadId, { isDuplicate: false, duplicateOf: undefined })
  }

  const mergeDuplicates = async (primaryLead: Lead, duplicateLeads: Lead[]) => {
    // Merge remarks from all leads
    const allRemarks = [
      ...(primaryLead.remarks ?? []),
      ...duplicateLeads.flatMap((lead) => (lead.remarks ?? []).map((remark) => `[From ${lead.name}]: ${remark}`)),
    ]

    // Update primary lead with merged data
    await updateLead(primaryLead.id, {
      remarks: allRemarks,
      isDuplicate: false,
      duplicateOf: undefined,
    })

    // Mark other leads as merged/inactive
    for (const duplicate of duplicateLeads) {
      await updateLead(duplicate.id, {
        status: "cold",
        remarks: [...(duplicate.remarks ?? []), `Merged with lead ${primaryLead.id} - ${primaryLead.name}`],
      })
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !hasPermission("leads.view")) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Duplicate Lead Management</h1>
          <p className="text-muted-foreground">Identify and manage duplicate leads in the system</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duplicate Groups</CardTitle>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{duplicateGroups.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duplicates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{duplicateGroups.reduce((sum, group) => sum + group.length, 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {duplicateGroups.reduce((sum, group) => sum + (group.length - 1), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Leads to merge/remove</p>
            </CardContent>
          </Card>
        </div>

        {/* Duplicate Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Duplicate Groups ({duplicateGroups.length})</CardTitle>
            <CardDescription>Groups of leads with matching phone numbers or email addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicateGroups.map((group, groupIndex) => (
                <Card key={groupIndex} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        Group {groupIndex + 1} - {group.length} leads
                      </CardTitle>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedGroup(group)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Duplicate Group Details</DialogTitle>
                              <DialogDescription>
                                {group.length} leads with matching contact information
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Lead</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.map((lead, index) => (
                                    <TableRow key={lead.id}>
                                      <TableCell>
                                        <div>
                                          <div className="font-medium flex items-center gap-2">
                                            {lead.name}
                                            {index === 0 && <Badge variant="default">Primary</Badge>}
                                          </div>
                                          <div className="text-sm text-muted-foreground">{lead.email}</div>
                                          <div className="text-sm text-muted-foreground">{lead.phone}</div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{lead.source.replace("_", " ")}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{lead.status.replace("_", " ")}</Badge>
                                      </TableCell>
                                      <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                                      <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => markAsNotDuplicate(lead.id)}>
                                          Not Duplicate
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>

                              {hasPermission("leads.edit") && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      const [primary, ...duplicates] = group
                                      mergeDuplicates(primary, duplicates)
                                    }}
                                  >
                                    <Merge className="h-4 w-4 mr-2" />
                                    Merge All to Primary
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {group.slice(0, 3).map((lead, index) => (
                        <div key={lead.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="font-medium">{lead.name}</div>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>{lead.email}</div>
                            <div>{lead.phone}</div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {lead.company}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {lead.source}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {group.length > 3 && (
                        <div className="p-3 border rounded-lg flex items-center justify-center text-muted-foreground">
                          +{group.length - 3} more leads
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {duplicateGroups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Copy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
                <p>All leads appear to be unique based on phone and email matching.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
