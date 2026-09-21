"use client"

import { useState, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Upload,
  Download,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  PhoneCall,
  User,
  TrendingUp,
  AlertCircle,
  FileText,
  RefreshCcw,
} from "lucide-react"

interface FollowUp {
  callDate: string
  agentName: string
  disposition: string
  callNotes: string
  callCount?: number
}

interface LeadJourney {
  leadId: string
  clientName: string
  mobile: string
  altMobile: string
  email: string
  bufferArrival: string
  leadSource: string
  category: string
  company: string
  assignedTo: string
  kserveStatus: string
  kserveRoute: string
  kserveAgentName: string
  kserveDisposition: string
  qualificationStatus: string
  stagingDate: string
  finalStatus: string
  conversionAmount?: number
  lastFollowupDate: string
  totalFollowups: number
  followups: FollowUp[]
  // Stuck alert
  stuckAlert?: {
    isStuck: boolean
    stuckStage: string
    reason: string
    severity: "high" | "medium" | "low"
  }
}

function formatDate(iso: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    })
  } catch {
    return iso
  }
}

function getFinalStatusColor(status: string) {
  const s = status?.toLowerCase() || ""
  if (s.includes("convert")) return "bg-green-100 text-green-700 border-green-200"
  if (s.includes("cold") || s.includes("lost")) return "bg-red-100 text-red-700 border-red-200"
  if (s.includes("follow") || s.includes("future")) return "bg-blue-100 text-blue-700 border-blue-200"
  if (s.includes("not connect") || s.includes("no answer")) return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-gray-100 text-gray-700 border-gray-200"
}

function getKserveStatusBadge(kserveStatus: string, kserveRoute: string) {
  if (!kserveStatus && !kserveRoute) {
    return <Badge variant="outline" className="text-xs text-gray-500">Direct Route</Badge>
  }
  const s = (kserveStatus || "").toLowerCase()
  // Negatives first: "Non-Qualified" / "Not Qualified" also contain "qualified".
  if (/\b(non|not)\b|un-?qualified|rejected/.test(s)) {
    return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">KServe ✗ Not Qualified</Badge>
  }
  if (s.includes("qualified") || s.includes("verified")) {
    return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">KServe ✓ Qualified</Badge>
  }
  return <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">KServe: {kserveStatus || kserveRoute}</Badge>
}

