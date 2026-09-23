"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Star, Car, Clock, Users, ArrowUpRight } from "lucide-react"

export default function GuestTransfersReportPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Guest Transfer Feedback</h1>
        <p className="text-gray-500 mt-1">Real-time metrics and reporting from the in-vehicle iPads.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Feedbacks</CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">1,248</div>
            <p className="text-xs text-green-600 font-medium flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Overall Rating</CardTitle>
            <Star className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">4.8<span className="text-xl text-gray-400">/5</span></div>
            <p className="text-xs text-green-600 font-medium flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +0.2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">On-Time Pickups</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">96.4%</div>
            <p className="text-xs text-gray-500 mt-1">Based on "Driver arrived on time" metric</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Vehicle Comfort</CardTitle>
            <Car className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">98.1%</div>
            <p className="text-xs text-gray-500 mt-1">Rated Excellent or Good</p>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Feedbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { date: "Today, 10:45 AM", vehicle: "iPad-Car-01", driver: "Raju", rating: "Excellent", sync: "Synced to Sheets" },
                    { date: "Today, 09:15 AM", vehicle: "iPad-Car-03", driver: "Mohan", rating: "Good", sync: "Synced to Sheets" },
                    { date: "Yesterday, 04:30 PM", vehicle: "iPad-Car-02", driver: "Kannan", rating: "Needs Attention", sync: "Synced to Sheets" },
                    { date: "Yesterday, 02:10 PM", vehicle: "iPad-Car-01", driver: "Raju", rating: "Excellent", sync: "Synced to Sheets" },
                    { date: "Yesterday, 11:00 AM", vehicle: "iPad-Car-04", driver: "Suresh", rating: "Excellent", sync: "Pending (Offline)" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{row.date}</td>
                      <td className="px-4 py-3 text-gray-500">{row.vehicle}</td>
                      <td className="px-4 py-3 text-gray-500">{row.driver}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.rating === 'Excellent' ? 'bg-green-100 text-green-700' :
                          row.rating === 'Good' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {row.rating}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs flex items-center ${row.sync.includes('Pending') ? 'text-amber-600' : 'text-gray-500'}`}>
                          {row.sync.includes('Pending') && <Clock className="w-3 h-3 mr-1" />}
                          {row.sync}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-orange-50/50 border-orange-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-orange-900">AC & Water Issue</h4>
                  <span className="text-xs text-gray-500">Yesterday</span>
                </div>
                <p className="text-sm text-gray-600">"AC was not working properly in the back seat. No water bottles provided."</p>
                <div className="mt-3 text-xs text-orange-700 font-medium">Vehicle: iPad-Car-02</div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
