"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Download, TrendingUp, TrendingDown, Users, Clock, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface HistoryData {
  monthlyTrends: any[]
  completionRates: any[]
  stageAnalysis: any[]
  doerPerformance: any[]
  summary: {
    totalConsultations: number
    completedConsultations: number
    averageCompletionTime: string
    slaCompliance: number
  }
}

const COLORS = ["#2f6b4f", "#b6864a", "#1f2a2e", "#dfe7e2", "#9a16ff"]

export default function DoctorConsultationHistory() {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("last-30-days")
  const [exportFormat, setExportFormat] = useState("csv")

  useEffect(() => {
    fetchHistoryData()
  }, [dateRange])

  const fetchHistoryData = async () => {
    try {
      const response = await fetch(`/api/doctor/history?range=${dateRange}`)
      const data = await response.json()
      const transformedData = {
        monthlyTrends:
          data.byMonth?.map((item: any) => ({
            month: item.month,
            consultations: item.consultations,
            completed: item.prescriptions,
          })) || [],
        completionRates:
          data.byStage?.map((item: any) => ({
            stage: item.stage,
            rate: (((item.total - item.pending - item.overdue) / item.total) * 100).toFixed(1),
          })) || [],
        stageAnalysis:
          data.byStage?.map((item: any) => ({
            name: item.stage,
            value: item.total,
          })) || [],
        doerPerformance:
          data.byDoer?.map((item: any) => ({
            name: item.doer,
            totalConsultations: item.total,
            completed: item.total - item.overdue,
            slaCompliance: Math.max(0, 100 - (item.overdue / item.total) * 100).toFixed(0),
            averageTime: `${item.avgDelayMin}min`,
          })) || [],
        summary: {
          totalConsultations: data.byMonth?.reduce((sum: number, item: any) => sum + item.consultations, 0) || 0,
          completedConsultations: data.byMonth?.reduce((sum: number, item: any) => sum + item.prescriptions, 0) || 0,
          averageCompletionTime: "2.5 days",
          slaCompliance: 85,
        },
      }
      setHistoryData(transformedData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching history data:", error)
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/doctor/history/export?format=${exportFormat}&range=${dateRange}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `doctor-consultation-history.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2f6b4f]"></div>
      </div>
    )
  }

  if (!historyData) {
    return <div>Error loading data</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/doctor-consultation">
            <Button
              variant="outline"
              size="sm"
              className="border-[#2f6b4f] text-[#2f6b4f] hover:bg-[#2f6b4f] hover:text-white bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1f2a2e]">Consultation History & Analytics</h1>
            <p className="text-gray-600">Performance insights and historical data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/doctor-consultation/calendar">
            <Button
              variant="outline"
              className="border-[#b6864a] text-[#b6864a] hover:bg-[#b6864a] hover:text-white bg-transparent"
            >
              Calendar
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-[#dfe7e2]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-48 border-[#dfe7e2]">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-32 border-[#dfe7e2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#dfe7e2]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Consultations</p>
                <p className="text-2xl font-bold text-[#1f2a2e]">{historyData.summary.totalConsultations}</p>
              </div>
              <Users className="h-8 w-8 text-[#2f6b4f]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#dfe7e2]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-[#1f2a2e]">{historyData.summary.completedConsultations}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#dfe7e2]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Completion Time</p>
                <p className="text-2xl font-bold text-[#1f2a2e]">{historyData.summary.averageCompletionTime}</p>
              </div>
              <Clock className="h-8 w-8 text-[#b6864a]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#dfe7e2]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">SLA Compliance</p>
                <p className="text-2xl font-bold text-[#1f2a2e]">{historyData.summary.slaCompliance}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card className="border-[#dfe7e2]">
          <CardHeader>
            <CardTitle className="text-[#1f2a2e]">Monthly Consultation Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                <XAxis dataKey="month" stroke="#1f2a2e" />
                <YAxis stroke="#1f2a2e" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consultations"
                  stroke="#2f6b4f"
                  strokeWidth={2}
                  name="Total Consultations"
                />
                <Line type="monotone" dataKey="completed" stroke="#b6864a" strokeWidth={2} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Rates */}
        <Card className="border-[#dfe7e2]">
          <CardHeader>
            <CardTitle className="text-[#1f2a2e]">Completion Rates by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historyData.completionRates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                <XAxis dataKey="stage" stroke="#1f2a2e" />
                <YAxis stroke="#1f2a2e" />
                <Tooltip />
                <Bar dataKey="rate" fill="#2f6b4f" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage Analysis */}
        <Card className="border-[#dfe7e2]">
          <CardHeader>
            <CardTitle className="text-[#1f2a2e]">Current Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={historyData.stageAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {historyData.stageAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Doer Performance Table */}
        <Card className="border-[#dfe7e2]">
          <CardHeader>
            <CardTitle className="text-[#1f2a2e]">Doer Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-[#dfe7e2]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doer</TableHead>
                    <TableHead>Consultations</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>SLA Compliance</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.doerPerformance.map((doer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{doer.name}</TableCell>
                      <TableCell>{doer.totalConsultations}</TableCell>
                      <TableCell>{doer.completed}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {doer.slaCompliance >= 90 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : doer.slaCompliance >= 70 ? (
                            <TrendingUp className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span
                            className={
                              doer.slaCompliance >= 90
                                ? "text-green-600"
                                : doer.slaCompliance >= 70
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }
                          >
                            {doer.slaCompliance}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{doer.averageTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
