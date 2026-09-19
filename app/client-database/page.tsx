'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Database,
  Search,
  RefreshCw,
  Upload,
  Download,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  Phone,
  Mail,
  Layers,
  FileSpreadsheet,
  ExternalLink,
  X,
  FileText,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  StopCircle,
  Clock,
} from 'lucide-react'

interface Client {
  id: number
  unique_client_id: string
  name: string
  email: string | null
  phone: string | null
  alternate_phone: string | null
  category: string
  sub_category: string | null
  source_sheet: string
  source_sheet_url: string | null
  address: string | null
  city_state: string | null
  country: string | null
  remarks: string | null
  created_at: string
}

interface CategoryHierarchyItem {
  category: string
  subCategories: string[]
}

interface UploadLog {
  id: number
  file_name: string
  uploaded_by: string
  total_rows: number
  added_rows: number
  rejected_rows: number
  rejection_reasons: any
  drive_file_url: string | null
  created_at: string
}

export default function ClientDatabasePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [hierarchy, setHierarchy] = useState<CategoryHierarchyItem[]>([])
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL')
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 })

  const [kpis, setKpis] = useState({
    totalClients: 0,
    uniquePhones: 0,
    uniqueEmails: 0,
    totalCategories: 0,
    totalSubCategories: 0,
  })
  const [sourceSheets, setSourceSheets] = useState<{ source_sheet: string; count: number }[]>([])
  const [masterSheetUrl, setMasterSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1XkE5g9kzbLNFn8DnyNW3Ielfal60frvQhp2dK9q_Vp4/edit')
  const [masterSheetPart, setMasterSheetPart] = useState(1)

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [logsModalOpen, setLogsModalOpen] = useState(false)

  // Notification state
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync states
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; currentSheetName: string } | null>(null)
  const [accessStatus, setAccessStatus] = useState<{
    serviceAccount: string
    sheets: { id: string; label: string; accessible: boolean; url: string; error?: string }[]
  } | null>(null)
  const [setupModalOpen, setSetupModalOpen] = useState(false)

  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ addedRows: number; rejectedRows: number } | null>(null)

  // Sync logs
  const [syncLogs, setSyncLogs] = useState<{ id: number; sync_type: string; status: string; added_count: number; duplicate_count: number; details: string; created_at: string }[]>([])
  const [syncLogsOpen, setSyncLogsOpen] = useState(false)
  const abortSyncRef = React.useRef(false)

  // Sort state
  const [sortField, setSortField] = useState<'id' | 'name' | 'category' | 'sub_category' | 'created_at'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Add Client Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'KTAHV Hospital',
    sub_category: 'General',
    address: '',
    city_state: '',
    country: 'India',
    remarks: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Category & Sub-Category Filter Helpers
  const filterSubCategories = useMemo(() => {
    if (selectedCategory === 'ALL') return []
    const match = hierarchy.find((h) => h.category === selectedCategory)
    return match?.subCategories || []
  }, [hierarchy, selectedCategory])

  const currentFormSubCategories = useMemo(() => {
    const match = hierarchy.find((h) => h.category === formData.category)
    return match?.subCategories || ['General']
  }, [hierarchy, formData.category])

  // Fetch client database records
  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search,
        category: selectedCategory,
        subCategory: selectedSubCategory,
        source: selectedSource,
        sortField,
        sortOrder,
      })
      const res = await fetch(`/api/client-database?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setClients(data.clients || [])
        if (data.pagination) setPagination(data.pagination)
        if (data.kpis) setKpis(data.kpis)
        if (data.sourceSheets) setSourceSheets(data.sourceSheets)
      } else {
        setError(data.error || 'Failed to fetch client database records.')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading client data.')
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedCategory, selectedSubCategory, selectedSource, sortField, sortOrder])

  // Fetch category hierarchy
  const fetchHierarchy = async () => {
    try {
      const res = await fetch('/api/client-database/categories')
      const data = await res.json()
      if (data.success && Array.isArray(data.hierarchy) && data.hierarchy.length > 0) {
        setHierarchy(data.hierarchy)
        setFormData((prev) => ({
          ...prev,
          category: prev.category || data.hierarchy[0].category,
          sub_category: prev.sub_category || data.hierarchy[0].subCategories[0] || 'General',
        }))
      }
    } catch (err: any) {
      console.error('Failed to load categories', err)
    }
  }

  // Fetch upload audit logs
  const fetchUploadLogs = async () => {
    try {
      const res = await fetch('/api/client-database/upload')
      const data = await res.json()
      if (data.success && Array.isArray(data.logs)) {
        setUploadLogs(data.logs)
      }
    } catch (err: any) {
      console.error('Failed to fetch upload logs', err)
    }
  }

  // Fetch sync audit logs
  const fetchSyncLogs = async () => {
    try {
      const res = await fetch('/api/client-database/sync')
      const data = await res.json()
      if (data.success && data.syncLogs) {
        setSyncLogs(data.syncLogs)
      }
      if (data.masterSheetUrl) setMasterSheetUrl(data.masterSheetUrl)
      if (data.masterSheetPart) setMasterSheetPart(data.masterSheetPart)
    } catch (err: any) {
      console.error('Failed to fetch sync logs', err)
    }
  }

  // Initial load
  useEffect(() => {
    fetchHierarchy()
    fetchUploadLogs()
    fetchSyncLogs()
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Handle Add Client Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/client-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setNotice('Client added successfully!')
        setAddModalOpen(false)
        setFormData({
          name: '',
          phone: '',
          email: '',
          category: hierarchy[0]?.category || 'KTAHV Hospital',
          sub_category: hierarchy[0]?.subCategories[0] || 'General',
          address: '',
          city_state: '',
          country: 'India',
          remarks: '',
        })
        fetchClients()
      } else {
        setError(data.error || 'Failed to add client.')
      }
    } catch (err: any) {
      setError(err.message || 'Error saving client.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Handle Sync Drive & Sheets with live batch-by-batch progress
  const handleDriveSync = async () => {
    abortSyncRef.current = false
    setSyncingDrive(true)
    setError(null)
    setNotice(null)
    setSyncProgress(null)
    try {
      // Step 1: List all Google Sheets in folder + fetch sync logs
      const metaRes = await fetch('/api/client-database/sync')
      const metaData = await metaRes.json()

      if (metaData.syncLogs) setSyncLogs(metaData.syncLogs)

      if (!metaData.success || !metaData.sheets || metaData.sheets.length === 0) {
        if (metaData.accessStatus) {
          setAccessStatus(metaData.accessStatus)
          setSetupModalOpen(true)
        } else {
          setError(metaData.error || 'No syncable Google Sheets found. Please share the sheets with the service account.')
        }
        setSyncingDrive(false)
        return
      }

      const sheets = metaData.sheets
      let grandAdded = 0
      let grandDuplicates = 0

      // Step 2: Loop through each sheet batch sequentially
      for (let i = 0; i < sheets.length; i++) {
        if (abortSyncRef.current) {
          setNotice(`Sync stopped at sheet ${i} of ${sheets.length}. ${grandAdded} records added so far.`)
          break
        }
        const sheet = sheets[i]
        setSyncProgress({
          current: i + 1,
          total: sheets.length,
          currentSheetName: `${sheet.fileName} – ${sheet.sheetName}`,
        })

        const batchRes = await fetch('/api/client-database/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: sheet.fileId, fileName: sheet.fileName, mimeType: sheet.mimeType }),
        })
        const batchData = await batchRes.json()

        if (batchData.success && batchData.stats) {
          grandAdded += batchData.stats.added || 0
          grandDuplicates += batchData.stats.duplicates || 0
        } else if (!batchData.success) {
          console.error(`[Sync Batch Error] Sheet ${sheet.fileName} failed:`, batchData.error)
        }

        // Live UI table refresh after each batch
        fetchClients()
      }

      if (!abortSyncRef.current) {
        setNotice(`✅ Sync Completed! Processed ${sheets.length} sheet(s): ${grandAdded} records added/merged, ${grandDuplicates} duplicates skipped.`)
      }

      // Refresh sync logs after done
      const logsRes = await fetch('/api/client-database/sync')
      const logsData = await logsRes.json()
      if (logsData.syncLogs) setSyncLogs(logsData.syncLogs)
      if (logsData.masterSheetUrl) setMasterSheetUrl(logsData.masterSheetUrl)
      if (logsData.masterSheetPart) setMasterSheetPart(logsData.masterSheetPart)

    } catch (e: any) {
      console.error('[Drive Sync Exception]', e)
      setError(e.message || 'Error triggering Drive sync.')
    } finally {
      setSyncingDrive(false)
      setSyncProgress(null)
      abortSyncRef.current = false
    }
  }

  const handleAbortSync = () => {
    abortSyncRef.current = true
  }

  // Handle File Upload Submit
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    setError(null)
    setUploadResult(null)
    try {
      const body = new FormData()
      body.append('file', uploadFile)
      body.append('uploadedBy', 'Dashboard User')

      const res = await fetch('/api/client-database/upload', {
        method: 'POST',
        body,
      })
      const data = await res.json()
      if (data.success) {
        setUploadResult(data.stats)
        setNotice(data.message)
        fetchClients()
        fetchUploadLogs()
      } else {
        setError(data.error)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-100">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Central Client Database Hub</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-speed MySQL Database for deduplicated client management.
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!syncingDrive ? (
              <button
                onClick={() => handleDriveSync()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Drive &amp; Sheets
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-sm opacity-80">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {syncProgress ? `Syncing ${syncProgress.current}/${syncProgress.total}: ${syncProgress.currentSheetName}` : 'Starting sync...'}
                </div>
                <button
                  onClick={handleAbortSync}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  Force Stop
                </button>
              </div>
            )}

            <button
              onClick={() => fetchClients()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
              Refresh Data
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Data Sheet
            </button>

            <button
              onClick={() => {
                fetchUploadLogs()
                setLogsModalOpen(true)
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
            >
              <FileText className="h-3.5 w-3.5 text-amber-600" />
              Upload Logs
            </button>

            <button
              onClick={() => setSyncLogsOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Sync Logs
            </button>

            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Client
            </button>

            <a
              href={masterSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Master Sheet {masterSheetPart > 1 ? `(Part ${masterSheetPart})` : ''}
            </a>
          </div>
        </div>

        {/* Global Notifications */}
        {syncProgress && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                <span>Syncing Batch ({syncProgress.current} / {syncProgress.total} sheets completed)</span>
              </div>
              <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                {Math.round((syncProgress.current / syncProgress.total) * 100)}%
              </span>
            </div>
            <p className="text-slate-600 text-[11px] truncate mb-2">
              Currently processing: <span className="font-medium text-slate-900">{syncProgress.currentSheetName}</span>
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {notice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total Central Clients</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{(kpis?.totalClients ?? 0).toLocaleString()}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Unique Phones</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{(kpis?.uniquePhones ?? 0).toLocaleString()}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Phone className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Unique Emails</p>
              <p className="text-xl font-bold text-indigo-700 mt-0.5">{(kpis?.uniqueEmails ?? 0).toLocaleString()}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Categories</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{kpis?.totalCategories ?? 0}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Sub-Categories</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{kpis?.totalSubCategories ?? 0}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Exporters Banner Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-indigo-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">Instant Exporters & Download Tools</h3>
              <p className="text-xs text-slate-300">
                Download filtered clean Email IDs for email campaigns or Phone numbers for WhatsApp/SMS dispatches.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/client-database/export?type=emails&category=${selectedCategory}&subCategory=${selectedSubCategory}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Email IDs CSV
            </a>

            <a
              href={`/api/client-database/export?type=phones&category=${selectedCategory}&subCategory=${selectedSubCategory}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Phones CSV (WhatsApp/SMS)
            </a>

            <a
              href="/api/client-database/export?type=template"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400" />
              Template CSV
            </a>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Filters Header */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, email, address, country..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 w-full lg:w-auto min-w-[200px]">
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium truncate"
              >
                <option value="ALL">All Source Sheets ({sourceSheets.length} sheets scanned)</option>
                {sourceSheets.map(s => (
                  <option key={s.source_sheet} value={s.source_sheet}>
                    {s.source_sheet} ({s.count})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Filter using column headers below</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 align-top">
                    <button onClick={() => { if (sortField === 'id') setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortField('id'); setSortOrder('desc') } }} className="flex items-center gap-1 hover:text-blue-600 transition-colors pt-1">
                      Unique ID {sortField === 'id' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 align-top">
                    <button onClick={() => { if (sortField === 'name') setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortField('name'); setSortOrder('asc') } }} className="flex items-center gap-1 hover:text-blue-600 transition-colors pt-1">
                      Client Name {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 align-top pt-4">Phone Number</th>
                  <th className="py-3 px-4 align-top pt-4">Email Address</th>
                  <th className="py-3 px-4 align-top">
                    <div className="flex flex-col gap-2">
                      <button onClick={() => { if (sortField === 'category') setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortField('category'); setSortOrder('asc') } }} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        Category {sortField === 'category' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value)
                          setSelectedSubCategory('ALL')
                          setPage(1)
                        }}
                        className="max-w-[120px] px-2 py-1 text-[10px] bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500 font-normal normal-case tracking-normal"
                      >
                        <option value="ALL">All</option>
                        {hierarchy.map((h) => (
                          <option key={h.category} value={h.category}>{h.category}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="py-3 px-4 align-top">
                    <div className="flex flex-col gap-2">
                      <button onClick={() => { if (sortField === 'sub_category') setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortField('sub_category'); setSortOrder('asc') } }} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        Sub Category {sortField === 'sub_category' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <select
                        disabled={selectedCategory === 'ALL'}
                        value={selectedSubCategory}
                        onChange={(e) => {
                          setSelectedSubCategory(e.target.value)
                          setPage(1)
                        }}
                        className="max-w-[140px] px-2 py-1 text-[10px] bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500 font-normal normal-case tracking-normal disabled:opacity-50 disabled:bg-slate-50"
                      >
                        <option value="ALL">All Sub-Categories</option>
                        {filterSubCategories.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="py-3 px-4 align-top pt-4">Source Sheet</th>
                  <th className="py-3 px-4 align-top pt-4">Address</th>
                  <th className="py-3 px-4 align-top pt-4">City / State</th>
                  <th className="py-3 px-4 align-top pt-4">Country</th>
                  <th className="py-3 px-4 align-top">
                    <button onClick={() => { if (sortField === 'created_at') setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortField('created_at'); setSortOrder('desc') } }} className="flex items-center gap-1 hover:text-blue-600 transition-colors pt-1">
                      Added {sortField === 'created_at' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Loading client database records...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No client records found.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => {
                    const isRawUrl = String(c.source_sheet).startsWith('http');
                    // Fallback to Google Drive search if no direct URL exists
                    const linkHref = c.source_sheet_url || (isRawUrl ? c.source_sheet : `https://drive.google.com/drive/search?q=${encodeURIComponent(String(c.source_sheet).replace(/\s*\([^)]*\)$/, '').trim())}`);
                    const displayLabel = isRawUrl ? 'View Sheet Link' : c.source_sheet;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">{c.unique_client_id}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 font-mono">{c.phone || '-'}</td>
                        <td className="py-3 px-4">{c.email || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {c.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {c.sub_category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {linkHref ? (
                            <a href={linkHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2">
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="max-w-[140px] truncate">{displayLabel}</span>
                            </a>
                          ) : (
                            <span className="max-w-[140px] truncate block">{displayLabel}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{c.address || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{c.city_state || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{c.country || '-'}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-700">{((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)}</strong> of <strong className="text-slate-700">{pagination.total}</strong> records &nbsp;·&nbsp; Page {page} of {pagination.totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium"
                title="First page"
              >
                «
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              {/* Numbered page buttons (show up to 5 around current) */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded border font-medium ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(pagination.totalPages)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium"
                title="Last page"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Add New Client Record</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select Category and Sub-Category from the standard list. Real-time deduplication protects against duplicate phones or emails.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Rahul Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="rahul@example.com"
                  />
                </div>
              </div>

              {/* Category & SubCategory Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value
                      const firstSub = hierarchy.find((h) => h.category === newCat)?.subCategories[0] || 'General'
                      setFormData({ ...formData, category: newCat, sub_category: firstSub })
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    {hierarchy.map((h) => (
                      <option key={h.category} value={h.category}>
                        {h.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sub Category *</label>
                  <select
                    value={formData.sub_category}
                    onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    {currentFormSubCategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Street Address, Area"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City / State</label>
                  <input
                    type="text"
                    value={formData.city_state}
                    onChange={(e) => setFormData({ ...formData, city_state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Delhi, DL"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="India"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enquired for Ayurveda treatment..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Template Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Data Sheet (CSV / Excel)</h3>
            <p className="text-xs text-slate-500 mb-4">
              File will be deduplicated and saved directly in Central MySQL Database.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50">
                <FileSpreadsheet className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
                <input
                  required
                  type="file"
                  accept=".csv, .xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {uploadResult && (
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-900 space-y-1">
                  <p className="font-semibold">Upload Processed!</p>
                  <p>Added Rows: {uploadResult.addedRows}</p>
                  <p>Rejected Rows (Duplicates/Missing): {uploadResult.rejectedRows}</p>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <a
                  href="/api/client-database/export?type=template"
                  className="text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Download Sample Format
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    {uploading ? 'Processing...' : 'Upload & Deduplicate'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Logs History Modal */}
      {logsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 relative">
            <button
              onClick={() => setLogsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Log History</h3>
            <p className="text-xs text-slate-500 mb-4">
              Audit log of past file uploads, total rows, added vs rejected rows, and duplicate reasons.
            </p>

            <div className="overflow-y-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-600">
                    <th className="py-2 px-3">File Name</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Total Rows</th>
                    <th className="py-2 px-3">Added</th>
                    <th className="py-2 px-3">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {uploadLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No upload log history available.
                      </td>
                    </tr>
                  ) : (
                    uploadLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{log.file_name}</td>
                        <td className="py-2.5 px-3">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                        <td className="py-2.5 px-3">{log.total_rows}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">{log.added_rows}</td>
                        <td className="py-2.5 px-3 text-red-600 font-semibold">{log.rejected_rows}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Google Sheets Setup Modal ── */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setSetupModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Google Sheets Access Setup Required</h3>
                <p className="text-xs text-slate-500">
                  The sync service needs read access to these sheets. Share each one with the service account below.
                </p>
              </div>
            </div>

            {/* Service Account Email Box */}
            {accessStatus && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                <p className="font-semibold text-blue-800 mb-1">📧 Service Account Email (share each sheet with this):</p>
                <p className="font-mono text-blue-900 bg-white px-3 py-1.5 rounded border border-blue-200 select-all">
                  {accessStatus.serviceAccount}
                </p>
              </div>
            )}

            {/* Sheet Access Status List */}
            {accessStatus && (
              <div className="space-y-2 mb-5">
                <p className="text-xs font-semibold text-slate-700 mb-2">Sheets to share (click to open in Google Sheets → click Share → add email above as Viewer or Editor):</p>
                {accessStatus.sheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
                      sheet.accessible
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {sheet.accessible ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${sheet.accessible ? 'text-emerald-800' : 'text-red-800'}`}>
                          {sheet.label}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500 truncate">{sheet.id}</p>
                        {!sheet.accessible && sheet.error && (
                          <p className="text-red-600 text-[10px] mt-0.5 truncate">{sheet.error}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href={sheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] flex-shrink-0 transition-all ${
                        sheet.accessible
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {sheet.accessible ? 'Already Accessible ✓' : 'Open & Share →'}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Step Instructions */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs mb-4">
              <p className="font-semibold text-slate-700 mb-2">How to fix:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Click <strong>"Open & Share →"</strong> on each red sheet above</li>
                <li>In Google Sheets, click the <strong>Share</strong> button (top right)</li>
                <li>Paste the service account email and set access to <strong>Viewer</strong> (or Editor for the Master Output Sheet)</li>
                <li>Click <strong>Send</strong>, then come back here and click <strong>Retry Sync</strong></li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSetupModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSetupModalOpen(false)
                  handleDriveSync()
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sync Logs Modal ─────────────────────────────────── */}
      {syncLogsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 relative max-h-[80vh] flex flex-col">
            <button
              onClick={() => setSyncLogsOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Sync History Logs
            </h3>
            <p className="text-xs text-slate-500 mb-4">Records of every Drive sync run — sheets processed, added, and duplicates skipped.</p>

            <div className="overflow-y-auto flex-1">
              {syncLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No sync logs yet. Run a sync first.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-2 px-3">Date &amp; Time</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Added</th>
                      <th className="py-2 px-3 text-right">Duplicates Skipped</th>
                      <th className="py-2 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-slate-700">{log.sync_type}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{log.added_count}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{log.duplicate_count}</td>
                        <td className="py-2 px-3 text-slate-400 max-w-[200px] truncate" title={log.details}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-400">{syncLogs.length} log entries shown (latest 50)</span>
              <button
                onClick={() => setSyncLogsOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
