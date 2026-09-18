'use client'
import { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { reportHTML, reportExportHTML, yesterdayIST, displayDate, scopeLabel, validateReportView, type ReportData, type ReportView } from '@/lib/marketing-daily-report'
import { reportJPG, printReport, saveReportFile, copyReportHTML } from '@/lib/marketing-report-browser'

type LiveReport = ReportData & { snapshot?: string; emailEnabled?: boolean }
type ExportDialog = { kind: 'email' | 'whatsapp'; html: string; view: ReportView; subject: string; name: string; snapshot?: string; emailEnabled: boolean }
type ConversionDialog = { company: string; source: string; count?: number; amount?: number; date: string; kind: 'verified' | 'unverified' }
type ConversionDetail = {
  id: string | number
  bookingOrderId: string
  clientName: string
  mobile: string
  email: string
  source: string
  rawSource: string
  salesPerson: string
  amount: number
  status: string
  bookingType: string
  dateTime: string
  nbdCrr: string
  company: string
}

function MarketingDailyReportContent() {
  const searchParams = useSearchParams()
  const qDate = searchParams?.get('date')
  const [date, setDate] = useState(() => (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : yesterdayIST()))
  const [report, setReport] = useState<LiveReport | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)

  const [dialog, setDialog] = useState<ExportDialog | null>(null)
  const [to, setTo] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  // Conversion & Unverified sales pop-up modal state
  const [convDialog, setConvDialog] = useState<ConversionDialog | null>(null)
  const [convItems, setConvItems] = useState<ConversionDetail[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [convError, setConvError] = useState('')
  const [convSearch, setConvSearch] = useState('')
  const [convTotalAmount, setConvTotalAmount] = useState(0)

  const frame = useRef<HTMLIFrameElement>(null)
  const actionBusy = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/marketing-daily-report?date=' + date, { cache: 'no-store', signal: controller.signal })
      .then(async r => {
        const b = await r.json()
        if (!r.ok) throw Error(b.error || 'Report unavailable')
        return b
      })
      .then(b => {
        if (!controller.signal.aborted) setReport(b)
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [date, retry])

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return

      if (event.data?.type === 'marketing-report-date') {
        const next = event.data.date
        if (typeof next === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(next) && next <= yesterdayIST()) {
          setLoading(true)
          setError('')
          setReport(null)
          setDate(next)
          setRetry(n => n + 1)
          setDialog(null)
          setConvDialog(null)
        }
        return
      }

      if (event.data?.type === 'marketing-report-conversion-details') {
        const { company, source, count, amount, date: eventDate, kind: eventKind } = event.data
        const queryDate = eventDate || date
        const kind: 'verified' | 'unverified' = eventKind === 'unverified' ? 'unverified' : 'verified'

        setConvDialog({
          company,
          source,
          count: Number(count) || 0,
          amount: Number(amount) || 0,
          date: queryDate,
          kind,
        })
        setConvLoading(true)
        setConvError('')
        setConvSearch('')
        setConvItems([])
        setConvTotalAmount(0)

        fetch(`/api/marketing-daily-report/conversions?date=${encodeURIComponent(queryDate)}&company=${encodeURIComponent(company)}&source=${encodeURIComponent(source)}&kind=${kind}`)
          .then(async r => {
            const b = await r.json()
            if (!r.ok) throw new Error(b.error || 'Failed to fetch details')
            return b
          })
          .then(b => {
            setConvItems(b.conversions || [])
            setConvTotalAmount(b.totalAmount || 0)
          })
          .catch(e => {
            setConvError(e instanceof Error ? e.message : 'Failed to load details')
          })
          .finally(() => {
            setConvLoading(false)
          })
        return
      }

      if (event.data?.type !== 'marketing-report-export' || !report || actionBusy.current) return
      actionBusy.current = true
      setBusy(true)
      setNotice('')
      try {
        const view = validateReportView(report, event.data.view)
        const html = reportExportHTML(date, report, view)
        const name = 'Marketing-Daily-Report-' + date + '-' + view.scope
        const subject = `Marketing Daily Report | ${displayDate(date)} | ${scopeLabel(report, view.scope)}`
        switch (event.data.action) {
          case 'print':
            await printReport(html)
            break
          case 'jpg':
            setNotice('Preparing JPG…')
            saveReportFile(await reportJPG(html), name + '.jpg')
            setNotice('JPG downloaded')
            break
          case 'download':
            saveReportFile(new Blob([html], { type: 'text/html' }), name + '.html')
            setNotice('Report downloaded')
            break
          case 'email':
          case 'whatsapp':
            setDialog({
              kind: event.data.action,
              html,
              view,
              subject,
              name,
              snapshot: report.snapshot,
              emailEnabled: !!report.emailEnabled,
            })
            setTo('')
            setSent(false)
            break
        }
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Export unavailable')
      } finally {
        actionBusy.current = false
        setBusy(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [date, report])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (convDialog) {
          setConvDialog(null)
        } else if (dialog && !busy) {
          setDialog(null)
        }
      }
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [busy, convDialog, dialog])

  async function send() {
    if (!dialog || !to.trim() || busy || sent) return
    setBusy(true)
    setNotice('Sending email…')
    try {
      const response = await fetch('/api/marketing-daily-report/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, snapshot: dialog.snapshot, view: dialog.view }),
      })
      const body = await response.json()
      if (!response.ok) throw Error(body.error || 'Unable to send email')
      setSent(true)
      setNotice('Email submitted successfully to the listed recipients.')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Delivery could not be confirmed')
    } finally {
      setBusy(false)
    }
  }

  async function image(share = false) {
    if (!dialog || busy) return
    setBusy(true)
    setNotice('Preparing image…')
    try {
      const file = new File([await reportJPG(dialog.html)], dialog.name + '.jpg', { type: 'image/jpeg' })
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: dialog.subject })
        setNotice('Share sheet opened')
      } else {
        saveReportFile(file, file.name)
        setNotice(share ? 'JPG downloaded. Attach it in WhatsApp.' : 'JPG downloaded')
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Image unavailable')
    } finally {
      setBusy(false)
    }
  }

  const filteredConvItems = useMemo(() => {
    if (!convSearch.trim()) return convItems
    const q = convSearch.toLowerCase().trim()
    return convItems.filter(item =>
      item.clientName.toLowerCase().includes(q) ||
      item.bookingOrderId.toLowerCase().includes(q) ||
      item.mobile.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.salesPerson.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.bookingType.toLowerCase().includes(q)
    )
  }, [convItems, convSearch])

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[400px]" role="status">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading marketing report…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-sm border border-red-100 max-w-xl mx-auto mt-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Marketing Daily Report</h1>
        <p className="text-red-600 mb-4" role="alert">{error}</p>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          onClick={() => {
            setLoading(true)
            setError('')
            setReport(null)
            setRetry(n => n + 1)
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <iframe
        ref={frame}
        title="Marketing Daily Report"
        srcDoc={report ? reportHTML(date, report) : ''}
        sandbox="allow-scripts"
        className="block w-full border-0 rounded-xl shadow-sm bg-white"
        style={{ height: 'calc(100vh - 120px)', minHeight: '750px' }}
      />

      {notice && !dialog && (
        <p role="status" className="fixed bottom-5 right-5 z-50 rounded-lg bg-white p-4 text-sm shadow-lg border border-gray-100">
          {notice}
        </p>
      )}

      {/* Export Dialog (Email / WhatsApp) */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <section role="dialog" aria-modal="true" aria-labelledby="export-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id="export-title" className="text-xl font-semibold">
                  {dialog.kind === 'email' ? 'Email template' : 'WhatsApp report'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{dialog.subject}</p>
                <p className="mt-1 text-xs text-gray-500">Includes only the source sections you expanded. This preview is the exact export.</p>
              </div>
              <button
                disabled={busy}
                onClick={() => {
                  setDialog(null)
                  setNotice('')
                }}
                className="rounded border px-3 py-2"
              >
                Close
              </button>
            </header>
            <iframe title="Export preview" srcDoc={dialog.html} sandbox="" className="my-4 min-h-0 w-full flex-1 border" style={{ height: '55vh' }} />
            {dialog.kind === 'email' && (
              <label className="mb-3 text-sm font-medium">
                To{' '}
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Enter recipient email addresses, separated by commas"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  disabled={busy || sent}
                  className="mt-1 block w-full rounded-lg border p-3"
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {dialog.kind === 'email' ? (
                <>
                  <button
                    disabled={busy}
                    className="rounded-lg border px-4 py-2"
                    onClick={async () => {
                      try {
                        await copyReportHTML(dialog.html)
                        setNotice('Formatted email copied. Paste into your email composer.')
                      } catch {
                        setNotice('Clipboard unavailable. Download the HTML template and copy it from your browser.')
                      }
                    }}
                  >
                    Copy formatted email
                  </button>
                  <button
                    disabled={busy}
                    className="rounded-lg border px-4 py-2"
                    onClick={() => saveReportFile(new Blob([dialog.html], { type: 'text/html' }), dialog.name + '.html')}
                  >
                    Download email HTML
                  </button>
                  <button
                    disabled={!dialog.emailEnabled || !dialog.snapshot || !to.trim() || busy || sent}
                    onClick={send}
                    className="rounded-lg bg-emerald-900 px-5 py-2 text-white disabled:opacity-40"
                  >
                    {sent ? 'Sent' : busy ? 'Please wait…' : 'Send email'}
                  </button>
                </>
              ) : (
                <>
                  <button disabled={busy} className="rounded-lg bg-emerald-900 px-4 py-2 text-white" onClick={() => image(true)}>
                    Share image
                  </button>
                  <button disabled={busy} className="rounded-lg border px-4 py-2" onClick={() => image()}>
                    Download JPG
                  </button>
                  <button
                    disabled={busy}
                    className="rounded-lg border px-4 py-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(dialog.subject + '\nPlease see the attached marketing report.')
                        setNotice('Caption copied')
                      } catch {
                        setNotice('Clipboard unavailable')
                      }
                    }}
                  >
                    Copy caption
                  </button>
                </>
              )}
            </div>
            {dialog.kind === 'email' && !dialog.emailEnabled && (
              <p className="mt-2 text-xs text-gray-600">Email sending is unavailable for this account or server. Copy or download the formatted template.</p>
            )}
            <p role="status" className="mt-3 text-sm text-emerald-800">
              {notice}
            </p>
          </section>
        </div>
      )}

      {/* Conversion & Unverified Sales Details Pop-up Modal */}
      {convDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => {
            if (e.target === e.currentTarget) setConvDialog(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="conversion-modal-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
          >
            {/* Modal Header */}
            <header
              className={`flex items-center justify-between border-b border-gray-100 px-6 py-4 text-white ${
                convDialog.kind === 'unverified'
                  ? 'bg-gradient-to-r from-slate-900 via-stone-900 to-amber-950'
                  : 'bg-gradient-to-r from-slate-900 to-indigo-950'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-sm ${
                      convDialog.kind === 'unverified'
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-indigo-500/30 text-indigo-300'
                    }`}
                  >
                    {convDialog.kind === 'unverified' ? '⏳' : '↗'}
                  </span>
                  <h2 id="conversion-modal-title" className="text-lg font-semibold tracking-wide">
                    {convDialog.kind === 'unverified' ? 'Unverified Sales Details' : 'Conversion Details'}
                  </h2>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    {convDialog.company}
                  </span>
                  <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-200 border border-indigo-500/30">
                    {convDialog.source}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      convDialog.kind === 'unverified'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {convDialog.kind === 'unverified' ? 'Unverified' : 'Verified'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {displayDate(convDialog.date)} · Showing {convDialog.kind === 'unverified' ? 'unverified sales' : 'verified conversions'} for {convDialog.source}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Records</p>
                    <p className="text-sm font-bold text-emerald-400">{convItems.length}</p>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {convDialog.kind === 'unverified' ? 'Unverified Value' : 'Verified Value'}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        convDialog.kind === 'unverified' ? 'text-amber-400' : 'text-emerald-300'
                      }`}
                    >
                      ₹{convTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConvDialog(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </header>

            {/* Filter / Search Bar */}
            <div className="border-b border-gray-100 bg-slate-50 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <input
                  type="text"
                  placeholder="Search by client, booking ID, phone, agent..."
                  value={convSearch}
                  onChange={e => setConvSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {convSearch && (
                  <button
                    onClick={() => setConvSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{filteredConvItems.length}</span> of <span className="font-semibold text-gray-700">{convItems.length}</span> record{convItems.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Body / Table */}
            <div className="flex-1 overflow-auto p-6 min-h-[220px]">
              {convLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-3" />
                  <p className="text-sm font-medium text-gray-600">
                    Loading {convDialog.kind === 'unverified' ? 'unverified sales' : 'conversion'} details…
                  </p>
                </div>
              ) : convError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-sm font-medium text-red-800">{convError}</p>
                  <button
                    onClick={() => {
                      setConvLoading(true)
                      setConvError('')
                      fetch(`/api/marketing-daily-report/conversions?date=${encodeURIComponent(convDialog.date)}&company=${encodeURIComponent(convDialog.company)}&source=${encodeURIComponent(convDialog.source)}&kind=${convDialog.kind}`)
                        .then(async r => {
                          const b = await r.json()
                          if (!r.ok) throw new Error(b.error || 'Failed')
                          return b
                        })
                        .then(b => {
                          setConvItems(b.conversions || [])
                          setConvTotalAmount(b.totalAmount || 0)
                        })
                        .catch(e => setConvError(e.message))
                        .finally(() => setConvLoading(false))
                    }}
                    className="mt-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredConvItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <div className="mb-2 text-3xl">📋</div>
                  <p className="text-sm font-medium text-gray-700">No {convDialog.kind === 'unverified' ? 'unverified sales' : 'conversion'} records found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {convSearch ? 'Try adjusting your search query' : 'No records recorded for this selection'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                    <thead className="bg-gray-50 font-semibold text-gray-600">
                      <tr>
                        <th className="px-3.5 py-2.5">Booking / Order ID</th>
                        <th className="px-3.5 py-2.5">Client Name</th>
                        <th className="px-3.5 py-2.5">Contact Info</th>
                        <th className="px-3.5 py-2.5">Source</th>
                        <th className="px-3.5 py-2.5">Handled By</th>
                        <th className="px-3.5 py-2.5 text-right">
                          {convDialog.kind === 'unverified' ? 'Unverified Amount' : 'Verified Amount'}
                        </th>
                        <th className="px-3.5 py-2.5 text-center">Status</th>
                        <th className="px-3.5 py-2.5">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredConvItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="whitespace-nowrap px-3.5 py-3 font-mono font-semibold text-indigo-700">
                            {item.bookingOrderId}
                            {item.nbdCrr && item.nbdCrr !== '—' && (
                              <span className="ml-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-sans font-medium text-slate-600">
                                {item.nbdCrr}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-medium text-gray-900">
                            {item.clientName}
                            {item.bookingType && item.bookingType !== '—' && (
                              <p className="text-[10px] text-gray-500 font-normal">{item.bookingType}</p>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-gray-600">
                            <div>{item.mobile}</div>
                            {item.email && item.email !== '—' && (
                              <div className="text-[11px] text-gray-400">{item.email}</div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-gray-700">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium">
                              {item.source}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-gray-700">{item.salesPerson}</td>
                          <td
                            className={`whitespace-nowrap px-3.5 py-3 text-right font-semibold tabular-nums ${
                              convDialog.kind === 'unverified' ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                                convDialog.kind === 'unverified'
                                  ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                  : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-3 text-gray-500 text-[11px]">
                            {item.dateTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3 flex-wrap gap-2">
              <p className="text-xs text-gray-500">
                Amounts in INR · Recorded under <span className="font-semibold text-gray-700">{convDialog.company}</span> ({convDialog.source}) ·{' '}
                <span className="font-medium text-gray-600">
                  {convDialog.kind === 'unverified' ? 'Pending verification' : 'Verified & Confirmed'}
                </span>
              </p>
              <button
                onClick={() => setConvDialog(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}

export default function MarketingDailyReport() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading daily report…</div>}>
      <MarketingDailyReportContent />
    </Suspense>
  )
}
