import { RefreshCw } from "lucide-react"

export default function PendingAgingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <RefreshCw className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="font-medium">Loading Pending Aging Tracker…</p>
      </div>
    </div>
  )
}
