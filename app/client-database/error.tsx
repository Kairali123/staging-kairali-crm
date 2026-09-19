'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'

export default function ClientDatabaseError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ClientDatabase ErrorBoundary]', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 shadow-sm text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Client Database Error</h2>
          <p className="mt-1 text-xs text-slate-500">
            Unable to load or display the client database records.
          </p>

          {error?.message && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-left text-xs font-mono text-red-800 break-words">
              {error.message}
            </div>
          )}

          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
