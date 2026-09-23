'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  Send,
  ShieldOff,
  TrendingDown,
} from 'lucide-react'
import styles from './dashboard.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LostLead {
  id: string
  name_of_client: string
  mobile: string
  email_id: string
  subjects: string
  company: string
  data_source: string
  campaign_name: string
  sent_date: string
  days_pending: number
}

interface AggregateRow {
  company: string
  data_source: string
  total_sent: number
  total_received: number
  total_lost: number
  loss_rate: number
}

interface Diagnostics {
  total_sent: number
  total_received: number
  total_lost: number
  first_sent: string | null
  last_sent: string | null
}

interface ApiResponse {
  lostDays: number
  filters: { from: string; to: string; company: string }
  data: LostLead[]
  aggregate: AggregateRow[]
  diagnostics: Diagnostics
  generatedAt: string
  provenance: { database: string; tables: string[]; dateBasis: string; definition: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const num = (n: number) => n.toLocaleString('en-IN')
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
const PAGE_SIZE = 15

function todayIST(): string {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  )
    .toISOString()
    .slice(0, 10)
}

function monthStart(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function quickRange(preset: 'month' | 'previous' | 'week') {
  const today = todayIST()
  const d = new Date(today)
  if (preset === 'month') return { from: monthStart(), to: today }
  if (preset === 'week') {
    const w = new Date(d.getTime() - 6 * 86_400_000)
    return { from: w.toISOString().slice(0, 10), to: today }
  }
  // previous month
  const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  const pmEnd = new Date(d.getFullYear(), d.getMonth(), 0)
  return {
    from: pm.toISOString().slice(0, 10),
    to: pmEnd.toISOString().slice(0, 10),
  }
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function fmtDateTime(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch { return iso }
}

function daysBadgeClass(days: number) {
  if (days >= 14) return styles.daysHigh
  if (days >= 7) return styles.daysMed
  return styles.daysLow
}

// ─── Filter state ─────────────────────────────────────────────────────────────

type Filters = { from: string; to: string; company: string; lostDays: string }

const COMPANIES = ['ALL', 'KTAHV', 'KAPPL', 'VILLARAAG'] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadLostMonitorPage() {
  const [filters, setFilters] = useState<Filters>(() => ({
    ...quickRange('month'),
    company: 'ALL',
    lostDays: '5',
  }))
  const [draft, setDraft] = useState(filters)
  const [refresh, setRefresh] = useState(0)

  const [result, setResult] = useState<{
    key: string
    data?: ApiResponse
    error?: string
    status?: number
  } | null>(null)

  const [groupBy, setGroupBy] = useState<'company' | 'source'>('source')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detailPage, setDetailPage] = useState(1)
  const [detailSearch, setDetailSearch] = useState('')

  const query = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    company: filters.company,
    lost_days: filters.lostDays,
  }).toString()
  const requestKey = query + '&r=' + refresh

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    const timer = setTimeout(() => controller.abort(), 55_000)
    fetch('/api/lead-lost-monitor?' + query, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        const body = await res.json()
        if (!disposed)
          setResult(
            res.ok
              ? { key: requestKey, data: body }
              : { key: requestKey, error: body.error || 'Unable to load report.', status: res.status }
          )
      })
      .catch(() => {
        if (!disposed)
          setResult({
            key: requestKey,
            error: controller.signal.aborted
              ? 'The report took too long to load. Try a shorter date range or refresh.'
              : 'Could not reach the server. Please check your connection and retry.',
          })
      })
      .finally(() => clearTimeout(timer))
    return () => {
      disposed = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, requestKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = result?.key !== requestKey
  const data = !loading ? result?.data : undefined
  const error = !loading ? result?.error : undefined

  // ─── Computed values ────────────────────────────────────────────────────────
  const agg = useMemo(() => data?.aggregate ?? [], [data])
  const detail = useMemo(() => data?.data ?? [], [data])
  const diag = data?.diagnostics

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows =
      groupBy === 'company'
        ? agg.reduce<AggregateRow[]>((acc, r) => {
            const existing = acc.find((x) => x.company === r.company)
            if (existing) {
              existing.total_sent += r.total_sent
              existing.total_received += r.total_received
              existing.total_lost += r.total_lost
              existing.loss_rate = pct(existing.total_lost, existing.total_sent)
            } else {
              acc.push({ ...r, data_source: r.company })
            }
            return acc
          }, [])
        : agg
    return rows.filter((r) =>
      [r.company, r.data_source].some((f) => f.toLowerCase().includes(q))
    )
  }, [agg, groupBy, search])

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = grouped.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const filteredDetail = useMemo(() => {
    const q = detailSearch.trim().toLowerCase()
    return detail.filter(
      (r) =>
        !q ||
        [r.name_of_client, r.mobile, r.data_source, r.company, r.subjects].some((f) =>
          f.toLowerCase().includes(q)
        )
    )
  }, [detail, detailSearch])
  const detailTotalPages = Math.max(1, Math.ceil(filteredDetail.length / PAGE_SIZE))
  const detailCurrentPage = Math.min(detailPage, detailTotalPages)
  const visibleDetail = filteredDetail.slice(
    (detailCurrentPage - 1) * PAGE_SIZE,
    detailCurrentPage * PAGE_SIZE
  )

  const topSources = useMemo(
    () =>
      [...agg]
        .sort((a, b) => b.total_lost - a.total_lost)
        .slice(0, 6),
    [agg]
  )

  const pendingChanges = JSON.stringify(draft) !== JSON.stringify(filters)

  function apply(e: FormEvent) {
    e.preventDefault()
    setFilters(draft)
    setPage(1)
    setDetailPage(1)
    setSearch('')
    setDetailSearch('')
    setRefresh((n) => n + 1)
  }
  function preset(p: 'month' | 'previous' | 'week') {
    const next = { ...draft, ...quickRange(p) }
    setDraft(next)
    setFilters(next)
    setPage(1)
    setDetailPage(1)
    setSearch('')
    setDetailSearch('')
  }

  const scope = filters.company === 'ALL' ? 'All companies' : filters.company

  // ─── Metrics ────────────────────────────────────────────────────────────────
  const metrics = [
    {
      label: 'Lost leads',
      value: diag?.total_lost ?? 0,
      note: `${pct(diag?.total_lost ?? 0, diag?.total_sent ?? 0)}% of leads sent`,
      icon: ShieldOff,
      lost: true,
    },
    {
      label: 'Sent to KServe',
      value: diag?.total_sent ?? 0,
      note: 'Total leads dispatched',
      icon: Send,
    },
    {
      label: 'Received back',
      value: diag?.total_received ?? 0,
      note: `${pct(diag?.total_received ?? 0, diag?.total_sent ?? 0)}% return rate`,
      icon: TrendingDown,
    },
    {
      label: `Older than ${data?.lostDays ?? filters.lostDays}d`,
      value: diag?.total_lost ?? 0,
      note: 'Lost by current threshold',
      icon: Clock,
    },
    {
      label: 'Source groups',
      value: agg.length,
      note: 'Distinct company + source pairs',
      icon: AlertTriangle,
    },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      <div className={styles.shell}>

        {/* Hero */}
        <section className={styles.hero}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <p className={styles.eyebrow} style={{ margin: 0 }}>Lead Management / Quality Control</p>
              <span className={styles.live}>
                <span className={loading ? styles.dot : error ? styles.dotRed : styles.dot} />
                {loading ? 'Updating report' : data ? 'Live SQL · Read only' : 'Report unavailable'}
              </span>
            </div>
            <h1>LeadGuard — Lead Lost Monitor</h1>
            <p>
              Track leads sent to KServe that never returned. Identify drop-off patterns by source,
              company, and time window to recover lost pipeline value.
            </p>
          </div>
          <Link className={styles.live} href="/voicecall/kserve-lead-lost" style={{ textDecoration: 'none', flexShrink: 0 }}>
            KServe Lead Lost <ArrowUpRight size={13} />
          </Link>
        </section>

        {/* Filters */}
        <form className={styles.toolbar} onSubmit={apply}>
          <div className={styles.filterRow}>
            <label className={styles.field}>
              Company
              <select
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              >
                {COMPANIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              From date
              <input
                required
                type="date"
                value={draft.from}
                max={draft.to || todayIST()}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              To date
              <input
                required
                type="date"
                value={draft.to}
                min={draft.from}
                max={todayIST()}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              Lost after (days)
              <input
                type="number"
                min={1}
                max={90}
                value={draft.lostDays}
                onChange={(e) => setDraft({ ...draft, lostDays: e.target.value })}
              />
            </label>
            <button className={styles.apply} type="submit">
              Apply filters
            </button>
          </div>
          <div className={styles.quickRow}>
            <div className={styles.quick}>
              <button type="button" onClick={() => preset('week')}>Last 7 days</button>
              <button type="button" onClick={() => preset('month')}>This month</button>
              <button type="button" onClick={() => preset('previous')}>Last month</button>
            </div>
            <span className={styles.period}>
              {pendingChanges
                ? 'Filter changes not applied'
                : 'Up to 93 days · Lead sent date · IST'}
            </span>
          </div>
        </form>

        {/* Status bar */}
        <div className={styles.status}>
          <span>
            {scope} · {fmtDate(filters.from)} – {fmtDate(filters.to)} · Lost after {filters.lostDays} days
          </span>
          <button
            className={styles.refresh}
            disabled={loading}
            onClick={() => setRefresh((n) => n + 1)}
          >
            <RefreshCw size={12} />
            {loading
              ? 'Loading…'
              : data
              ? 'Updated ' +
                new Date(data.generatedAt).toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                }) +
                ' IST · Refresh'
              : 'Retry'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={styles.error} role="alert">
            {error}{' '}
            {result?.status === 401 && <Link href="/">Sign in to CRM</Link>}
          </div>
        )}
        {loading && <span role="status" className="sr-only">Loading lead lost monitor data</span>}

        {/* KPI Cards */}
        <section className={styles.cards} aria-label="Dashboard summary" aria-busy={loading}>
          {metrics.map((m) => (
            <article
              key={m.label}
              className={`${styles.metric} ${m.lost ? styles.metricLost : ''}`}
            >
              <div className={styles.metricHead}>
                <h2>{m.label}</h2>
                <span className={styles.icon}>
                  <m.icon size={16} />
                </span>
              </div>
              {loading ? (
                <span className={styles.skeleton} />
              ) : (
                <p className={styles.metricValue}>{data ? num(m.value) : '—'}</p>
              )}
              <p className={styles.metricNote}>{m.note}</p>
            </article>
          ))}
        </section>

        {/* Two-column grid */}
        <div className={styles.mainGrid}>
          {/* Top sources by lost leads */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Source breakdown</p>
                <h2>Where leads are being lost</h2>
              </div>
              <span className={`${styles.smallBadge} ${styles.badgeRed}`}>
                Top 6 · By lost count
              </span>
            </div>
            <div className={styles.sourceList}>
              {topSources.map((row, i) => (
                <div className={styles.sourceRow} key={row.data_source + row.company}>
                  <span className={styles.rank}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className={styles.sourceName}>{row.data_source}</div>
                    <div className={styles.sub}>
                      {row.company} · {num(row.total_sent)} sent · {num(row.total_received)} received
                    </div>
                  </div>
                  <div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barRed}
                        style={{ width: pct(row.total_lost, row.total_sent) + '%' }}
                      />
                    </div>
                    <div className={styles.sub} style={{ marginTop: 5 }}>
                      {row.loss_rate}% loss rate
                    </div>
                  </div>
                  <div className={styles.sourceCount}>
                    {num(row.total_lost)}
                    <small>lost</small>
                  </div>
                </div>
              ))}
              {!topSources.length && (
                <div className={styles.empty}>
                  <strong>
                    {loading ? 'Loading source breakdown' : data ? 'No lost leads in this period' : 'Breakdown unavailable'}
                  </strong>
                  {data ? 'Try another date range or company.' : 'The breakdown appears when the report loads.'}
                </div>
              )}
            </div>
          </section>

          {/* KPI summary panel */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Period summary</p>
                <h2>Sent vs Received vs Lost</h2>
              </div>
              <AlertTriangle size={18} color="#b45309" />
            </div>
            <div className={styles.kpiBody}>
              <div className={styles.kpiLine}>
                <span>Total leads sent to KServe</span>
                <strong>{data ? num(diag?.total_sent ?? 0) : '—'}</strong>
              </div>
              <div className={styles.kpiLine}>
                <span>Leads received back from KServe</span>
                <strong>{data ? num(diag?.total_received ?? 0) : '—'}</strong>
              </div>
              <div className={styles.kpiLine}>
                <span>Leads confirmed lost ({filters.lostDays}+ days)</span>
                <strong>{data ? num(diag?.total_lost ?? 0) : '—'}</strong>
              </div>
              <div className={styles.kpiLine}>
                <span>Overall loss rate</span>
                <strong>
                  {data ? pct(diag?.total_lost ?? 0, diag?.total_sent ?? 0) + '%' : '—'}
                </strong>
              </div>
              <div className={styles.kpiLine}>
                <span>Return rate</span>
                <strong>
                  {data ? pct(diag?.total_received ?? 0, diag?.total_sent ?? 0) + '%' : '—'}
                </strong>
              </div>
              <div className={styles.kpiLine}>
                <span>First sent in period</span>
                <strong style={{ fontSize: 11 }}>
                  {data ? (diag?.first_sent ? fmtDateTime(diag.first_sent) : '—') : '—'}
                </strong>
              </div>
              <div className={styles.kpiLine}>
                <span>Last sent in period</span>
                <strong style={{ fontSize: 11 }}>
                  {data ? (diag?.last_sent ? fmtDateTime(diag.last_sent) : '—') : '—'}
                </strong>
              </div>
              <div className={styles.note}>
                A lead is "lost" when it was sent to KServe but no result was received back
                within {data?.lostDays ?? filters.lostDays} days. Data is read-only SQL from{' '}
                <code style={{ fontSize: 10, fontFamily: 'monospace' }}>
                  {data?.provenance?.database ?? 'spalabsdomain_Kairali_CRM_Db'}
                </code>
                .
              </div>
            </div>
          </section>
        </div>

        {/* Aggregate breakdown table */}
        <section className={styles.panel} style={{ marginBottom: 20 }}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Performance detail</p>
              <h2>Lost leads by source &amp; company</h2>
            </div>
            <span className={styles.smallBadge}>
              {data ? num(grouped.length) : '—'} groups
            </span>
          </div>
          <div className={styles.tableTools}>
            <div className={styles.tabs} role="group" aria-label="Group by">
              {(['source', 'company'] as const).map((tab) => (
                <button
                  key={tab}
                  aria-pressed={groupBy === tab}
                  className={groupBy === tab ? styles.active : ''}
                  onClick={() => { setGroupBy(tab); setSearch(''); setPage(1) }}
                >
                  {tab === 'source' ? 'By source' : 'By company'}
                </button>
              ))}
            </div>
            <label className={styles.search}>
              <span className="sr-only">Search breakdown</span>
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder={`Search ${groupBy} or company`}
              />
            </label>
          </div>

          {/* Desktop table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{groupBy === 'source' ? 'Source / Company' : 'Company'}</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Received</th>
                  <th scope="col">Lost</th>
                  <th scope="col">Loss %</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.data_source + '|' + row.company}>
                    <td>
                      <div className={styles.tableName}>
                        {groupBy === 'source' ? row.data_source : row.company}
                      </div>
                      {groupBy === 'source' && (
                        <span className={styles.company}>{row.company}</span>
                      )}
                    </td>
                    <td>{num(row.total_sent)}</td>
                    <td>{num(row.total_received)}</td>
                    <td>
                      <span className={styles.daysBadge + ' ' + (row.total_lost > 50 ? styles.daysHigh : row.total_lost > 10 ? styles.daysMed : styles.daysLow)}>
                        {num(row.total_lost)}
                      </span>
                    </td>
                    <td>{row.loss_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className={styles.mobileList}>
            {visibleRows.map((row) => (
              <article className={styles.mobileRow} key={row.data_source + '|' + row.company}>
                <div className={styles.mobileTitle}>
                  <div>
                    <div className={styles.tableName}>
                      {groupBy === 'source' ? row.data_source : row.company}
                    </div>
                    {groupBy === 'source' && (
                      <span className={styles.company}>{row.company}</span>
                    )}
                  </div>
                  <span className={`${styles.daysBadge} ${styles.daysHigh}`}>{row.loss_rate}%</span>
                </div>
                <div className={styles.mobileStats}>
                  <div><span>SENT</span><strong>{num(row.total_sent)}</strong></div>
                  <div><span>RECEIVED</span><strong>{num(row.total_received)}</strong></div>
                  <div><span>LOST</span><strong>{num(row.total_lost)}</strong></div>
                </div>
              </article>
            ))}
          </div>

          {!visibleRows.length && (
            <div className={styles.empty}>
              <strong>
                {loading ? 'Loading records' : error ? 'Report unavailable' : 'No matching records'}
              </strong>
              {search ? 'Clear the search or choose another grouping.' : 'Choose another period or company.'}
            </div>
          )}
          <div className={styles.pager}>
            <span>
              {grouped.length
                ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, grouped.length)} of ${num(grouped.length)} groups`
                : '0 groups'}
              {' · '}Search applies to this section only
            </span>
            <div className={styles.pageButtons}>
              <button disabled={currentPage === 1} aria-label="Previous page" onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} aria-label="Next page" onClick={() => setPage(currentPage + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Detailed lost-leads table */}
        <section className={styles.panel} style={{ marginBottom: 24 }}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Individual records</p>
              <h2>Lost lead detail</h2>
            </div>
            <span className={`${styles.smallBadge} ${styles.badgeRed}`}>
              {data ? num(filteredDetail.length) : '—'} leads
            </span>
          </div>
          <div className={styles.tableTools}>
            <label className={styles.search}>
              <span className="sr-only">Search lost leads</span>
              <Search size={14} />
              <input
                value={detailSearch}
                onChange={(e) => { setDetailSearch(e.target.value); setDetailPage(1) }}
                placeholder="Search name, mobile, source…"
              />
            </label>
          </div>

          {/* Desktop */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">Company</th>
                  <th scope="col">Source</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Days pending</th>
                  <th scope="col">Subject</th>
                </tr>
              </thead>
              <tbody>
                {visibleDetail.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className={styles.tableName}>{row.name_of_client || '—'}</div>
                      {row.email_id && <span className={styles.company}>{row.email_id}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.mobile || '—'}</td>
                    <td><span className={styles.company}>{row.company}</span></td>
                    <td>{row.data_source || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>{fmtDateTime(row.sent_date)}</td>
                    <td>
                      <span className={`${styles.daysBadge} ${daysBadgeClass(row.days_pending)}`}>
                        {row.days_pending}d
                      </span>
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--muted)' }}>
                      {row.subjects || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className={styles.mobileList}>
            {visibleDetail.map((row) => (
              <article className={styles.mobileRow} key={row.id}>
                <div className={styles.mobileTitle}>
                  <div>
                    <div className={styles.tableName}>{row.name_of_client || '—'}</div>
                    <span className={styles.company}>{row.company} · {row.data_source}</span>
                  </div>
                  <span className={`${styles.daysBadge} ${daysBadgeClass(row.days_pending)}`}>
                    {row.days_pending}d
                  </span>
                </div>
                <div className={styles.mobileStats}>
                  <div><span>MOBILE</span><strong style={{ fontSize: 11 }}>{row.mobile || '—'}</strong></div>
                  <div><span>SENT</span><strong style={{ fontSize: 10 }}>{fmtDateTime(row.sent_date).slice(0, 11)}</strong></div>
                  <div><span>SUBJECT</span><strong style={{ fontSize: 10, fontWeight: 400 }}>{(row.subjects || '—').slice(0, 30)}</strong></div>
                </div>
              </article>
            ))}
          </div>

          {!visibleDetail.length && (
            <div className={styles.empty}>
              <strong>
                {loading ? 'Loading detail records' : error ? 'Report unavailable' : 'No matching records'}
              </strong>
              {detailSearch ? 'Clear the search to see all lost leads.' : 'No lost leads found for this period and company.'}
            </div>
          )}
          <div className={styles.pager}>
            <span>
              {filteredDetail.length
                ? `${(detailCurrentPage - 1) * PAGE_SIZE + 1}–${Math.min(detailCurrentPage * PAGE_SIZE, filteredDetail.length)} of ${num(filteredDetail.length)} records`
                : '0 records'}
              {' · '}Search applies to this section only
            </span>
            <div className={styles.pageButtons}>
              <button disabled={detailCurrentPage === 1} aria-label="Previous page" onClick={() => setDetailPage(detailCurrentPage - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span>{detailCurrentPage} / {detailTotalPages}</span>
              <button disabled={detailCurrentPage === detailTotalPages} aria-label="Next page" onClick={() => setDetailPage(detailCurrentPage + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.foot}>
          <span>
            Data: <strong>ai_voice_leads_sent</strong> ×{' '}
            <strong>ai_voice_leads_received</strong> · Read-only SQL
          </span>
          <span>
            {data
              ? `Generated ${new Date(data.generatedAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                })} IST · ${data.provenance.definition}`
              : 'LeadGuard Lead Lost Monitor · Staging CRM'}
          </span>
        </footer>
      </div>
    </div>
  )
}
