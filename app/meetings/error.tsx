"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Temporary pre-Sentry logging.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-red-300 bg-red-50 shadow-md p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
        <p className="mt-1 text-sm text-red-700">
          This Meetings page ran into an unexpected error. Please try again.
        </p>
        <Button
          onClick={() => reset()}
          className="mt-4 bg-red-600 text-white hover:bg-red-700"
        >
          Try again
        </Button>
      </div>
    </div>
  )
}
