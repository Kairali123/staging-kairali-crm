"use client"

import { useState } from "react"
import { LoaderCircle } from "lucide-react"

const PRIMARY_ORDER_FORM_URL = "/new-order-fms/primary-order-form/app/index.html"

export default function PrimaryOrderFormPage() {
  const [isLoading, setIsLoading] = useState(true)

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
        src={PRIMARY_ORDER_FORM_URL}
        title="KAPPL Primary Order Form"
        className="block h-[calc(100dvh-4rem)] min-h-[720px] w-full border-0 bg-white"
        allow="camera; fullscreen"
        referrerPolicy="same-origin"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}
