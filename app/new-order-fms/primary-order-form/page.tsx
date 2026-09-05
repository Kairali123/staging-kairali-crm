"use client"

import { useState, useEffect } from "react"
import { LoaderCircle } from "lucide-react"

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FEATURE FLAG: Edit Order Mode Control
 * ─────────────────────────────────────────────────────────────────────────────
 * Set `ENABLE_EDIT_ORDER = true` if you want to re-enable "Edit order" mode.
 * When `ENABLE_EDIT_ORDER = false` (default):
 *   - Only "New order" will be opened.
 *   - "Edit order" button is disabled and cannot be clicked.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const ENABLE_EDIT_ORDER = false

const PRIMARY_ORDER_FORM_URL = "/new-order-fms/primary-order-form/app/index.html"

export default function PrimaryOrderFormPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 4000)
    return () => clearTimeout(timer)
  }, [])

  const iframeSrc = ENABLE_EDIT_ORDER
    ? `${PRIMARY_ORDER_FORM_URL}?allowEdit=1`
    : `${PRIMARY_ORDER_FORM_URL}?allowEdit=0`

  return (
    <div className="relative -m-4 min-h-[calc(100dvh-4rem)] bg-slate-100 sm:-m-6 lg:-m-8">
      {isLoading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-white"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 text-slate-700">
            <div className="animate-spin" aria-hidden="true">
              <LoaderCircle className="h-9 w-9 text-emerald-700" />
            </div>
            <p className="text-sm font-medium">Loading KAPPL Primary Order Form…</p>
          </div>
        </div>
      ) : null}

      <iframe
        src={iframeSrc}
        title="KAPPL Primary Order Form"
        className="block h-[calc(100dvh-4rem)] min-h-[720px] w-full border-0 bg-white"
        allow="camera; fullscreen"
        referrerPolicy="same-origin"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}

