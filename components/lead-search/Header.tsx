"use client"

import { Search } from "lucide-react"
import type { DataSourceFilter } from "@/lib/lead-search-types"

interface HeaderProps {
  activeFilter: DataSourceFilter
  onFilterChange: (filter: DataSourceFilter) => void
}

const filters: DataSourceFilter[] = ["All", "KTAHV", "KAPPL", "VILLARAAG"]

export function Header({ activeFilter, onFilterChange }: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-6 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Search className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Lead Search Dashboard</h1>
            <p className="text-blue-100 text-sm">Search and access lead details effortlessly</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm mr-2">Data Source:</span>
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === filter
                    ? "bg-white text-blue-600 shadow-md"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
