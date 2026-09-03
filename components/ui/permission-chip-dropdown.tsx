"use client"

import React, { useState, useMemo } from "react"
import { Check, ChevronDown, Search, X, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export interface PermissionOption {
  id: string
  label: string
  bg?: string
  text?: string
  border?: string
}

// Preset color map matching the Google Sheet "Role_Permissions" tab
export const CHIP_STYLE_MAP: Record<string, { bg: string; text: string; border: string }> = {
  view:       { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  edit:       { bg: "#0284c7", text: "#ffffff", border: "#0369a1" },
  delete:     { bg: "#991b1b", text: "#ffffff", border: "#7f1d1d" },
  manage:     { bg: "#15803d", text: "#ffffff", border: "#166534" },
  create:     { bg: "#ede9fe", text: "#6d28d9", border: "#ddd6fe" },
  viewSelf:   { bg: "#155e75", text: "#ffffff", border: "#0e7490" },
  viewAll:    { bg: "#334155", text: "#ffffff", border: "#1e293b" },
  write:      { bg: "#16a34a", text: "#ffffff", border: "#15803d" },
  assign:     { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  all:        { bg: "#7e22ce", text: "#ffffff", border: "#6b21a8" },

  // Stages matching Google Sheet AP3:AT98
  stage1:     { bg: "#2563eb", text: "#ffffff", border: "#1d4ed8" },
  stage2:     { bg: "#dc2626", text: "#ffffff", border: "#b91c1c" },
  stage3:     { bg: "#16a34a", text: "#ffffff", border: "#15803d" },
  stage4:     { bg: "#7c3aed", text: "#ffffff", border: "#6d28d9" },
  stage5:     { bg: "#0891b2", text: "#ffffff", border: "#0e7490" },
  stage6:     { bg: "#334155", text: "#ffffff", border: "#1e293b" },
  stage7:     { bg: "#e2e8f0", text: "#1e293b", border: "#cbd5e1" },
  stage8:     { bg: "#d97706", text: "#ffffff", border: "#b45309" },
  Executive:  { bg: "#4f46e5", text: "#ffffff", border: "#4338ca" },
  Review:     { bg: "#e11d48", text: "#ffffff", border: "#be123c" },
  stage9:     { bg: "#06b6d4", text: "#ffffff", border: "#0891b2" },
  stage10:    { bg: "#6366f1", text: "#ffffff", border: "#4f46e5" },
  stage11:    { bg: "#9333ea", text: "#ffffff", border: "#7e22ce" },
}

export function getChipStyle(id: string) {
  if (CHIP_STYLE_MAP[id]) return CHIP_STYLE_MAP[id]
  const lower = id.toLowerCase()
  if (CHIP_STYLE_MAP[lower]) return CHIP_STYLE_MAP[lower]
  return { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" }
}

interface PermissionChipDropdownProps {
  options: PermissionOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function PermissionChipDropdown({
  options,
  selected,
  onChange,
  disabled = false,
  placeholder = "+ Add permission",
  className = "",
}: PermissionChipDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.id.toLowerCase().includes(q)
    )
  }, [options, search])

  const toggleOption = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== id))
  }

  const selectAll = () => {
    const allIds = options.map((o) => o.id)
    onChange(allIds)
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="button"
          tabIndex={0}
          className={`min-h-[36px] w-full flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer select-none text-xs ${
            disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
          } ${className}`}
        >
          {/* Selected Chips */}
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {selected.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Plus className="h-3 w-3" /> {placeholder}
              </span>
            ) : (
              selected.map((val) => {
                const style = getChipStyle(val)
                const opt = options.find((o) => o.id === val)
                const label = opt?.label || val
                return (
                  <span
                    key={val}
                    style={{
                      backgroundColor: style.bg,
                      color: style.text,
                      borderColor: style.border,
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs leading-none shrink-0"
                  >
                    <span>{label}</span>
                    {!disabled && (
                      <span
                        role="button"
                        onClick={(e) => removeOption(val, e)}
                        className="hover:opacity-75 cursor-pointer flex items-center justify-center -mr-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                )
              })
            )}
          </div>

          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-64 p-0 rounded-xl shadow-xl border border-slate-200 bg-white z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Search Header */}
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions..."
              className="h-8 pl-8 text-xs rounded-lg bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Options List matching Google Sheets Dropdown UI */}
        <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">No matching options</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selected.includes(opt.id)
              const style = getChipStyle(opt.id)

              return (
                <div
                  key={opt.id}
                  onClick={(e) => toggleOption(opt.id, e)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                    isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderColor: style.border,
                      }}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs leading-none"
                    >
                      {opt.label}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 font-bold shrink-0" />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Utility Footer (Select All / Clear) */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/50 text-[11px] rounded-b-xl">
          <button
            type="button"
            onClick={selectAll}
            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Select All
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
