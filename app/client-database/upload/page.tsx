'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Upload, Download, Plus, CheckCircle, XCircle, FileText,
  User, Phone, Mail, MapPin, Globe, Tag, MessageSquare,
  RefreshCw, ExternalLink
} from 'lucide-react'

interface CategoryHierarchyItem {
  category: string
  subCategories: string[]
}

interface UploadResult {
  addedRows: number
  rejectedRows: number
  rejectionReasons?: { row: number; reason: string }[]
  driveFileUrl?: string
}

const TEMPLATE_HEADERS = [
  'Client Name','Phone Number','Email Address','Alternate Phone',
  'Category','Sub Category','Source Sheet','Address',
  'City / State','Country','Remarks / Notes',
]
const SAMPLE_ROW = [
  'John Doe','9876543210','john@example.com','',
  'KTAHV Hospital','General','Manual Entry','123 Main Street',
  'Mumbai, Maharashtra','India','VIP client',
]

export default function ClientUploadPage() {
  const [hierarchy, setHierarchy] = useState<CategoryHierarchyItem[]>([])
  const [form, setForm] = useState({
    name:'', phone:'', email:'', alternate_phone:'',
    category:'', sub_category:'', source_sheet:'Manual Entry',
    address:'', city_state:'', country:'India', remarks:'',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState<string|null>(null)
  const [formError, setFormError] = useState<string|null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFile, setUploadFile] = useState<File|null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult|null>(null)
  const [uploadError, setUploadError] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState(false)

  const subCategories = hierarchy.find(h => h.category === form.category)?.subCategories || []

  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await fetch('/api/client-database/hierarchy')
      const data = await res.json()
      if (data.success && data.hierarchy) {
        setHierarchy(data.hierarchy)
        setForm(f => ({
          ...f,
          category: data.hierarchy[0]?.category || '',
          sub_category: data.hierarchy[0]?.subCategories[0] || '',
        }))
      }
    } catch {}
  }, [])

  useEffect(() => { fetchHierarchy() }, [fetchHierarchy])

  useEffect(() => {
    const subs = hierarchy.find(h => h.category === form.category)?.subCategories || []
    setForm(f => ({ ...f, sub_category: subs[0] || '' }))
  }, [form.category, hierarchy])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Client Name is required.'); return }
    setFormSubmitting(true); setFormError(null); setFormSuccess(null)
    try {
      const res = await fetch('/api/client-database', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setFormSuccess(`Client "${form.name}" added! ID: ${data.client?.unique_client_id || ''}`)
        setForm({ name:'', phone:'', email:'', alternate_phone:'',
          category: hierarchy[0]?.category || '', sub_category: hierarchy[0]?.subCategories[0] || '',
          source_sheet:'Manual Entry', address:'', city_state:'', country:'India', remarks:'' })
      } else {
        setFormError(data.error || 'Failed to add client.')
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error.')
    } finally { setFormSubmitting(false) }
  }

  const handleDownloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(','), SAMPLE_ROW.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'kairali_client_upload_template.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) { setUploadError('Please select a file first.'); return }
    setUploading(true); setUploadError(null); setUploadResult(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile); fd.append('uploadedBy', 'Admin')
      const res = await fetch('/api/client-database/upload', { method:'POST', body:fd })
      const data = await res.json()
      if (data.success) {
        setUploadResult({ addedRows: data.addedRows ?? 0, rejectedRows: data.rejectedRows ?? 0,
          rejectionReasons: data.rejectionReasons ?? [], driveFileUrl: data.driveFileUrl })
        setUploadFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else { setUploadError(data.error || 'Upload failed.') }
    } catch (err: any) { setUploadError(err.message || 'Network error.') }
    finally { setUploading(false) }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1'

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Data Upload</h1>
            <p className="text-xs text-slate-500 mt-0.5">Add a single client manually or bulk-import via CSV / Excel</p>
          </div>
        </div>

        {/* SECTION 1: Single Client Form */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Add Single Client</h2>
          </div>
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><User className="h-3.5 w-3.5 text-slate-400" />Client Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. John Doe" value={form.name}
                  onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Phone className="h-3.5 w-3.5 text-slate-400" />Phone Number</label>
                <input type="tel" placeholder="e.g. 9876543210" value={form.phone}
                  onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Mail className="h-3.5 w-3.5 text-slate-400" />Email Address</label>
                <input type="email" placeholder="e.g. john@example.com" value={form.email}
                  onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Phone className="h-3.5 w-3.5 text-slate-400" />Alternate Phone</label>
                <input type="tel" placeholder="e.g. 9876543211" value={form.alternate_phone}
                  onChange={e=>setForm(f=>({...f,alternate_phone:e.target.value}))} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Tag className="h-3.5 w-3.5 text-slate-400" />Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={inputCls}>
                  {hierarchy.map(h=><option key={h.category} value={h.category}>{h.category}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}><Tag className="h-3.5 w-3.5 text-slate-400" />Sub Category</label>
                <select value={form.sub_category} onChange={e=>setForm(f=>({...f,sub_category:e.target.value}))} className={inputCls}>
                  {(subCategories.length>0?subCategories:['General']).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><FileText className="h-3.5 w-3.5 text-slate-400" />Source / Sheet Name</label>
                <input type="text" placeholder="e.g. Trade Fair 2025" value={form.source_sheet}
                  onChange={e=>setForm(f=>({...f,source_sheet:e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><MapPin className="h-3.5 w-3.5 text-slate-400" />Address</label>
                <input type="text" placeholder="Street / Area / Building" value={form.address}
                  onChange={e=>setForm(f=>({...f,address:e.target.value}))} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><MapPin className="h-3.5 w-3.5 text-slate-400" />City / State</label>
                <input type="text" placeholder="e.g. Mumbai, Maharashtra" value={form.city_state}
                  onChange={e=>setForm(f=>({...f,city_state:e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Globe className="h-3.5 w-3.5 text-slate-400" />Country</label>
                <input type="text" placeholder="e.g. India" value={form.country}
                  onChange={e=>setForm(f=>({...f,country:e.target.value}))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}><MessageSquare className="h-3.5 w-3.5 text-slate-400" />Remarks / Notes</label>
              <textarea rows={3} placeholder="Any additional notes..." value={form.remarks}
                onChange={e=>setForm(f=>({...f,remarks:e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {formSuccess && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{formSuccess}</span>
              </div>
            )}
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{formError}</span>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={formSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-sm transition-all">
                {formSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {formSubmitting ? 'Saving...' : 'Add Client'}
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2: Bulk Upload */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Bulk Upload</h2>
              <span className="text-[11px] text-slate-400">CSV or Excel (.xlsx / .xls)</span>
            </div>
            <button onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all">
              <Download className="h-3.5 w-3.5" />Download Template
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">📋 Template Columns</p>
              <p className="text-blue-600 font-mono text-[11px] break-all">{TEMPLATE_HEADERS.join(' · ')}</p>
              <p className="text-blue-500">Download the template, fill your data, then upload. Duplicates (same phone/email) will be auto-skipped. File will also be saved to Google Drive.</p>
            </div>
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div
                onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f)setUploadFile(f)}}
                onClick={()=>fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver?'border-indigo-500 bg-indigo-50':'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e=>setUploadFile(e.target.files?.[0]||null)} />
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-indigo-600" />
                  </div>
                  {uploadFile ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{uploadFile.name}</p>
                      <p className="text-xs text-slate-500">{(uploadFile.size/1024).toFixed(1)} KB — click to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-700">Drag & drop or <span className="text-indigo-600 underline">browse</span></p>
                      <p className="text-xs text-slate-400 mt-1">Supported: .csv, .xlsx, .xls</p>
                    </div>
                  )}
                </div>
              </div>
              {uploadError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{uploadError}</span>
                </div>
              )}
              {uploadResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Upload Complete!
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white rounded-lg p-3 border border-emerald-200 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{uploadResult.addedRows}</p>
                      <p className="text-slate-500 mt-0.5">Rows Added to DB</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-100 text-center">
                      <p className="text-2xl font-bold text-red-500">{uploadResult.rejectedRows}</p>
                      <p className="text-slate-500 mt-0.5">Rows Skipped</p>
                    </div>
                  </div>
                  {uploadResult.driveFileUrl && (
                    <a href={uploadResult.driveFileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                      <ExternalLink className="h-3.5 w-3.5" />View file on Google Drive
                    </a>
                  )}
                  {uploadResult.rejectionReasons && uploadResult.rejectionReasons.length > 0 && (
                    <details className="text-xs mt-1">
                      <summary className="cursor-pointer text-red-600 font-medium">View skipped row details</summary>
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pl-2 border-l-2 border-red-200">
                        {uploadResult.rejectionReasons.map((r,i)=>(
                          <li key={i} className="text-slate-500">Row {r.row}: {r.reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={uploading||!uploadFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all">
                  {uploading?<RefreshCw className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}
                  {uploading?'Uploading...':'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
