"use client"

import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"
import { useCalls } from "@/hooks/use-calls"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackButton } from "@/components/back-button"
import { Phone, PhoneCall, Clock, TrendingUp, Calendar, Play, Pause, Square, Search, Target, Award } from "lucide-react"
import type { Lead } from "@/types/lead"
import type { CallDisposition } from "@/types/call"

export default function CallsPage() {
  const { user, isLoading, hasPermission } = useAuth()
  const { leads, searchLeads } = useLeads()
  const {
    currentSession,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    startCall,
    endCall,
    getCallHistory,
    getTodayPerformance,
  } = useCalls()
  const router = useRouter()

  const [activeCall, setActiveCall] = useState<{ lead: Lead; callId: string } | null>(null)
  const [callDisposition, setCallDisposition] = useState<CallDisposition>("connected")
  const [callRemarks, setCallRemarks] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [meetingDate, setMeetingDate] = useState("")
  const [convertedAmount, setConvertedAmount] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [selectedTab, setSelectedTab] = useState("dialer")

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("calls.make"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  const todayPerformance = user ? getTodayPerformance(user.id) : null
  const callHistory = getCallHistory()

  // Filter leads for calling
  const getLeadsForCalling = () => {
    let filtered = leads.filter((lead) => {
      // Only show leads assigned to current user or unassigned (if manager)
      if (user?.role === "sales_agent") {
        return lead.assignedTo === user.id
      }
      return true
    })

    if (searchTerm) {
      filtered = searchLeads(searchTerm)
    }

    if (filterStatus !== "all") {
      if (filterStatus === "today_followup") {
        const today = new Date().toISOString().split("T")[0]
        filtered = filtered.filter((lead) => lead.nextFollowUpAt && lead.nextFollowUpAt.startsWith(today))
      } else if (filterStatus === "pending_followup") {
        filtered = filtered.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date())
      } else if (filterStatus === "tomorrow_followup") {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split("T")[0]
        filtered = filtered.filter((lead) => lead.nextFollowUpAt && lead.nextFollowUpAt.startsWith(tomorrowStr))
      } else {
        filtered = filtered.filter((lead) => lead.status === filterStatus)
      }
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter((lead) => lead.priority === filterPriority)
    }

    return filtered
  }

  const handleStartCall = async (lead: Lead) => {
    try {
      const callId = await startCall(lead, lead.status === "new" ? "new_call" : "follow_up")
      setActiveCall({ lead, callId })
    } catch (error) {
      console.error("Failed to start call:", error)
    }
  }

  const handleEndCall = async () => {
    if (!activeCall) return

    try {
      await endCall(
        activeCall.callId,
        callDisposition,
        callRemarks,
        followUpDate || undefined,
        meetingDate || undefined,
        convertedAmount ? Number.parseFloat(convertedAmount) : undefined,
      )

      // Reset form
      setActiveCall(null)
      setCallRemarks("")
      setFollowUpDate("")
      setMeetingDate("")
      setConvertedAmount("")
      setCallDisposition("connected")
    } catch (error) {
      console.error("Failed to end call:", error)
    }
  }

  const handleSessionControl = async (action: "start" | "end" | "pause" | "resume") => {
    try {
      switch (action) {
        case "start":
          await startSession()
          break
        case "end":
          await endSession()
          break
        case "pause":
          await pauseSession()
          break
        case "resume":
          await resumeSession()
          break
      }
    } catch (error) {
      console.error("Session control failed:", error)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !hasPermission("calls.make")) {
    return null
  }

  const leadsForCalling = getLeadsForCalling()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sales Calling Panel</h1>
            <p className="text-muted-foreground">Make calls and track performance</p>
          </div>

          {/* Session Controls */}
          <div className="flex gap-2">
            {!currentSession ? (
              <Button onClick={() => handleSessionControl("start")} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            ) : (
              <>
                {currentSession.isActive ? (
                  <Button onClick={() => handleSessionControl("pause")} variant="outline">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={() => handleSessionControl("resume")} className="bg-blue-600 hover:bg-blue-700">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button onClick={() => handleSessionControl("end")} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentSession ? (currentSession.isActive ? "Live" : "Paused") : "Offline"}
              </div>
              {currentSession && (
                <p className="text-xs text-muted-foreground">
                  Started: {new Date(currentSession.startTime).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayPerformance?.totalCalls || 0}</div>
              <p className="text-xs text-muted-foreground">{todayPerformance?.connectedCalls || 0} connected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayPerformance?.conversions || 0}</div>
              <p className="text-xs text-muted-foreground">₹{todayPerformance?.conversionAmount || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Talk Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.floor((todayPerformance?.talkTime || 0) / 60)}m</div>
              <p className="text-xs text-muted-foreground">{(todayPerformance?.talkTime || 0) % 60}s</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayPerformance?.score || 0}</div>
              <p className="text-xs text-muted-foreground">Rank #{todayPerformance?.rank || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.targets?.daily
                  ? `${Math.round(((todayPerformance?.totalCalls || 0) / user.targets.daily) * 100)}%`
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {todayPerformance?.totalCalls || 0}/{user.targets?.daily || 0} calls
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="dialer">Dialer</TabsTrigger>
            <TabsTrigger value="history">Call History</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="dialer" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="today_followup">Today Follow-up</SelectItem>
                        <SelectItem value="pending_followup">Pending Follow-up</SelectItem>
                        <SelectItem value="tomorrow_followup">Tomorrow Follow-up</SelectItem>
                        <SelectItem value="follow_up">All Follow-ups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Results</Label>
                    <div className="text-2xl font-bold">{leadsForCalling.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads to Call */}
            <Card>
              <CardHeader>
                <CardTitle>Leads to Call ({leadsForCalling.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Details</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Contact</TableHead>
                      <TableHead>Next Follow-up</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsForCalling.slice(0, 10).map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-sm text-muted-foreground">{lead.phone}</div>
                            <div className="text-sm text-muted-foreground">{lead.email}</div>
                            <Badge variant="outline" className="text-xs">
                              {lead.company}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              lead.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : lead.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            }
                          >
                            {lead.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          {lead.lastContactedAt ? (
                            <div className="text-sm">{new Date(lead.lastContactedAt).toLocaleDateString()}</div>
                          ) : (
                            <Badge variant="secondary">Never</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.nextFollowUpAt ? (
                            <div className="text-sm">{new Date(lead.nextFollowUpAt).toLocaleDateString()}</div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleStartCall(lead)}
                            disabled={!!activeCall || !currentSession?.isActive}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Disposition</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callHistory.slice(0, 20).map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <div className="text-sm">{new Date(call.startTime).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(call.startTime).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">Lead #{call.leadId}</div>
                        </TableCell>
                        <TableCell>{call.phoneNumber}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{call.callType.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              call.disposition === "converted"
                                ? "default"
                                : call.disposition === "connected"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {call.disposition.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{call.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Follow-up Calendar</CardTitle>
                <CardDescription>Scheduled follow-ups and meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Calendar View</h3>
                  <p>Calendar integration will be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Active Call Dialog */}
        {activeCall && (
          <Dialog open={!!activeCall} onOpenChange={() => {}}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Active Call - {activeCall.lead.name}</DialogTitle>
                <DialogDescription>
                  {activeCall.lead.phone} • {activeCall.lead.company}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-lg font-medium">Call in Progress</div>
                  <div className="text-sm text-muted-foreground">Started at {new Date().toLocaleTimeString()}</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="disposition">Call Disposition</Label>
                    <Select
                      value={callDisposition}
                      onValueChange={(value: CallDisposition) => setCallDisposition(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="connected">Connected</SelectItem>
                        <SelectItem value="not_connected">Not Connected</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="no_answer">No Answer</SelectItem>
                        <SelectItem value="wrong_number">Wrong Number</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                        <SelectItem value="callback_requested">Callback Requested</SelectItem>
                        <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      placeholder="Add call remarks..."
                      value={callRemarks}
                      onChange={(e) => setCallRemarks(e.target.value)}
                    />
                  </div>

                  {(callDisposition === "callback_requested" || callDisposition === "interested") && (
                    <div className="space-y-2">
                      <Label htmlFor="followUp">Follow-up Date</Label>
                      <Input
                        id="followUp"
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                      />
                    </div>
                  )}

                  {callDisposition === "meeting_scheduled" && (
                    <div className="space-y-2">
                      <Label htmlFor="meeting">Meeting Date</Label>
                      <Input
                        id="meeting"
                        type="datetime-local"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                      />
                    </div>
                  )}

                  {callDisposition === "converted" && (
                    <div className="space-y-2">
                      <Label htmlFor="amount">Converted Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={convertedAmount}
                        onChange={(e) => setConvertedAmount(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700">
                    <Square className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}
