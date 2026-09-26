"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, Clock3,
  RefreshCw, Users, BarChart2,
} from "lucide-react"
import styles from "./page.module.css"

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string; key: string; name: string; business: string; source: string
  age: string; lastAction: string; nextAction: string; due: string
  owner: string; status: "Overdue" | "Due today" | "Upcoming" | "Needs review"
  overdueMs: number
  note?: string; sourceSpreadsheetId: string; sourceRow: number
  occurrenceCount: number; transferWritable?: boolean
}
type Staff = { name: string; available: boolean; workload: number }
type Snapshot = {
  leads: Lead[]; staff: Staff[]; failures: string[]; capturedAt: string
  sourceCount: number; pendingRawCount: number; duplicateCount: number
  transferAccessMissingCount: number; complete: boolean; canEdit: boolean
  recentChanges: string[]; startedAt: string | null
}
type DialerCounts = { domestic: number | null; international: number | null; capturedAt: string | null; source: string }
type Filter = "All leads" | "Unassigned" | "Overdue" | "Exceptions"

// Sentinel value for "No change / keep same owner" option
const NO_CHANGE_SENTINEL = "__no_change__"

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleStaff: Staff[] = ["Pushpanshu Kumar", "Pawan Kamra", "Harpal Singh", "Zaki Ahmed"].map((name) => ({
  name, available: true, workload: 0,
}))
const sampleLeads: Lead[] = [
  { id: "DEMO-101", key: "demo-101", name: "Sample lead A", business: "KTAHV", source: "AppSheet", age: "2 days", lastAction: "Status: Warm", nextAction: "Complete planned call", due: "25 Sep 2026, 09:30 am", owner: "Harpal Singh", status: "Overdue", overdueMs: 5400000, sourceSpreadsheetId: "", sourceRow: 7, occurrenceCount: 1 },
  { id: "DEMO-102", key: "demo-102", name: "Sample lead B", business: "Villa Raag", source: "AppSheet", age: "1 day", lastAction: "No completed action recorded", nextAction: "Complete planned call", due: "25 Sep 2026, 10:00 am", owner: "", status: "Needs review", overdueMs: 0, note: "Unassigned", sourceSpreadsheetId: "", sourceRow: 8, occurrenceCount: 1 },
  { id: "DEMO-103", key: "demo-103", name: "Sample lead C", business: "KAPPL", source: "AppSheet", age: "3 days", lastAction: "Status: Follow-up", nextAction: "Complete planned call", due: "25 Sep 2026, 11:00 am", owner: "Zaki Ahmed", status: "Due today", overdueMs: 0, note: "Repeated ID; counted once", sourceSpreadsheetId: "", sourceRow: 9, occurrenceCount: 2 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format milliseconds as "Xh Ym" or "Xm" */
function formatOverdue(ms: number): string {
  if (ms <= 0) return ""
  const totalMin = Math.floor(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MorningLeadAllocationPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [filter, setFilter] = useState<Filter>("All leads")
  const [selectedStaff, setSelectedStaff] = useState("")
  const [changes, setChanges] = useState<string[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [demo, setDemo] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [dialer, setDialer] = useState<DialerCounts | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<{ lead: Lead; owner: string } | null>(null)
  const [transferReason, setTransferReason] = useState("")
  const [demoStart, setDemoStart] = useState<string | null>(null)
  const [clock, setClock] = useState(Date.now())
  const [confirmedElapsed, setConfirmedElapsed] = useState<number | null>(null)
  // Background save queue: keys that are being saved in background
  const bgSaving = useRef(new Set<string>())

  // ── Data loading ────────────────────────────────────────────────────────────

  const reload = useCallback(async (preserveError = false) => {
    setLoading(true)
    if (!preserveError) setError("")
    setDemo(false)
    const [queueResult, dialerResult] = await Promise.allSettled([
      fetch("/api/morning-lead-allocation", { cache: "no-store" }),
      fetch("/api/morning-lead-allocation/dialer-counts", { cache: "no-store" }),
    ])
    if (dialerResult.status === "fulfilled" && dialerResult.value.ok) {
      setDialer(await dialerResult.value.json().catch(() => null))
    } else {
      setDialer(null)
    }
    try {
      if (queueResult.status === "rejected") throw queueResult.reason
      const response = queueResult.value
      const data = await response.json()
      if (!response.ok) throw Error(data.error || "Live queue unavailable")
      const result = data as Snapshot
      setSnapshot(result)
      setLeads(result.leads)
      setStaff(result.staff)
      setChanges(result.recentChanges || [])
      setSelectedStaff((current) =>
        result.staff.some((p) => p.name === current) ? current : result.staff[0]?.name || "",
      )
    } catch (cause) {
      setSnapshot(null); setLeads([]); setStaff([]); setChanges([])
      setError(cause instanceof Error ? cause.message : "Live queue unavailable")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => void reload())
    return () => cancelAnimationFrame(frame)
  }, [reload])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // ── Derived state ────────────────────────────────────────────────────────────

  const unassigned = leads.filter((l) => !l.owner).length
  const overdue = leads.filter((l) => l.status === "Overdue").length
  const hasQueue = demo || !!snapshot
  const unavailableOwner = staff.some((p) => !p.available && leads.some((l) => l.owner === p.name))
  const exceptions = leads.filter(
    (l) => !l.owner || l.note || staff.some((p) => p.name === l.owner && !p.available),
  ).length
  const visible = leads.filter((l) =>
    filter === "All leads" ||
    (filter === "Unassigned" && !l.owner) ||
    (filter === "Overdue" && l.status === "Overdue") ||
    (filter === "Exceptions" && (!l.owner || !!l.note || staff.some((p) => p.name === l.owner && !p.available))),
  )

  const refreshed = snapshot?.capturedAt
    ? new Date(snapshot.capturedAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—"
  const dialerRefreshed = dialer?.capturedAt
    ? new Date(dialer.capturedAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "unavailable"
  const startedAt = demo ? demoStart : snapshot?.startedAt
  const elapsed = startedAt ? Math.max(0, Math.floor((clock - new Date(startedAt).getTime()) / 1000)) : null
  const displayElapsed = confirmed && confirmedElapsed !== null ? confirmedElapsed : elapsed

  // Snapshot section: per-owner assignment counts from current leads
  const ownerStats = staff.map((p) => ({
    name: p.name,
    available: p.available,
    count: leads.filter((l) => l.owner === p.name).length,
    received: changes.filter((c) => c.includes(`→ ${p.name}`)).length,
  })).filter((o) => o.count > 0 || o.received > 0)

  // ── Sample mode ──────────────────────────────────────────────────────────────

  function showDemo() {
    setDemo(true); setLeads(sampleLeads); setStaff(sampleStaff)
    setSelectedStaff(sampleStaff[0].name); setChanges([])
    setConfirmed(false); setConfirmedElapsed(null); setDemoStart(null)
    setPendingTransfer(null); setNotice("")
  }

  // ── Save helpers ─────────────────────────────────────────────────────────────

  async function save(
    action: Record<string, string>,
  ): Promise<{ durationSeconds?: number | null; savedAt?: string } | null> {
    setSaving(true); setError("")
    try {
      const response = await fetch("/api/morning-lead-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.error || "Could not save")
      return data
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save")
      return null
    } finally {
      setSaving(false)
    }
  }

  /** Background save — removes a lead optimistically before the API responds */
  async function backgroundSave(
    leadKey: string,
    action: Record<string, string>,
    onSuccess?: (savedAt: string) => void,
    onError?: (msg: string) => void,
  ) {
    if (bgSaving.current.has(leadKey)) return
    bgSaving.current.add(leadKey)
    try {
      const response = await fetch("/api/morning-lead-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      })
      const data = await response.json()
      if (!response.ok) {
        const msg = data.error || "Background save failed"
        onError?.(msg)
        setError(msg)
      } else {
        onSuccess?.(data.savedAt || "")
      }
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Background save failed"
      onError?.(msg)
      setError(msg)
    } finally {
      bgSaving.current.delete(leadKey)
    }
  }

  // ── Owner change / transfer ──────────────────────────────────────────────────

  function changeOwner(lead: Lead, owner: string) {
    if (owner === lead.owner) return

    // "No change / keep same owner" sentinel — verify without sheet write
    if (owner === NO_CHANGE_SENTINEL) {
      // Optimistic: remove from queue immediately
      setLeads((current) => current.filter((l) => l.key !== lead.key))
      setNotice(`${lead.id}: verified — owner unchanged (${lead.owner || "Unassigned"}). No sheet was modified.`)
      if (!demo) {
        // Background log to allocation log
        void backgroundSave(
          lead.key,
          { action: "VERIFIED_NO_CHANGE", key: lead.key },
          () => {},
          (msg) => {
            // Roll back if it fails
            setLeads((current) => [lead, ...current])
            setError(`Verification log failed: ${msg}`)
            setNotice("")
          },
        )
      }
      return
    }

    setPendingTransfer({ lead, owner })
    setTransferReason(lead.status === "Overdue" ? "Overdue lead" : "")
  }

  async function submitTransfer() {
    if (!pendingTransfer || !transferReason.trim()) return
    const { lead, owner } = pendingTransfer

    // --- OPTIMISTIC: close modal and remove lead immediately ---
    setPendingTransfer(null)
    setConfirmed(false); setConfirmedElapsed(null)

    if (demo) {
      setLeads((current) => current.filter((l) => l.key !== lead.key))
      setChanges((current) => [`${lead.id}: ${lead.owner || "Unassigned"} → ${owner} · sample only`, ...current])
      setNotice("Sample transfer shown. No Google Sheet was changed.")
      return
    }

    // Optimistic UI update — remove from queue immediately
    setLeads((current) => current.filter((l) => l.key !== lead.key))
    const tempNotice = `Saving transfer for ${owner}… (you can continue working)`
    setNotice(tempNotice)

    // Background save — user can work on next record in parallel
    const savedReason = transferReason.trim()
    void backgroundSave(
      lead.key,
      { action: "OWNER_CHANGE", key: lead.key, previousOwner: lead.owner, newOwner: owner, reason: savedReason },
      (savedAt) => {
        const time = savedAt
          ? new Date(savedAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
          : "time unavailable"
        setChanges((current) => [`${lead.id}: ${lead.owner || "Unassigned"} → ${owner} · ${time} IST`, ...current])
        setNotice(`✓ Transfer saved for ${owner} at ${time} IST.`)
      },
      (msg) => {
        // Roll back: put the lead back at the front of the list
        setLeads((current) => [lead, ...current])
        setError(`Transfer failed: ${msg}`)
        setNotice("")
      },
    )
  }

  // ── Availability / start / confirm ──────────────────────────────────────────

  async function toggleAvailability(person: Staff) {
    if (demo) {
      setStaff((current) => current.map((p) => p.name === person.name ? { ...p, available: !p.available } : p))
      return
    }
    if (await save({ action: "AVAILABILITY", key: person.name, availability: person.available ? "unavailable" : "available" })) {
      await reload(); setNotice("Availability saved in the master Sheet log.")
    }
  }

  async function startCheck() {
    setConfirmedElapsed(null)
    if (demo) { setDemoStart(new Date().toISOString()); return }
    if (await save({ action: "START" })) { await reload(); setNotice("Morning check start time saved.") }
  }

  async function confirm() {
    if (demo) { setConfirmed(true); setConfirmedElapsed(elapsed); return }
    const result = await save({ action: "CONFIRM" })
    if (result) {
      setConfirmed(true); setConfirmedElapsed(result.durationSeconds ?? null)
      setNotice(`Today's allocation and ${leads.length} work-list rows saved. Time: ${result.durationSeconds ?? "—"}s.`)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <main className={styles.shell}>
        {/* Top nav */}
        <div className={styles.topline}>
          <Link href="/leads/assign" className={styles.back}><ArrowLeft size={16} /> Lead Management</Link>
          <span className={styles.demoBadge}>{demo ? "SAMPLE PREVIEW · NOTHING SAVED" : "APPSHEET LIVE QUEUE"}</span>
        </div>

        {/* Hero */}
        <header className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>KAIRALI CRM / DAILY OPERATIONS</div>
            <h1>Morning lead allocation</h1>
            <p>Review pending AppSheet work, resolve owner exceptions and confirm today&apos;s list.</p>
            <p className={styles.timer}>
              Morning check:{" "}
              {displayElapsed === null
                ? "Not started"
                : `${Math.floor(displayElapsed / 60)}m ${String(displayElapsed % 60).padStart(2, "0")}s`}
            </p>
          </div>
          <div className={styles.heroActions}>
            <button type="button" className={styles.secondary} onClick={() => void reload()} disabled={loading || saving}>
              <RefreshCw size={16} /> Refresh live
            </button>
            <button
              type="button" className={styles.secondary}
              disabled={loading || saving || !!startedAt || (!demo && (!snapshot?.complete || !snapshot?.canEdit))}
              onClick={() => void startCheck()}
            >
              <Clock3 size={16} /> Start check
            </button>
            <button
              type="button" className={styles.primary}
              disabled={loading || saving || !leads.length || !startedAt || unassigned > 0 || unavailableOwner || (!demo && (!snapshot?.complete || !snapshot?.canEdit))}
              onClick={() => void confirm()}
            >
              <Check size={17} />{confirmed ? "List confirmed" : "Confirm today's list"}
            </button>
          </div>
        </header>

        {/* Notice / warning banner */}
        {(error || loading || demo || (snapshot && !snapshot.complete) || !!snapshot?.transferAccessMissingCount) && (
          <section className={styles.notice} role="status">
            <CircleAlert size={18} />
            <div>
              <strong>
                {loading ? "Loading employee sheets…" : demo ? "Sample preview only." : error ? "Action needs attention." : snapshot && !snapshot.complete ? "Some sources could not be read." : "Owner transfers are locked."}
              </strong>{" "}
              {error || (demo
                ? "Actions here are not saved. Use Refresh live when Sheet access is ready."
                : snapshot?.failures.length
                  ? `Missing sources: ${snapshot.failures.join(", ")}. Confirmation is disabled.`
                  : snapshot?.transferAccessMissingCount
                    ? `CRM service account needs Editor access to ${snapshot.transferAccessMissingCount} employee Main sheet(s) before it can write L, Q, T and V.`
                    : ""
              )}{" "}
              {!loading && error && !snapshot && (
                <button type="button" className={styles.inlineButton} onClick={showDemo}>View sample layout</button>
              )}
            </div>
          </section>
        )}

        {notice && <p className={styles.success} role="status">{notice}</p>}

        {/* Stats */}
        <section className={styles.stats} aria-label="Queue totals">
          <div className={styles.stat}>
            <span>Unique pending leads</span>
            <strong>{!hasQueue ? "—" : snapshot && !snapshot.complete ? `${leads.length}+` : leads.length}</strong>
            <small>AppSheet · repeated IDs counted once</small>
          </div>
          <div className={styles.stat}>
            <span>Unassigned</span>
            <strong>{!hasQueue ? "—" : unassigned}</strong>
            <small>Choose an available owner</small>
          </div>
          <div className={styles.stat}>
            <span>Overdue</span>
            <strong>{!hasQueue ? "—" : overdue}</strong>
            <small>Review these first</small>
          </div>
          <div className={styles.stat}>
            <span>Exceptions</span>
            <strong>{!hasQueue ? "—" : exceptions}</strong>
            <small>Owner and data issues</small>
          </div>
        </section>

        {/* Main content grid */}
        <div className={styles.columns}>
          <div className={styles.mainColumn}>

            {/* Pending queue table */}
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <h2>Pending queue</h2>
                  <p>AppSheet updated {refreshed} IST · {snapshot?.sourceCount || 0} employee sheets</p>
                </div>
                <div className={styles.sourcePills}>
                  <span>International dialer <b>{dialer?.international?.toLocaleString("en-IN") ?? "—"}</b></span>
                  <span>Domestic dialer <b>{dialer?.domestic?.toLocaleString("en-IN") ?? "—"}</b></span>
                  <span>AppSheet <b>{demo ? leads.length : snapshot?.pendingRawCount ?? "—"}</b></span>
                </div>
              </div>
              <div className={styles.sourceNote}>
                Dialer: counts only, from {dialer?.source || "unavailable"} (read {dialerRefreshed} IST).
                Logged-in ready staff receive calls automatically; Pushpanshu does not assign dialer calls here.
                AppSheet pending = Main has Planned filled and Actual blank, excluding rows marked Transfer.
                {snapshot && ` ${snapshot.duplicateCount} repeated AppSheet ID(s) removed.`}
              </div>
              <div className={styles.tabs} role="group" aria-label="Filter leads">
                {(["All leads", "Unassigned", "Overdue", "Exceptions"] as Filter[]).map((item) => (
                  <button key={item} type="button" className={filter === item ? styles.activeTab : ""} onClick={() => setFilter(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Lead / source</th>
                      <th>Business &amp; age</th>
                      <th>Last status</th>
                      <th>Next action / due</th>
                      <th>Owner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((lead) => (
                      <tr key={lead.key}>
                        <td>
                          <strong>{lead.name}</strong>
                          <small>{lead.id} · {lead.source}</small>
                          {!demo && lead.sourceSpreadsheetId && (
                            <a
                              className={styles.sourceLink}
                              href={`https://docs.google.com/spreadsheets/d/${lead.sourceSpreadsheetId}/edit#gid=93793889&range=A${lead.sourceRow}`}
                              target="_blank" rel="noreferrer"
                            >
                              Open source row
                            </a>
                          )}
                          {lead.occurrenceCount > 1 && <em>{lead.occurrenceCount} rows · 1 lead</em>}
                        </td>
                        <td>
                          <strong>{lead.business}</strong>
                          <small>{lead.age} old</small>
                        </td>
                        <td>{lead.lastAction}</td>
                        <td>
                          <strong>{lead.nextAction}</strong>
                          <small><Clock3 size={12} /> {lead.due} IST</small>
                        </td>
                        <td>
                          <select
                            aria-label={`Owner for ${lead.id}`}
                            value={lead.owner || ""}
                            disabled={saving || (!demo && (!snapshot?.canEdit || !snapshot?.complete || !lead.transferWritable))}
                            onChange={(e) => changeOwner(lead, e.target.value)}
                          >
                            <option value="">Select owner</option>
                            {/* "No change / keep same owner" — audit only, no sheet write */}
                            <option value={NO_CHANGE_SENTINEL}>✓ No change — keep same owner</option>
                            {staff.map((person) => (
                              <option key={person.name} value={person.name} disabled={!person.available}>
                                {person.name}{person.available ? "" : " (unavailable)"}
                              </option>
                            ))}
                          </select>
                          {lead.note && <small className={styles.rowNote}>{lead.note}</small>}
                          {!demo && !lead.transferWritable && (
                            <small className={styles.rowNote}>
                              {lead.occurrenceCount > 1 ? "Resolve duplicate rows before transfer" : "Transfer locked: source sheet is view-only"}
                            </small>
                          )}
                          {staff.some((p) => p.name === lead.owner && !p.available) && (
                            <small className={styles.rowNote}>Owner unavailable</small>
                          )}
                        </td>
                        <td>
                          {lead.status === "Overdue" ? (
                            <span className={`${styles.status} ${styles.late}`}>
                              Overdue
                              {lead.overdueMs > 0 && (
                                <span className={styles.overdueDuration}>{formatOverdue(lead.overdueMs)}</span>
                              )}
                            </span>
                          ) : (
                            <span className={`${styles.status} ${lead.status === "Needs review" ? styles.review : styles.today}`}>
                              {lead.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && visible.length === 0 && (
                  <p className={styles.empty}>
                    {error ? "Live queue unavailable. Use the source sheets manually." : "No leads in this view."}
                  </p>
                )}
              </div>
            </section>

            {/* Each person's work list — columns A–M */}
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <h2>Each person&apos;s work list</h2>
                  <p>Today&apos;s assigned AppSheet calls — columns A to M</p>
                </div>
                <select
                  aria-label="Select staff work list"
                  className={styles.staffSelect}
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                >
                  {staff.map((person) => <option key={person.name}>{person.name}</option>)}
                </select>
              </div>
              <div className={styles.workListTable}>
                <table>
                  <thead>
                    <tr>
                      <th>A · Due time</th>
                      <th>B · Lead ID</th>
                      <th>C · Lead name</th>
                      <th>D · Business</th>
                      <th>E · Status</th>
                      <th>F · Source</th>
                      <th>G · Age</th>
                      <th>H · Last action</th>
                      <th>I · Next action</th>
                      <th>J · Owner</th>
                      <th>K · Note</th>
                      <th>L · Source row</th>
                      <th>M · Sheet link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads
                      .filter((l) => l.owner === selectedStaff)
                      .map((lead) => (
                        <tr key={lead.key}>
                          <td>{lead.due}</td>
                          <td><code>{lead.id}</code></td>
                          <td><strong>{lead.name}</strong></td>
                          <td>{lead.business}</td>
                          <td>
                            <span className={`${styles.status} ${lead.status === "Overdue" ? styles.late : lead.status === "Needs review" ? styles.review : styles.today}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td>{lead.source}</td>
                          <td>{lead.age}</td>
                          <td>{lead.lastAction}</td>
                          <td>{lead.nextAction}</td>
                          <td>{lead.owner}</td>
                          <td>{lead.note || "—"}</td>
                          <td>{lead.sourceRow}</td>
                          <td>
                            {lead.sourceSpreadsheetId ? (
                              <a
                                href={`https://docs.google.com/spreadsheets/d/${lead.sourceSpreadsheetId}/edit#gid=93793889&range=A${lead.sourceRow}`}
                                target="_blank" rel="noreferrer"
                                className={styles.sourceLink}
                              >
                                Open row
                              </a>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!leads.some((l) => l.owner === selectedStaff) && (
                  <p className={styles.empty}>No leads assigned to this person.</p>
                )}
              </div>
            </section>

            {/* Snapshot / assignment report section */}
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <h2><BarChart2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />Today&apos;s assignment snapshot</h2>
                  <p>Who assigned to whom · transfer count · totals · sent by email at 11:00 IST</p>
                </div>
              </div>
              {ownerStats.length > 0 ? (
                <div className={styles.snapshotGrid}>
                  {ownerStats.map((o) => (
                    <div key={o.name} className={styles.snapshotCard}>
                      <span className={styles.snapshotAvatar}>
                        {o.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div className={styles.snapshotInfo}>
                        <strong>{o.name}</strong>
                        <small>{o.count} lead{o.count !== 1 ? "s" : ""} assigned</small>
                        {o.received > 0 && <small className={styles.snapshotReceived}>{o.received} received today via transfer</small>}
                      </div>
                      <span className={`${styles.snapshotBadge} ${o.count === 0 ? styles.snapshotZero : ""}`}>{o.count}</span>
                    </div>
                  ))}
                  <div className={styles.snapshotSummary}>
                    <span>Total transfers today: <b>{changes.length}</b></span>
                    <span>Unassigned: <b>{unassigned}</b></span>
                    <span>Overdue: <b className={overdue > 0 ? styles.overdueText : ""}>{overdue}</b></span>
                    <small>Email snapshot sent daily at 11:00 IST to all owners</small>
                  </div>
                </div>
              ) : (
                <p className={styles.sideIntro} style={{ padding: "14px 22px" }}>
                  No assignments recorded yet. Once leads are assigned, the snapshot will appear here.
                </p>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className={styles.sideColumn}>
            {/* Availability */}
            <section className={styles.panel}>
              <div className={styles.sideHead}><Users size={18} /><h2>AppSheet team availability</h2></div>
              <p className={styles.sideIntro}>
                People come from the master Config tab. Mark unavailable before AppSheet allocation.
                Dialer readiness stays in the dialer.
              </p>
              {staff.map((person) => (
                <label className={styles.person} key={person.name}>
                  <span className={styles.avatar}>
                    {person.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <span>
                    <strong>{person.name}</strong>
                    <small>{leads.filter((l) => l.owner === person.name).length} pending leads</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={person.available}
                    disabled={saving || (!demo && (!snapshot?.canEdit || !snapshot?.complete))}
                    onChange={() => void toggleAvailability(person)}
                    aria-label={`${person.name} available`}
                  />
                </label>
              ))}
            </section>

            {/* Pre-confirm checklist */}
            <section className={styles.panel}>
              <div className={styles.sideHead}><CircleAlert size={18} /><h2>Checks before confirm</h2></div>
              <ul className={styles.checks}>
                <li className={!hasQueue || unassigned ? styles.needsAction : styles.passed}>
                  <span>{!hasQueue || unassigned ? "!" : "✓"}</span> Every AppSheet lead has an owner
                </li>
                <li className={!hasQueue || unavailableOwner ? styles.needsAction : styles.passed}>
                  <span>{!hasQueue || unavailableOwner ? "!" : "✓"}</span> No AppSheet work with unavailable staff
                </li>
                <li className={snapshot?.complete ? styles.passed : styles.needsAction}>
                  <span>{snapshot?.complete ? "✓" : "!"}</span>{" "}
                  {demo ? "Sample sources only; live check pending" : "All linked AppSheet sources read"}
                </li>
                <li className={styles.passed}><span>✓</span> Dialer assigns calls automatically to ready staff</li>
                <li className={styles.needsAction}><span>!</span> WhatsApp routing overlap still needs verification</li>
              </ul>
              <p className={styles.manual}>
                <strong>Source unavailable?</strong> Open employee Main sheets manually for AppSheet work.
                For dialer, use its pending report and ready login status; assignment stays inside the dialer.
              </p>
            </section>

            {/* Owner change record */}
            <section className={styles.panel}>
              <div className={styles.sideHead}><Clock3 size={18} /><h2>Owner change record</h2></div>
              {changes.length ? (
                <ul className={styles.changes}>
                  {changes.map((change, i) => <li key={`${change}-${i}`}>{change}</li>)}
                </ul>
              ) : (
                <p className={styles.sideIntro}>No owner changes recorded today.</p>
              )}
            </section>
          </aside>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>Review queue <ArrowRight size={14} /> resolve exceptions <ArrowRight size={14} /> confirm <ArrowRight size={14} /> staff lists</span>
          <span>
            <a href="https://docs.google.com/spreadsheets/d/1nQuZVX2D-sWCaS6sG0OzLMveH8M7g9tJrIXmiY3hQkU/edit#gid=1840903" target="_blank" rel="noreferrer">
              Morning Allocation Log
            </a>{" · "}MID-18409 · MID-18360 · MID-12682
          </span>
        </footer>

        {/* Transfer modal */}
        {pendingTransfer && (
          <div className={styles.modalBackdrop}>
            <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="transfer-title">
              <h2 id="transfer-title">Confirm owner transfer</h2>
              <p><strong>{pendingTransfer.lead.name}</strong> · {pendingTransfer.lead.id}</p>
              <p>{pendingTransfer.lead.owner || "Unassigned"} → <strong>{pendingTransfer.owner}</strong></p>
              <p>
                Source Main row: L = new owner, Q = Transfer, T = timestamped remark, <strong>V = Transfer To (new owner)</strong>.
                This lead will leave the actionable queue after saving.
                You can continue working on other leads while the save runs in the background.
              </p>
              <label htmlFor="transfer-reason">Reason for audit log</label>
              <textarea
                id="transfer-reason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                maxLength={300}
                rows={3}
                autoFocus
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setPendingTransfer(null)}>Cancel</button>
                <button
                  type="button"
                  disabled={!transferReason.trim()}
                  onClick={() => void submitTransfer()}
                >
                  Confirm transfer
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