function TimelineModal({ lead, onClose }: { lead: LeadJourney; onClose: () => void }) {
  const steps = [
    {
      label: "Buffer Arrival",
      icon: <FileText className="h-4 w-4" />,
      date: lead.bufferArrival,
      detail: `Source: ${lead.leadSource || "—"} | Category: ${lead.category || "—"}`,
      color: "bg-blue-500",
      done: !!lead.bufferArrival,
    },
    {
      label: "KServe Routing",
      icon: <ArrowRight className="h-4 w-4" />,
      date: lead.stagingDate,
      detail: lead.kserveAgentName
        ? `Agent: ${lead.kserveAgentName} | ${lead.kserveDisposition || lead.qualificationStatus || "—"}`
        : lead.kserveRoute
          ? `Route: ${lead.kserveRoute}`
          : "Direct Route (bypassed KServe)",
      color: lead.kserveAgentName ? "bg-purple-500" : "bg-gray-400",
      done: !!(lead.stagingDate || lead.kserveRoute),
    },
    {
      label: "Sales Assignment",
      icon: <User className="h-4 w-4" />,
      date: "",
      detail: lead.assignedTo ? `Assigned to: ${lead.assignedTo}` : "Not assigned",
      color: lead.assignedTo ? "bg-indigo-500" : "bg-gray-400",
      done: !!lead.assignedTo,
    },
    {
      label: "Follow-up Activity",
      icon: <PhoneCall className="h-4 w-4" />,
      date: lead.lastFollowupDate,
      detail: `${lead.totalFollowups} follow-up(s) recorded`,
      color: lead.totalFollowups > 0 ? "bg-amber-500" : "bg-gray-400",
      done: lead.totalFollowups > 0,
    },
    {
      label: "Final Outcome",
      icon: <TrendingUp className="h-4 w-4" />,
      date: "",
      detail: lead.finalStatus
        ? `${lead.finalStatus}${lead.conversionAmount ? ` — ₹${lead.conversionAmount.toLocaleString("en-IN")}` : ""}`
        : "Outcome not set",
      color: lead.finalStatus?.toLowerCase().includes("convert") ? "bg-green-500" : "bg-gray-400",
      done: !!lead.finalStatus,
    },
  ]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">
            Lead Journey — {lead.clientName || lead.leadId}
          </DialogTitle>
          <p className="text-xs text-slate-500">{lead.leadId} · {lead.mobile}</p>
        </DialogHeader>

        {/* Stuck Alert */}
        {lead.stuckAlert?.isStuck && (
          <div className={`px-4 py-3 rounded-lg flex gap-3 items-start mb-2 ${
            lead.stuckAlert.severity === "high"
              ? "bg-red-50 border border-red-200"
              : "bg-amber-50 border border-amber-200"
          }`}>
            <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${lead.stuckAlert.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
            <div>
              <p className={`text-xs font-bold ${lead.stuckAlert.severity === "high" ? "text-red-700" : "text-amber-700"}`}>
                Stuck at: {lead.stuckAlert.stuckStage}
              </p>
              <p className="text-xs text-slate-600">{lead.stuckAlert.reason}</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-0 mt-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step.done ? step.color : "bg-gray-200"}`}>
                  {step.done ? step.icon : <Clock className="h-4 w-4 text-gray-400" />}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-0.5 h-8 ${step.done ? "bg-gray-300" : "bg-gray-100"}`} />
                )}
              </div>
              <div className="pb-6">
                <p className={`text-sm font-semibold ${step.done ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                <p className="text-xs text-slate-500">{step.detail}</p>
                {step.date && <p className="text-xs text-slate-400 mt-0.5">{formatDate(step.date)}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Follow-up History */}
        {lead.followups.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Follow-up Call Log</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lead.followups.map((fu, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">{fu.agentName || "Unknown Agent"}</span>
                    <span className="text-xs text-slate-400">{formatDate(fu.callDate)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-xs">{fu.disposition || "—"}</Badge>
                    {fu.callCount && <span className="text-xs text-slate-400">Call #{fu.callCount}</span>}
                  </div>
                  {fu.callNotes && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{fu.callNotes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function LeadSearchPage() {
  const { user, isLoading, hasPermission } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<LeadJourney[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [selectedLead, setSelectedLead] = useState<LeadJourney | null>(null)
  const [bulkText, setBulkText] = useState("")
  const [isBulkMode, setIsBulkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchError("")
    setResults([])
    try {
      const res = await fetch(`/api/lead-journey?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Search failed")
      setResults(data.results || [])
    } catch (err: any) {
      setSearchError(err.message || "Failed to search")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleBulkSearch() {
    const ids = bulkText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return
    setIsSearching(true)
    setSearchError("")
    setResults([])
    try {
      const res = await fetch(`/api/lead-journey?ids=${encodeURIComponent(ids.join(","))}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Bulk search failed")
      setResults(data.results || [])
    } catch (err: any) {
      setSearchError(err.message || "Failed to bulk search")
    } finally {
      setIsSearching(false)
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string || ""
      // Extract first column values
      const ids = text.split("\n")
        .slice(1) // skip header
        .map(row => row.split(",")[0].trim().replace(/"/g, ""))
        .filter(Boolean)
      setBulkText(ids.join("\n"))
    }
    reader.readAsText(file)
  }

  function exportCSV() {
    if (results.length === 0) return
    const headers = ["Lead ID", "Client Name", "Mobile", "Email", "Buffer Arrival", "Source", "Company", "Assigned To", "KServe Status", "Total Followups", "Last Followup", "Final Status", "Conversion Amount"]
    const rows = results.map(r => [
      r.leadId, r.clientName, r.mobile, r.email,
      r.bufferArrival, r.leadSource, r.company, r.assignedTo,
      r.kserveStatus || "Direct Route", r.totalFollowups, r.lastFollowupDate,
      r.finalStatus, r.conversionAmount ?? ""
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `lead-search-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCcw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lead Search Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Track full lead lifecycle — from buffer arrival to final outcome</p>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-2">
          <Button
            variant={!isBulkMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsBulkMode(false)}
          >
            <Search className="h-4 w-4 mr-2" /> Single Search
          </Button>
          <Button
            variant={isBulkMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsBulkMode(true)}
          >
            <Upload className="h-4 w-4 mr-2" /> Bulk / CSV Upload
          </Button>
        </div>

        {/* Search Panel */}
        {!isBulkMode ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Single Record Search</CardTitle>
              <CardDescription>Enter Lead ID, Mobile Number, Email, or Client Name</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-3">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="e.g. 9876543210 or FB_AHV-108645... or name"
                  className="flex-1"
                  disabled={isSearching}
                />
                <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Search</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bulk ID Search</CardTitle>
              <CardDescription>Paste Lead IDs (one per line or comma-separated), or upload a CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full h-32 border border-slate-200 rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={"FB_AHV-1086456400903661\n5bc2452b-88e2-...\n9876543210"}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                <Button
                  size="sm"
                  onClick={handleBulkSearch}
                  disabled={isSearching || !bulkText.trim()}
                >
                  {isSearching ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search {bulkText.split(/[\n,]+/).filter(Boolean).length > 0 && `(${bulkText.split(/[\n,]+/).filter(Boolean).length} IDs)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{results.length} Lead{results.length !== 1 ? "s" : ""} Found</CardTitle>
                  <CardDescription>Click "View Journey" to see full lifecycle timeline</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs font-bold">Lead ID</TableHead>
                      <TableHead className="text-xs font-bold">Client</TableHead>
                      <TableHead className="text-xs font-bold">Mobile</TableHead>
                      <TableHead className="text-xs font-bold">Buffer Arrival</TableHead>
                      <TableHead className="text-xs font-bold">KServe Status</TableHead>
                      <TableHead className="text-xs font-bold">Assigned To</TableHead>
                      <TableHead className="text-xs font-bold">Follow-ups</TableHead>
                      <TableHead className="text-xs font-bold">Final Status</TableHead>
                      <TableHead className="text-xs font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((lead, i) => (
                      <TableRow key={i} className="hover:bg-slate-50 text-sm">
                        <TableCell className="font-mono text-xs max-w-[140px] truncate" title={lead.leadId}>
                          {lead.leadId || "—"}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-800 truncate max-w-[120px]">{lead.clientName || "—"}</p>
                          <p className="text-xs text-slate-400">{lead.company || ""}</p>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{lead.mobile || "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(lead.bufferArrival)}</TableCell>
                        <TableCell>{getKserveStatusBadge(lead.kserveStatus, lead.kserveRoute)}</TableCell>
                        <TableCell className="text-xs text-slate-700">{lead.assignedTo || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <PhoneCall className="h-3 w-3 text-slate-400" />
                            <span className="text-xs font-semibold">{lead.totalFollowups}</span>
                          </div>
                          {lead.lastFollowupDate && (
                            <p className="text-xs text-slate-400">{formatDate(lead.lastFollowupDate)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.finalStatus ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getFinalStatusColor(lead.finalStatus)}`}>
                              {lead.finalStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {lead.conversionAmount && (
                            <p className="text-xs text-green-600 font-semibold mt-0.5">
                              ₹{lead.conversionAmount.toLocaleString("en-IN")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => setSelectedLead(lead)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View Journey
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isSearching && results.length === 0 && !searchError && (
          <div className="text-center py-16 text-slate-400">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">Search for a lead to see its full journey</p>
            <p className="text-xs mt-1">Supports Lead ID, Mobile, Email, or Client Name</p>
          </div>
        )}

        {/* Journey Modal */}
        {selectedLead && (
          <TimelineModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
        )}
      </div>
    </DashboardLayout>
  )
}
