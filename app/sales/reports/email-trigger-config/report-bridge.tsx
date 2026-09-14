'use client'
import { useEffect, useRef } from 'react'
import { companies, exportSalesHTML, type DailySalesReport } from '@/lib/daily-sales-report'
import { reportExportHTML, type ReportData } from '@/lib/marketing-daily-report'
import { emailReportTemplates, type EmailReportId } from '@/lib/email-report-template'

export default function EmailConfigBridge({ document }: { document: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    let request: AbortController | undefined
    let initializing = false
    function send(data: object) { frame.current?.contentWindow?.postMessage(data, '*') }
    const listener = async (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null') return
      const message = event.data
      if (message?.type === 'email-config-ready') {
        if (initializing) return
        initializing = true
        const query = new URLSearchParams(window.location.search)
        const report = query.get('report') || ''
        try {
          const response = await fetch('/api/email-trigger-config', { cache: 'no-store' })
          const state = await response.json()
          send({ type: 'email-config-init', report: Object.hasOwn(emailReportTemplates, report) ? report : 'daily-sales-report', autoCreate: Object.hasOwn(emailReportTemplates, report), scope: query.get('scope') || 'ALL', date: query.get('date') || '', state: response.ok ? state : null, error: response.ok ? '' : state.error })
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
        const endpoint = id === 'daily-sales-report' ? '/api/daily-sales-report-alert' : '/api/marketing-daily-report'
        const response = await fetch(endpoint + '?' + new URLSearchParams({ date: message.date }), { signal: current.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Report unavailable')
        let html: string
        if (id === 'daily-sales-report') html = exportSalesHTML(data as DailySalesReport, scope)
        else {
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
    if (frame.current) frame.current.srcdoc = document
    return () => { request?.abort(); window.removeEventListener('message', listener) }
  }, [document])
  return <iframe ref={frame} title="Email Triggering Config" sandbox="allow-scripts allow-forms" style={{ width: '100%', height: 'calc(100vh - 90px)', minHeight: 700, border: 0 }} />
}
