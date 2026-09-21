"use client"

import { useState, useEffect } from "react"
import { LoaderCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FEATURE FLAG: Edit Order Mode Control
 * ─────────────────────────────────────────────────────────────────────────────
 * Set `ENABLE_EDIT_ORDER = true` if you want to re-enable "Edit order" mode.
 * When `ENABLE_EDIT_ORDER = false` (default):
 *   - Only "New order" will be opened.
 *   - "Edit order" button is completely hidden from the UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ENABLE_EDIT_ORDER = true

const PRIMARY_ORDER_FORM_URL = "/new-order-fms/primary-order-form/app/index.html"

export default function PrimaryOrderFormPage() {
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 4000)
    return () => clearTimeout(timer)
  }, [])

  const userName = user?.name ? encodeURIComponent(user.name) : ""
  const iframeSrc = `${PRIMARY_ORDER_FORM_URL}?allowEdit=${ENABLE_EDIT_ORDER ? 1 : 0}${userName ? `&userName=${userName}` : ""}`

  return (
    <div className="relative -m-4 min-h-[calc(100dvh-4rem)] w-[calc(100%+2rem)] overflow-hidden bg-slate-100 sm:-m-6 sm:w-[calc(100%+3rem)] lg:-m-8 lg:w-[calc(100%+4rem)]">
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
        key={user?.name || "anonymous"}
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
