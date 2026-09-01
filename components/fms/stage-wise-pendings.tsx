
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardList, Loader2 } from "lucide-react"
import { useBookings } from "@/hooks/use-fms-bookings"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"

interface StageData {
  employeeName: string
  newBookings: number
  accountVerify: number
  finalTransfer: number
  deleteComplete: number
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <Card className="bg-white border-slate-200 shadow-lg p-0 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <ClipboardList className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Stage Wise Pendings Report
            </h3>
            <p className="text-xs text-slate-600 leading-tight">
              Employee-wise booking status tracking
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-indigo-400 opacity-20"></div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Loading Stage Data
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
              <span>Fetching pending bookings across all stages...</span>
            </div>
          </div>

          <div className="w-full max-w-md space-y-2 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-slate-200 rounded animate-pulse" 
                   style={{ width: `${100 - i * 15}%` }} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StageWisePendingsReport({ pendingCount, loading }: { pendingCount: any[]; loading: boolean }) {
  // 🔥 ALL HOOKS AT THE TOP
  const [isDataReady, setIsDataReady] = useState(false)
  const { user, hasActionPermission } = useAuth()
  
  // 🔥 FIXED: Proper loading detection
  useEffect(() => {
    // Check if we're NOT loading AND we have data
    if (!loading && pendingCount !== undefined && pendingCount !== null) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsDataReady(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      // If loading again (refresh), reset ready state
      setIsDataReady(false)
    }
  }, [pendingCount, loading])
  
  // Filter data based on user role
  const filteredData = useMemo(() => {
    if (!pendingCount || !Array.isArray(pendingCount)) return []
    
    let data: StageData[] = pendingCount
    
    if (user?.role !== "admin" && user?.role !== "super_admin") {
      data = data.filter(item => item.employeeName === user?.name)
    }
    
    return data
  }, [pendingCount, user?.role, user?.name])
  
  // Calculate totals
  const totals = useMemo(() => 
    filteredData.reduce(
      (acc, curr) => ({
        newBookings: acc.newBookings + curr.newBookings,
        accountVerify: acc.accountVerify + curr.accountVerify,
        finalTransfer: acc.finalTransfer + curr.finalTransfer,
        deleteComplete: acc.deleteComplete + curr.deleteComplete,
      }),
      { newBookings: 0, accountVerify: 0, finalTransfer: 0, deleteComplete: 0 },
    ),
    [filteredData]
  )
  
  // 🔥 Show loading if still loading OR data not ready
  if (loading || !isDataReady) {
    return <LoadingSkeleton />
  }

  const getCellColor = (value: number, columnName: string) => {
    if (value === 0) {
      if (columnName === "accountVerify" || columnName === "finalTransfer" || columnName === "deleteComplete") {
        return "text-red-600 font-semibold"
      }
      return "text-slate-600"
    }
    if (value > 100) return "text-red-600 font-bold"
    if (value > 20) return "text-amber-600 font-semibold"
    return "text-slate-900 font-medium"
  }

  return (
    <Card className="bg-white border-slate-200 shadow-lg p-0 overflow-hidden">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <ClipboardList className="h-4 w-4 text-indigo-600" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Stage Wise Pendings Report
            </h3>
            <p className="text-xs text-slate-600 leading-tight">
              Employee-wise booking status tracking
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 border-b-2 border-orange-200">
                <TableHead className="font-bold text-slate-800 text-center border-r border-orange-200 py-2 text-sm">
                  Employee Name
                </TableHead>
                <TableHead className="font-bold text-slate-800 text-center border-r border-orange-200 py-2 text-sm">
                  <div className="space-y-0.5">
                    <div>NewBookings</div>
                    <div className="text-xs font-normal text-slate-600">(Pendings)</div>
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-800 text-center border-r border-orange-200 py-2 text-sm">
                  <div className="space-y-0.5">
                    <div>AccountVerify</div>
                    <div className="text-xs font-normal text-slate-600">(Pendings)</div>
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-800 text-center border-r border-orange-200 py-2 text-sm">
                  <div className="space-y-0.5">
                    <div>FinalTransfer</div>
                    <div className="text-xs font-normal text-slate-600">(Pendings)</div>
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-800 text-center py-2 text-sm">
                  <div className="space-y-0.5">
                    <div>Delete Complete</div>
                    <div className="text-xs font-normal text-slate-600">(Pendings)</div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => (
                <TableRow
                  key={`${row.employeeName}-${index}`}
                  className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-blue-50/30"}`}
                >
                  <TableCell className="font-semibold text-slate-900 border-r border-slate-200 py-2 text-sm">
                    {row.employeeName}
                  </TableCell>
                  <TableCell
                    className={`text-center border-r border-slate-200 py-2 text-sm ${getCellColor(row.newBookings, "newBookings")}`}
                  >
                    {row.newBookings}
                  </TableCell>
                  <TableCell
                    className={`text-center border-r border-slate-200 py-2 text-sm ${getCellColor(row.accountVerify, "accountVerify")}`}
                  >
                    {row.accountVerify}
                  </TableCell>
                  <TableCell
                    className={`text-center border-r border-slate-200 py-2 text-sm ${getCellColor(row.finalTransfer, "finalTransfer")}`}
                  >
                    {row.finalTransfer}
                  </TableCell>
                  <TableCell
                    className={`text-center py-2 text-sm ${getCellColor(row.deleteComplete, "deleteComplete")}`}
                  >
                    {row.deleteComplete}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 border-t-2 border-slate-900">
                <TableCell className="font-bold text-white text-base border-r border-slate-600 py-2">
                  Grand Total
                </TableCell>
                <TableCell className="font-bold text-white text-center text-base border-r border-slate-600 py-2">
                  {totals.newBookings}
                </TableCell>
                <TableCell className="font-bold text-white text-center text-base border-r border-slate-600 py-2">
                  {totals.accountVerify}
                </TableCell>
                <TableCell className="font-bold text-white text-center text-base border-r border-slate-600 py-2">
                  {totals.finalTransfer}
                </TableCell>
                <TableCell className="font-bold text-white text-center text-base py-2">
                  {totals.deleteComplete}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-50 border-t border-slate-200">
          <div className="bg-white rounded-lg p-2 border border-blue-200 shadow-sm">
            <div className="text-xs font-medium text-slate-600 mb-0.5">New Bookings</div>
            <div className="text-xl font-bold text-blue-600">{totals.newBookings}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-emerald-200 shadow-sm">
            <div className="text-xs font-medium text-slate-600 mb-0.5">Account Verify</div>
            <div className="text-xl font-bold text-emerald-600">{totals.accountVerify}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-amber-200 shadow-sm">
            <div className="text-xs font-medium text-slate-600 mb-0.5">Final Transfer</div>
            <div className="text-xl font-bold text-amber-600">{totals.finalTransfer}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-purple-200 shadow-sm">
            <div className="text-xs font-medium text-slate-600 mb-0.5">Delete Complete</div>
            <div className="text-xl font-bold text-purple-600">{totals.deleteComplete}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
