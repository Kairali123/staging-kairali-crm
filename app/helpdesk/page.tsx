"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useHelpdesk } from "@/hooks/use-helpdesk"
import { BackButton } from "@/components/back-button"
import { Ticket, AlertTriangle, Clock, TrendingUp, Search, Plus, BookOpen, Users, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function HelpdeskPage() {
  const { stats, tickets, searchKnowledgeBase } = useHelpdesk()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = searchKnowledgeBase(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  const recentTickets = tickets.slice(0, 5)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <BackButton />
      </div>

      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Help Desk Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/helpdesk/tickets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">{stats.resolvedToday} resolved today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">{stats.inProgressTickets} in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.slaBreaches}</div>
            <p className="text-xs text-muted-foreground">{stats.escalatedTickets} escalated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResolutionTime}d</div>
            <p className="text-xs text-muted-foreground">Average time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Knowledge Base Search
            </CardTitle>
            <CardDescription>Find solutions to common problems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for solutions..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((article) => (
                  <div key={article.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <h4 className="font-medium text-sm">{article.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {article.category} • {article.views} views
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/helpdesk/knowledge">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse All
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ticket Categories
            </CardTitle>
            <CardDescription>Distribution of support requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.ticketsByCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(count / stats.totalTickets) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Recent Tickets
            </CardTitle>
            <CardDescription>Latest support requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{ticket.ticketNumber}</span>
                      <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">{ticket.category}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={ticket.status === "open" ? "destructive" : "default"}>{ticket.status}</Badge>
                    <p className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/helpdesk/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common support tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/helpdesk/tickets/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Ticket
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/helpdesk/tickets?status=open">
                <AlertTriangle className="mr-2 h-4 w-4" />
                View Open Tickets
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/helpdesk/tickets?priority=urgent">
                <Clock className="mr-2 h-4 w-4" />
                Urgent Tickets
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/helpdesk/knowledge">
                <BookOpen className="mr-2 h-4 w-4" />
                Knowledge Base
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/helpdesk/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
