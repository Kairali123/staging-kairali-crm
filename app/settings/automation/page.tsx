'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { DashboardLayout } from '@/components/dashboard-layout'
import { AUTOMATION_MODULES, type AutomationModule } from '@/lib/automation-modules'
import {
  Mail,
  GitBranch,
  MessageSquare,
  PhoneCall,
  Bell,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  Clock3,
  Layers,
  Search,
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  Mail,
  GitBranch,
  MessageSquare,
  PhoneCall,
  Bell,
  Clock,
}

export default function AutomationHubPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const roleStr = String(user?.role || '').toLowerCase().trim()
  const isSuperAdmin = roleStr === 'super_admin' || roleStr === 'super admin'

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/access-denied')
    }
  }, [isLoading, isSuperAdmin, router])

  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const categories = ['All', 'Communication', 'Process', 'Alerts']

  const filteredModules = AUTOMATION_MODULES.filter((module) => {
    const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory
    const matchesSearch =
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.tags && module.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    return matchesCategory && matchesSearch
  })

  const activeCount = AUTOMATION_MODULES.filter((m) => m.status === 'active').length
  const totalCount = AUTOMATION_MODULES.length

  if (!isSuperAdmin) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/60 pb-16">
        {/* Top Header & Breadcrumb */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-3">
              <span className="text-slate-400">Settings</span>
              <span className="text-slate-300">/</span>
              <span className="text-indigo-600 font-semibold">Automation</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Automation Settings</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Orchestrate automated communication triggers, workflows, and alerts across the Kairali CRM ecosystem.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Summary Pill */}
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-800">
                    {activeCount} Active Module{activeCount > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600">
                  {totalCount} Total Channels
                </div>
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter automation modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Quick Notice Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-8 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Unified Automation Architecture</h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Automation settings are consolidated here under <span className="font-semibold text-slate-800">Settings &gt; Automation</span>. Email trigger dispatches are active and integrated with CRM reports. Future modules can be configured from this central hub.
              </p>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => {
              const IconComponent = iconMap[module.iconName] || Sliders
              const isActive = module.status === 'active'

              return (
                <div
                  key={module.id}
                  className={`bg-white rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? 'border-indigo-200/90 shadow-sm hover:shadow-md hover:border-indigo-400/80 ring-1 ring-indigo-50'
                      : 'border-slate-200/80 opacity-80 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="p-6">
                    {/* Card Top / Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {module.badgeText}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <Clock3 className="h-3 w-3 text-slate-400" />
                          {module.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {module.description}
                    </p>

                    {/* Tags */}
                    {module.tags && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {module.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer / Action Button */}
                  <div className="p-4 bg-slate-50/60 border-t border-slate-100 rounded-b-xl flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      {module.category}
                    </span>

                    {isActive ? (
                      <Link
                        href={module.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all"
                      >
                        Configure Triggers
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium cursor-not-allowed">
                        Available in Roadmap
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
