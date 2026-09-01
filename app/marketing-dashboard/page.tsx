"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X, RotateCcw, Download, Share, Save, Filter } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { KPISection } from "@/components/marketing/kpi-section"
import { ChannelPerformanceSection } from "@/components/marketing/channel-performance-section"
import { ChartsSection } from "@/components/marketing/charts-section"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function MarketingDashboard() {
  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [selectedProperties, setSelectedProperties] = useState<string[]>(["KTAHV", "KAPPL", "VILLA RAAG"])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Available options
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const currentMonth = new Date().getMonth()

  const channels = [
    "Facebook/Instagram Ads",
    "IVR",
    "Website (Organic)",
    "Google PPC",
    "Reference",
    "Priya Sharma",
    "Online Order",
    "Travel Agent",
    "Offline Advertising",
    "Seminar/Webinar/Events/Workshop",
    "Third Party Website",
    "Others",
  ]

  // Initialize current month as selected
  useEffect(() => {
    setSelectedMonths([months[currentMonth]])
  }, [currentMonth])

  const toggleMonth = (month: string) => {
    if (dateRange.from || dateRange.to) return // Don't allow month selection if date range is set

    setSelectedMonths((prev) => (prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]))
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]))
  }

  const toggleProperty = (property: string) => {
    setSelectedProperties((prev) =>
      prev.includes(property) ? prev.filter((p) => p !== property) : [...prev, property],
    )
  }

  const resetFilters = () => {
    setSelectedYear(new Date().getFullYear().toString())
    setSelectedMonths([months[currentMonth]])
    setDateRange({})
    setSelectedProperties(["KTAHV", "KAPPL", "VILLA RAAG"])
    setSelectedChannels([])
  }

  const clearDateRange = () => {
    setDateRange({})
  }

  const dashboardFilters = {
    year: selectedYear,
    months: selectedMonths,
    dateRange,
    properties: selectedProperties,
    channels: selectedChannels,
  }

  const getActiveFilters = () => {
    const filters = []
    if (selectedYear !== new Date().getFullYear().toString()) {
      filters.push({ type: "year", value: selectedYear })
    }
    if (selectedMonths.length > 0 && selectedMonths.length < 12) {
      filters.push(...selectedMonths.map((month) => ({ type: "month", value: month })))
    }
    if (dateRange.from || dateRange.to) {
      filters.push({
        type: "dateRange",
        value: `${dateRange.from ? format(dateRange.from, "MMM dd") : ""} - ${dateRange.to ? format(dateRange.to, "MMM dd") : ""}`,
      })
    }
    if (selectedProperties.length < 3) {
      filters.push(...selectedProperties.map((prop) => ({ type: "property", value: prop })))
    }
    if (selectedChannels.length > 0) {
      filters.push(...selectedChannels.map((channel) => ({ type: "channel", value: channel })))
    }
    return filters
  }

  const removeFilter = (filter: { type: string; value: string }) => {
    switch (filter.type) {
      case "year":
        setSelectedYear(new Date().getFullYear().toString())
        break
      case "month":
        setSelectedMonths((prev) => prev.filter((m) => m !== filter.value))
        break
      case "dateRange":
        setDateRange({})
        break
      case "property":
        setSelectedProperties((prev) => prev.filter((p) => p !== filter.value))
        break
      case "channel":
        setSelectedChannels((prev) => prev.filter((c) => c !== filter.value))
        break
    }
  }

  const MobileFiltersContent = () => (
    <div className="space-y-6 p-4">
      {/* Year Select */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1f2a2e]">Year</label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full border-[#dfe7e2]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025].map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1f2a2e]">Months</label>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => (
            <Button
              key={month}
              variant={selectedMonths.includes(month) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleMonth(month)}
              disabled={Boolean(dateRange.from || dateRange.to)}
              className={cn(
                "h-10 text-xs font-medium transition-all",
                selectedMonths.includes(month)
                  ? "bg-[#2f6b4f] text-white hover:bg-[#2f6b4f]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10",
                index === currentMonth && !selectedMonths.includes(month) && "ring-2 ring-[#b6864a]/50",
                (dateRange.from || dateRange.to) && "opacity-50 cursor-not-allowed",
              )}
            >
              {month}
            </Button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1f2a2e]">Date Range</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal border-[#dfe7e2]",
                !dateRange.from && !dateRange.to && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                  </>
                ) : (
                  format(dateRange.from, "MMM dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                setDateRange(range || {})
                if (range?.from || range?.to) {
                  setSelectedMonths([])
                }
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
        {(dateRange.from || dateRange.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateRange}
            className="w-full text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
          >
            <X className="mr-2 h-4 w-4" />
            Clear date range
          </Button>
        )}
      </div>

      {/* Properties */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1f2a2e]">Properties</label>
        <div className="grid grid-cols-1 gap-2">
          {["KTAHV", "KAPPL", "VILLA RAAG"].map((property) => (
            <Button
              key={property}
              variant={selectedProperties.includes(property) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleProperty(property)}
              className={cn(
                "justify-start h-10 font-medium transition-all",
                selectedProperties.includes(property)
                  ? "bg-[#2f6b4f] text-white hover:bg-[#2f6b4f]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10",
              )}
            >
              {property}
            </Button>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1f2a2e]">Channels</label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
          {channels.map((channel) => (
            <Button
              key={channel}
              variant={selectedChannels.includes(channel) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleChannel(channel)}
              className={cn(
                "justify-start h-10 text-xs font-medium transition-all text-left",
                selectedChannels.includes(channel)
                  ? "bg-[#b6864a] text-white hover:bg-[#b6864a]/90"
                  : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#b6864a]/10",
              )}
            >
              {channel}
            </Button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={() => {
          resetFilters()
          setMobileFiltersOpen(false)
        }}
        className="w-full border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset all filters
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#dfe7e2] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2f6b4f] rounded-full flex items-center justify-center flex-shrink-0">
                <img src="/kairali-logo-green-leaf-ayurveda.png" alt="Kairali Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#1f2a2e] truncate">
                <span className="hidden sm:inline">Marketing vs Sales Dashboard</span>
                <span className="sm:hidden">Marketing Dashboard</span>
              </h1>
            </div>

            {/* Right: Property Scope Pills - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-2">
              {["KTAHV", "KAPPL", "VILLA RAAG"].map((property) => (
                <Button
                  key={property}
                  variant={selectedProperties.includes(property) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleProperty(property)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    selectedProperties.includes(property)
                      ? "bg-[#2f6b4f] text-white hover:bg-[#2f6b4f]/90"
                      : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10",
                  )}
                >
                  {property}
                </Button>
              ))}
            </div>

            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10 bg-transparent"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader>
                    <SheetTitle className="text-[#1f2a2e]">Filters</SheetTitle>
                  </SheetHeader>
                  <MobileFiltersContent />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Filters Row - Hidden on mobile */}
      <div className="hidden lg:block border-b border-[#dfe7e2] bg-[#f8faf9]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Select */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1f2a2e]">Year:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24 h-9 border-[#dfe7e2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Chips */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1f2a2e]">Months:</span>
              <div className="flex flex-wrap gap-1">
                {months.map((month, index) => (
                  <Button
                    key={month}
                    variant={selectedMonths.includes(month) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMonth(month)}
                    disabled={Boolean(dateRange.from || dateRange.to)}
                    className={cn(
                      "h-8 px-3 text-xs font-medium rounded-md transition-all",
                      selectedMonths.includes(month)
                        ? "bg-[#2f6b4f] text-white hover:bg-[#2f6b4f]/90"
                        : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10",
                      index === currentMonth && !selectedMonths.includes(month) && "ring-2 ring-[#b6864a]/50",
                      (dateRange.from || dateRange.to) && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {month}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1f2a2e]">Date Range:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-64 h-9 justify-start text-left font-normal border-[#dfe7e2]",
                      !dateRange.from && !dateRange.to && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange(range || {})
                      if (range?.from || range?.to) {
                        setSelectedMonths([]) // Clear month selection when date range is set
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateRange}
                  className="h-8 px-2 text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Reset Filters */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
          </div>

          {/* Channel Chips */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm font-medium text-[#1f2a2e]">Channels:</span>
            <div className="flex flex-wrap gap-1">
              {channels.map((channel) => (
                <Button
                  key={channel}
                  variant={selectedChannels.includes(channel) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel(channel)}
                  className={cn(
                    "h-8 px-3 text-xs font-medium rounded-md transition-all",
                    selectedChannels.includes(channel)
                      ? "bg-[#b6864a] text-white hover:bg-[#b6864a]/90"
                      : "border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#b6864a]/10",
                  )}
                >
                  {channel}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Filter Badges */}
          {getActiveFilters().length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium text-[#1f2a2e]">Active filters:</span>
              <div className="flex flex-wrap gap-1">
                {getActiveFilters().map((filter, index) => (
                  <Badge
                    key={`${filter.type}-${filter.value}-${index}`}
                    variant="secondary"
                    className="bg-[#2f6b4f]/10 text-[#2f6b4f] hover:bg-[#2f6b4f]/20 cursor-pointer"
                    onClick={() => removeFilter(filter)}
                  >
                    {filter.value}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Active Filters - Shown only on mobile when filters are active */}
      {getActiveFilters().length > 0 && (
        <div className="lg:hidden border-b border-[#dfe7e2] bg-[#f8faf9] px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[#1f2a2e]">Active filters:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-6 px-2 text-xs text-[#1f2a2e] hover:bg-[#2f6b4f]/10"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {getActiveFilters()
              .slice(0, 3)
              .map((filter, index) => (
                <Badge
                  key={`${filter.type}-${filter.value}-${index}`}
                  variant="secondary"
                  className="bg-[#2f6b4f]/10 text-[#2f6b4f] hover:bg-[#2f6b4f]/20 cursor-pointer text-xs"
                  onClick={() => removeFilter(filter)}
                >
                  {filter.value}
                  <X className="ml-1 h-2 w-2" />
                </Badge>
              ))}
            {getActiveFilters().length > 3 && (
              <Badge variant="secondary" className="bg-[#2f6b4f]/10 text-[#2f6b4f] text-xs">
                +{getActiveFilters().length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Sticky Utilities */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#dfe7e2] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-3 border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10 bg-transparent"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-3 border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10 bg-transparent"
            >
              <Share className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-3 border-[#dfe7e2] text-[#1f2a2e] hover:bg-[#2f6b4f]/10 bg-transparent"
            >
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="space-y-6 sm:space-y-8">
          {/* KPI Section */}
          <KPISection filters={dashboardFilters} />

          {/* Channel Performance Section */}
          <ChannelPerformanceSection />

          {/* Charts Section */}
          <ChartsSection />
        </div>
      </div>
    </div>
  )
}
