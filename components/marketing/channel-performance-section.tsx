"use client"

import { useState, useEffect } from "react"
import { ChannelCard } from "./channel-card"
import { ChannelDrawer } from "./channel-drawer"
import { ErrorBoundary } from "./error-boundary"
import { LoadingSkeleton } from "./loading-skeleton"

interface ChannelMetrics {
  leads: { plan: number; actual: number; deltaPct: number }
  converted: { plan: number; actual: number; deltaPct: number }
  conversionRate: { plan: number; actual: number; deltaPct: number }
  revenueINR: { plan: number; actual: number; deltaPct: number }
  roiPct: { plan: number; actual: number; deltaPct: number }
}

interface ChannelData {
  id: string
  label: string
  metrics: ChannelMetrics
  trend12mo: number[]
}

export function ChannelPerformanceSection() {
  const [channelsData, setChannelsData] = useState<ChannelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const fetchChannelsData = async () => {
      try {
        setError(null)
        const response = await fetch("/api/marketing/channels")

        if (!response.ok) {
          throw new Error(`Failed to fetch channels data: ${response.status}`)
        }

        const data = await response.json()
        setChannelsData(data)
      } catch (error) {
        console.error("Failed to fetch channels data:", error)
        setError(error instanceof Error ? error.message : "Failed to load channels data")
      } finally {
        setLoading(false)
      }
    }

    fetchChannelsData()
  }, [])

  const handleChannelClick = (channel: ChannelData) => {
    setSelectedChannel(channel)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedChannel(null)
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <section className="w-full mt-6 mb-6 sm:mt-8 sm:mb-8 rounded-2xl border-2 border-slate-300 bg-white shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-300 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                Channel Performance Analysis
              </h2>
              <p className="text-sm text-slate-600">
                Track performance metrics across all marketing channels
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <LoadingSkeleton type="channel" count={12} />
        </div>
      </section>
    )
  }

  /* ================= ERROR STATE ================= */
  if (error || channelsData.length === 0) {
    return (
      <ErrorBoundary
        fallback={
          <div className="text-center py-10">
            <p className="text-slate-600 mb-4">{error || "No channel data available"}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Try again
            </button>
          </div>
        }
      >
        <div />
      </ErrorBoundary>
    )
  }

  /* ================= MAIN SECTION ================= */
  return (
    <ErrorBoundary>
      <section className="w-full mt-6 mb-6 sm:mt-8 sm:mb-8 rounded-2xl border-2 border-slate-300 bg-white shadow-lg overflow-hidden">

        {/* ===== HEADER (MATCHES TRAFFIC SOURCE STYLE) ===== */}
        <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">

            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Channel Performance Analysis
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Track performance metrics across all marketing channels
                </p>
              </div>
            </div>

            {/* Right: Helper Text */}
            <div className="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-300">
              Click any channel for detailed 12-month view
            </div>

          </div>
        </div>


        {/* ===== CONTENT ===== */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {channelsData.map((channel) => (
              <ChannelCard
                key={channel.id}
                id={channel.id}
                label={channel.label}
                metrics={channel.metrics}
                trend12mo={channel.trend12mo}
                onClick={() => handleChannelClick(channel)}
              />
            ))}
          </div>
        </div>

        {/* ===== DRAWER ===== */}
        <ChannelDrawer
          isOpen={drawerOpen}
          onClose={handleDrawerClose}
          channelData={selectedChannel}
        />
      </section>
    </ErrorBoundary>
  )
}
