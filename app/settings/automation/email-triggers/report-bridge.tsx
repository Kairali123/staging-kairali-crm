'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { DashboardLayout } from '@/components/dashboard-layout'
import { companies, exportSalesHTML, type DailySalesReport } from '@/lib/daily-sales-report'
import { reportExportHTML, type ReportData } from '@/lib/marketing-daily-report'
import { emailReportTemplates, type EmailReportId } from '@/lib/email-report-template'

export default function EmailConfigBridge({ document: documentHtml }: { document: string }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const roleStr = String(user?.role || '').toLowerCase().trim()
  const isSuperAdmin = roleStr === 'super_admin' || roleStr === 'super admin'

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/access-denied')
    }
  }, [isLoading, isSuperAdmin, router])

  const [frameHeight, setFrameHeight] = useState<number>(850)
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    let request: AbortController | undefined
    let initializing = false
    function send(data: object) { frame.current?.contentWindow?.postMessage(data, '*') }
    const listener = async (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.origin !== 'null' && event.origin !== window.location.origin && event.origin !== '') return
      const message = event.data
      if (message?.type === 'email-config-resize' && typeof message.height === 'number') {
        const next = Math.max(message.height, 650)
        setFrameHeight((prev) => (Math.abs(prev - next) >= 4 ? next : prev))
        return
      }
      if (message?.type === 'email-config-ready') {
        if (initializing) return
        initializing = true
        const query = new URLSearchParams(window.location.search)
        const report = query.get('report') || ''
        try {
          const response = await fetch('/api/email-trigger-config', { cache: 'no-store' })
          const state = await response.json()
          send({ type: 'email-config-init', templates: emailReportTemplates, report: Object.hasOwn(emailReportTemplates, report) ? report : 'daily-sales-report', autoCreate: Object.hasOwn(emailReportTemplates, report), scope: query.get('scope') || 'ALL', date: query.get('date') || '', state: response.ok ? state : null, error: response.ok ? '' : state.error })
        } catch { send({ type: 'email-config-storage-error', error: 'Unable to load saved configuration' }) }
      }
      if (message?.type === 'email-config-refresh') {
        try {
          const response = await fetch('/api/email-trigger-config', { cache: 'no-store' })
          const state = await response.json()
          send({ type: 'email-config-state', state: response.ok ? state : null, error: response.ok ? '' : state.error })
        } catch { send({ type: 'email-config-state', error: 'Could not refresh status' }) }
        return
      }
      if (message?.type === 'email-config-delete' && typeof message.id === 'string') {
        try {
          const query = new URLSearchParams({ id: message.id })
          if (Number.isInteger(message.revision)) query.set('revision', String(message.revision))
          const response = await fetch('/api/email-trigger-config?' + query, { method: 'DELETE' })
          const result = await response.json()
          send({ type: 'email-config-deleted', id: message.id, error: response.ok ? '' : result.error })
        } catch { send({ type: 'email-config-deleted', id: message.id, error: 'Delete could not be confirmed. Reload before retrying.' }) }
        return
      }
      if (message?.type === 'email-config-save') {
        try {
          const response = await fetch('/api/email-trigger-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message.config) })
          const result = await response.json()
          send({ type: 'email-config-saved', trigger: response.ok ? result.trigger : null, error: response.ok ? '' : result.error })
        } catch { send({ type: 'email-config-saved', error: 'Save could not be confirmed. Reload before retrying.' }) }
        return
      }
      if (message?.type !== 'email-config-render' || !Object.hasOwn(emailReportTemplates, message.report || '') || typeof message.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(message.date)) return
      request?.abort(); request = new AbortController(); const current = request
      const id = message.report as EmailReportId
      const scope = Object.hasOwn(companies, message.scope || '') ? message.scope : 'ALL'
      try {
        let html: string
        if (id === 'daily-sales-report') {
          const response = await fetch('/api/daily-sales-report-alert?' + new URLSearchParams({ date: message.date }), { signal: current.signal, cache: 'no-store' })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Report unavailable')
          html = exportSalesHTML(data as DailySalesReport, scope)
        } else if (id === 'sales-call-audit') {
          const response = await fetch('/api/sales-call-audit/email-data?' + new URLSearchParams({ date: message.date }), { signal: current.signal, cache: 'no-store' })
          const data = await response.json()
          if (!response.ok || !data.success) throw new Error(data.error || 'Report unavailable')
          html = data.html || data.data?.html || ''
          if (!html && data.data) {
            const { renderAuditReportEmail } = await import('@/lib/sales-call-audit-email-render')
            html = renderAuditReportEmail({
              date: data.data.auditDate,
              displayDate: data.data.displayDate,
              metrics: data.data.metrics,
              employees: data.data.employees,
            }).html
          }
        } else if (id === 'ktahv-crr-process-report-alert') {
          const response = await fetch('/api/ktahv-crr-report-alert?' + new URLSearchParams({ date: message.date }), { signal: current.signal, cache: 'no-store' })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Report unavailable')
          const { exportCrrReportHTML } = await import('@/lib/ktahv-crr-report')
          html = exportCrrReportHTML(data, scope)
        } else if (id === 'kserve-lead-lost-alert') {
          const response = await fetch('/api/kserve-alert-preview', { signal: current.signal, cache: 'no-store' })
          html = await response.text()
          if (!response.ok) throw new Error('Preview unavailable')
        } else {
          const response = await fetch('/api/marketing-daily-report?' + new URLSearchParams({ date: message.date }), { signal: current.signal, cache: 'no-store' })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Report unavailable')
          const report = data as ReportData
          const normalizedScope = scope === 'ALL' ? 'all' : scope === 'VILLARAAG' ? 'VILARAAG' : scope
          const expanded = message.details === 'Include source-wise details' ? report.companies.filter(c => normalizedScope === 'all' || c.name === normalizedScope).flatMap(c => [c.name + '-leads', c.name + '-sales']) : []
          html = reportExportHTML(message.date, report, { scope: normalizedScope, expanded })
        }
        if (!current.signal.aborted) send({ type: 'email-config-report', key: message.key, html })
      } catch (error) {
        if (!current.signal.aborted) send({ type: 'email-config-report', key: message.key, error: error instanceof Error ? error.message : 'Unable to load report' })
      }
    }
    window.addEventListener('message', listener)
    if (frame.current && frame.current.srcdoc !== documentHtml) {
      frame.current.srcdoc = documentHtml
    }
    return () => { request?.abort(); window.removeEventListener('message', listener) }
  }, [documentHtml])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <DashboardLayout>
      <iframe
        ref={frame}
        srcDoc={documentHtml}
        title="Email Triggering Config"
        sandbox="allow-scripts allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        scrolling="no"
        style={{
          width: '100%',
          height: `${frameHeight}px`,
          minHeight: 650,
          border: 0,
          overflow: 'hidden',
          display: 'block',
        }}
      />
    </DashboardLayout>
  )
}
