"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Selectable rows-per-page values shared by every bookings table. */
export const BOOKING_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100] as const

export const DEFAULT_BOOKING_ROWS_PER_PAGE = 25

interface BookingRowsPerPageSelectProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function BookingRowsPerPageSelect({ value, onChange, className }: BookingRowsPerPageSelectProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-slate-600">Rows</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BOOKING_ROWS_PER_PAGE_OPTIONS.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
