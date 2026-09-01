'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  appendChunk, getActiveRecording, clearActiveRecording,
  blobFromStored, hasRecoverableRecording, type StoredRecording,
} from '@/lib/recording-store'
import { compressAudio, type CompressProgress } from '@/lib/audio-compress'
import { fetchWithTimeout, withTimeout, STEP_TIMEOUTS, TimeoutError } from '@/lib/with-timeout'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { parseMeetingInput } from '@/lib/meeting-url-parser'
import { uploadAudioChunked, type UploadProgress } from '@/lib/chunked-upload'
import {
  createCheckpoint, updateCheckpoint, loadCheckpoint,
  clearCheckpoint, hasResumableCheckpoint, getStoredCheckpointId,
  type PipelineCheckpoint,
} from '@/lib/pipeline-checkpoint'
import { BackButton } from "@/components/back-button"
import { useEmployees } from '@/hooks/useEmployees'
import {
  StickyNote,
  Calendar,
  BarChart3,
} from "lucide-react"


// ── Calendar Types & Helpers ──────────────────────────────────────────────────
interface CalendarMeeting {
  id: string; title: string
  start: string | null; end: string | null
  status: 'live' | 'soon' | 'upcoming' | 'ended'
  platform: string | null; meetingUrl: string | null; meetCode: string | null
  participants: { name: string; email: string; role: string; accepted: boolean }[]
  participantCount: number; organizer: string | null; htmlLink: string | null
}
const CAL_PLATFORM_COLOR: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  meet: { dot: '#5a8a6a', bg: '#eef5f0', text: '#3a6b4a', label: 'Meet' },
  zoom: { dot: '#5a7fa8', bg: '#edf2f7', text: '#3a5f88', label: 'Zoom' },
  teams: { dot: '#8a6a9a', bg: '#f3eff7', text: '#6a4a7a', label: 'Teams' },
}
const CAL_DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function calFmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}
function calIsSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) { cells.push(null); continue }
    cells.push(new Date(year, month, dayNum))
  }
  return cells
}

// ── Platform SVG Logos ────────────────────────────────────────────────────────
const PlatformLogo = ({ platform, size = 50 }: { platform: string; size?: number }) => {
  if (platform === 'meet')
    return (
      <img width="20" height="20" src="https://img.icons8.com/color/96/google-meet--v1.png" alt="google-meet--v1" />
    )
  if (platform === 'zoom')
    return (
      <img width="20" height="20" src="https://img.icons8.com/color/96/zoom.png" alt="zoom" />
    )
  if (platform === 'teams')
    return (
      <img width="20" height="20" src="https://img.icons8.com/fluency/48/microsoft-teams-2019.png" alt="microsoft-teams-2019" />
    )

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#6b7280" strokeWidth="1.5" fill="none" />
      <path d="M9 9L15 12L9 15V9Z" fill="#6b7280" />
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  other: 'Other',
}
const PLATFORM_COLOR: Record<string, string> = {
  meet: 'bg-blue-50 text-blue-700 border-blue-200',
  zoom: 'bg-sky-50 text-sky-700 border-sky-200',
  teams: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
}
const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

type RecState = 'idle' | 'recording' | 'paused' | 'processing' | 'done' | 'error'
type RecStep = 'fetching' | 'compressing' | 'uploading' | 'transcribing' | 'processing' | 'saving' | 'extracting' | 'done'
const REC_STEPS = [
  { key: 'fetching',     label: 'Fetching meeting participants' },
  { key: 'compressing',  label: 'Compressing audio' },
  { key: 'uploading',    label: 'Uploading audio to Google Drive' },
  { key: 'transcribing', label: 'Transcribing & identifying speakers' },
  { key: 'processing',   label: 'Generating notes with AI' },
  { key: 'saving',       label: 'Saving meeting to CRM' },
  { key: 'extracting',   label: 'Extracting tasks automatically' },
]
const REC_STEP_ORDER = ['fetching', 'compressing', 'uploading', 'transcribing', 'processing', 'saving', 'extracting', 'done']
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyLepNDol1aHDAj7nvJ-l202-bcmmHAzU9DQ8kmdEQwduM9Jv3azgNXjqcBSJL2e2B6Wg/exec'

function fmtRecTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface ActionItem {
  task: string
  owner: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
  status?: 'pending' | 'in-progress' | 'completed'
  company?: 'KTAHV' | 'KAPPL' | 'VILLA RAGA' | 'ADMIN' | 'ALLIANCES' | 'OTHERS'
  _db_id?: number | string
}

interface KeyDecision {
  decision: string
  context: string
}

interface Participant {
  name: string
  role: 'host' | 'attendee'
}

interface Meeting {
  id: number
  title: string
  tp: 'online' | 'offline'
  pl: string | null
  dt: Date
  dur: number
  summary: string | null
  ai: ActionItem[]
  kd: KeyDecision[]
  pa: Participant[]
  audio_url: string | null
  status: string
  transcript: string | null,
  diarized_transcript?: string | null
  recorded_by?: string
  recorded_by_name?: string
}

// ── Map raw DB row to Meeting shape ──────────────────────────────────────────
function mapRow(r: any): Meeting {
  const parse = (v: any) => {
    if (!v) return []
    if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } }
    return Array.isArray(v) ? v : []
  }
  return {
    id: r.id,
    title: r.title || 'Untitled Meeting',
    tp: r.meeting_type || 'online',
    pl: r.platform || null,
    dt: new Date(r.recorded_at),
    dur: r.duration_sec || 0,
    summary: r.summary || '',
    ai: parse(r.action_items),
    kd: parse(r.key_decisions),
    pa: parse(r.participants),
    audio_url: r.audio_url || null,
    status: r.status || 'ready',
    transcript: r.transcript || null,
    diarized_transcript: r.diarized_transcript || null,
    recorded_by: r.recorded_by || '',
    recorded_by_name: r.recorded_by_name || '',
  }
}
const DATE_OPTIONS = [
  'All Dates', 'Today', 'Yesterday', 'This Week', 'Last 7 Days',
  'Last Week', 'This Month', 'Last Month', 'This Year', 'Last Year', 'Custom Range',
]
const PLATFORMS_FILTER = ['All', 'Google Meet', 'Zoom', 'Teams', 'Other', 'Offline']

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDur(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}
function fmtDate(d: Date | number): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(d: Date | number): string {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtDateTime(d: Date | number): string {
  return fmtDate(d) + ', ' + fmtTime(d)
}
function now(): string {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string
  children: React.ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center modal-wrap"
      style={{ background: 'rgba(0,0,0,0.5)', padding: '64px 16px 16px' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full flex flex-col modal-wide ${wide ? 'max-w-5xl' : 'max-w-lg'}`}
        style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          maxHeight: '88vh',
          animation: 'modalIn 0.2s ease',
        }}
      >
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg,#0C447C,#185FA5,#378ADD)',
          borderRadius: '16px 16px 0 0',
          padding: '16px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {children}
    </span>
  )
}

// ── Current user (from GAS auth, stored in localStorage) ──────────────────────
// Adjust USER_STORAGE_KEY if your CRM stores the logged-in user under a different key.
const USER_STORAGE_KEY = 'kairali_user'
const ADMIN_ROLES = ['super_admin', 'admin']

function getCurrentUser(): { email: string; name: string; role: string } {
  if (typeof window === 'undefined') return { email: '', name: '', role: '' }
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (raw) {
      const u = JSON.parse(raw)
      return {
        email: u.email || '',
        name:  u.name  || u.fullName || u.email || '',
        role:  u.role  || '',
      }
    }
  } catch {}
  return { email: '', name: '', role: '' }
}

// ── Main ─────────────────────────────────────────────────────────────────────
// ── Audio player with seek bar, current time, and total duration ──────────────
function AudioPlayer({ src, fallbackDur = 0 }: { src: string; fallbackDur?: number }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying]   = React.useState(false)
  const [current, setCurrent]   = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [loading, setLoading]   = React.useState(true)
  const [rate, setRate]         = React.useState(1)

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause() } else { a.play() }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a) return
    const t = (Number(e.target.value) / 100) * (duration || fallbackDur)
    a.currentTime = t
    setCurrent(t)
  }

  const changeRate = () => {
    const a = audioRef.current
    if (!a) return
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
    a.playbackRate = next
    setRate(next)
  }

  const effDur = duration > 0 ? duration : fallbackDur
  const pct = effDur > 0 ? (current / effDur) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const a = e.target as HTMLAudioElement
          const d = a.duration
          // Streamed/Range audio often reports Infinity here. Force the browser
          // to compute the real duration by seeking to the end, then back.
          if (d === Infinity || isNaN(d) || d === 0) {
            const onSeeked = () => {
              setDuration(isFinite(a.duration) && a.duration > 0 ? a.duration : fallbackDur)
              a.currentTime = 0
              a.removeEventListener('seeked', onSeeked)
              setLoading(false)
            }
            a.addEventListener('seeked', onSeeked)
            try { a.currentTime = 1e101 } catch { setDuration(fallbackDur); setLoading(false) }
          } else {
            setDuration(d)
            setLoading(false)
          }
        }}
        onDurationChange={(e) => {
          const d = (e.target as HTMLAudioElement).duration
          if (isFinite(d) && d > 0) setDuration(d)
        }}
        onCanPlay={() => setLoading(false)}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => { setDuration(fallbackDur); setLoading(false) }}
      />

      {/* Big play/pause + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={toggle} disabled={loading}
          style={{
            width: 56, height: 56, borderRadius: 28, flexShrink: 0,
            background: loading ? '#cbd5e1' : 'linear-gradient(135deg,#1e3a5f,#2d5a9e)',
            color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer',
            fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(30,58,95,0.3)',
          }}>
          {loading ? '⏳' : playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
            <span>{fmt(current)}</span>
            <span style={{ color: '#94a3b8' }}>{loading ? '--:--' : fmt(duration || fallbackDur)}</span>
          </div>
          {/* Seek bar */}
          <input type="range" min={0} max={100} value={pct} onChange={seek} disabled={loading}
            style={{
              width: '100%', height: 6, cursor: loading ? 'default' : 'pointer',
              accentColor: '#1e3a5f',
            }} />
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { const a = audioRef.current; if (a) { a.currentTime = Math.max(0, a.currentTime - 10); } }}
            style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            ⏪ 10s
          </button>
          <button onClick={() => { const a = audioRef.current; if (a) { a.currentTime = Math.min(duration, a.currentTime + 10); } }}
            style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            10s ⏩
          </button>
        </div>
        <button onClick={changeRate}
          style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
          {rate}× speed
        </button>
      </div>
    </div>
  )
}

export default function MeetingFMS() {
  const router = useRouter()
  // Phase 2: multi-user
  const [me] = useState(() => getCurrentUser())
  const isAdmin = ADMIN_ROLES.includes(me.role)
  const [filterPerson, setFilterPerson] = useState<string>('')   // admin: filter by recorder

  // ── Employee data ───────────────────────────────────────────
  const { grouped: empGrouped, nameList: empNames, getEmail } = useEmployees()

  // ── Real data state ────────────────────────────────────────────────────────
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([])

  // Unique recorders (for the admin person-filter dropdown) — after allMeetings exists
  const recorderOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    allMeetings.forEach(m => {
      if (m.recorded_by) map.set(m.recorded_by, m.recorded_by_name || m.recorded_by)
    })
    return Array.from(map.entries()).map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [allMeetings])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [filtered, setFiltered] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [apiPage, setApiPage] = useState(1)
  const [apiTotal, setApiTotal] = useState(0)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [audioPopup, setAudioPopup] = useState<{ m: Meeting } | null>(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('All Dates')
  const [customFrom, setCustomFrom] = useState('')   // Custom Range start (YYYY-MM-DD)
  const [customTo,   setCustomTo]   = useState('')   // Custom Range end
  const [typeFilter, setTypeFilter] = useState('All')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [dateDropOpen, setDateDropOpen] = useState(false)
  const [lastUpd, setLastUpd] = useState(now())
  // Calendar popup state
  const [calendarPopupOpen, setCalendarPopupOpen] = useState(false)
  const [calMeetings, setCalMeetings] = useState<CalendarMeeting[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState<string | null>(null)
  const [calSigningIn, setCalSigningIn] = useState(false)
  const today = new Date()
  const [calViewYear, setCalViewYear] = useState(today.getFullYear())
  const [calViewMonth, setCalViewMonth] = useState(today.getMonth())
  const [calSelected, setCalSelected] = useState<{ date: Date; meetings: CalendarMeeting[] } | null>(null)

  // Popups
  const [pPopup, setPPopup] = useState<{ m: Meeting } | null>(null)
  const [aPopup, setAPopup] = useState<{ m: Meeting } | null>(null)
  const [dPopup, setDPopup] = useState<{ m: Meeting } | null>(null)
  const [nPopup, setNPopup] = useState<{ m: Meeting } | null>(null)
  const [tPopup, setTPopup] = useState<{ m: Meeting; midx: number } | null>(null)
  const [delPopup, setDelPopup] = useState<{ m: Meeting } | null>(null)
  const [newMtgOpen, setNewMtgOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<number | null>(null)
  // Reset task order when popup opens with new meeting
  useEffect(() => {
    if (tPopup) setTaskOrder(tPopup.m.ai.map((_, i) => i))
    else setTaskOrder([])
  }, [tPopup?.m?.id])
  const [taskActions, setTaskActions] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [tasksLoading, setTasksLoading] = useState(false)
  const [meetingTasksCache, setMeetingTasksCache] = useState<Record<number, ActionItem[]>>({})
  // Drag & drop reorder state for tasks popup
  const [taskOrder, setTaskOrder] = useState<number[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [editingPriority, setEditingPriority] = useState<number | null>(null)

  // New meeting form state
  const [nmMode, setNmMode] = useState('online')
  const [nmPlatform, setNmPlatform] = useState('meet')
  const [nmTitle, setNmTitle] = useState('')
  const [nmUrl, setNmUrl] = useState('')

  // Tooltip hover state
  const [hoveredSummary, setHoveredSummary] = useState<number | null>(null)

  // ── Recording state ────────────────────────────────────────────────────────
  const [recState, setRecState] = useState<RecState>('idle')
  const [recStep, setRecStep] = useState<RecStep | null>(null)
  const [recElapsed, setRecElapsed] = useState(0)
  const [recErrorMsg, setRecErrorMsg] = useState('')
  const [recTasksCount, setRecTasksCount] = useState(0)
  const [recParticipants, setRecParticipants] = useState<any[]>([])
  const [recNotes, setRecNotes] = useState<any | null>(null)
  const [recSavedId, setRecSavedId] = useState<number | null>(null)
  const [micMuted, setMicMuted] = useState(false)
  // Phase 1: recovery + compression state
  const [recoverable,    setRecoverable]    = useState<StoredRecording | null>(null)
  const [compressProg,   setCompressProg]   = useState<number>(0)
  const [isCompressing,  setIsCompressing]  = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [nmParsed, setNmParsed] = useState<any | null>(null)
  const [nmMeetCode, setNmMeetCode] = useState('')
  const [nmZoomId, setNmZoomId] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [zoomSession, setZoomSession] = useState<any>({ connected: false })
  const [participantNote, setParticipantNote] = useState('')
  const [meetingOpened, setMeetingOpened] = useState(false)
  const [offlineParticipants, setOfflineParticipants] = useState<string[]>([])
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualName, setManualName] = useState('')
  const [resumeCheckpoint, setResumeCheckpoint] = useState<PipelineCheckpoint | null>(null)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const [showAddTask, setShowAddTask] = useState(false)
  const [addTaskForm, setAddTaskForm] = useState({ task: '', assignee: '', priority: 'medium', deadline: '' })
  const [addingTask, setAddingTask] = useState(false)
  // const [meetingTasksCache, setMeetingTasksCache] = useState<Record<number, ActionItem[]>>({})

  useEffect(() => {
    hasResumableCheckpoint().then(has => {
      if (has) loadCheckpoint().then(cp => {
        if (cp) { setResumeCheckpoint(cp); setShowResumeBanner(true) }
      })
    })
  }, [])

  // Recording refs
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const audioBlobRef = useRef<Blob | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  // Mic mute: gain nodes let us silence the mic in the recording without
  // stopping the recording or affecting tab audio.
  const micGainRef    = useRef<GainNode | null>(null)
  const micStreamRef  = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recElapsedRef = useRef(0)

  const { data: googleSession, status: sessionStatus } = useSession()
  const isGoogleConnected = sessionStatus === 'authenticated'
    && !!(googleSession as any)?.accessToken
    && (googleSession as any)?.error !== 'RefreshAccessTokenError'
  const googleUserName = (googleSession as any)?.user?.name || ''

  // ── Fetch meetings ─────────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: '200' })
      // Phase 2: identify caller so server scopes visibility
      if (me.email) params.append('email', me.email)
      if (me.role)  params.append('role',  me.role)
      if (isAdmin && filterPerson) params.append('recorded_by', filterPerson)
      const res = await fetch(`/api/meetings/save?${params}`)
      const data = await res.json()
      const rows: Meeting[] = (data.meetings || []).map(mapRow)
      setAllMeetings(rows)
      setMeetings(rows)
      setApiTotal(data.total || 0)
      setLastUpd(now())
    } catch (e) {
      console.error('[meetings fetch]', e)
    } finally {
      setLoading(false)
    }
  }, [me.email, me.role, isAdmin, filterPerson])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  // Phase 1: on mount, detect an orphaned recording (tab closed mid-pipeline)
  useEffect(() => {
    hasRecoverableRecording().then(rec => {
      if (rec) setRecoverable(rec)
    }).catch(() => {})
  }, [])

  // ── Calendar fetch ─────────────────────────────────────────────────────────
  const fetchCalendar = useCallback(async () => {
    const token = (googleSession as any)?.accessToken
    if (!token) return
    setCalLoading(true); setCalError(null)
    try {
      const res = await fetch(`/api/calendar/meetings?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (!res.ok) {
        setCalError(data.error?.includes('insufficient') ? '__SCOPE__' : data.error || 'Could not load calendar')
        return
      }
      setCalMeetings(data.meetings || [])
    } catch { setCalError('Could not connect to Google Calendar. Please try again.') }
    finally { setCalLoading(false) }
  }, [googleSession])

  useEffect(() => {
    if (calendarPopupOpen && isGoogleConnected) {
      fetchCalendar()
      const t = setInterval(fetchCalendar, 5 * 60 * 1000)
      return () => clearInterval(t)
    }
  }, [calendarPopupOpen, isGoogleConnected, fetchCalendar])
  useEffect(() => {
    const s = search.toLowerCase()

    // ── Date-range window for the selected dateFilter ────────────────────────
    const now = new Date()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    let dFrom: Date | null = null
    let dTo:   Date | null = null

    switch (dateFilter) {
      case 'Today':
        dFrom = startOfDay(now); dTo = endOfDay(now); break
      case 'Yesterday': {
        const y = new Date(now); y.setDate(now.getDate() - 1)
        dFrom = startOfDay(y); dTo = endOfDay(y); break
      }
      case 'This Week': {
        const day = now.getDay()                 // 0=Sun
        const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7))
        dFrom = startOfDay(monday); dTo = endOfDay(now); break
      }
      case 'Last 7 Days': {
        const a = new Date(now); a.setDate(now.getDate() - 6)
        dFrom = startOfDay(a); dTo = endOfDay(now); break
      }
      case 'Last Week': {
        const day = now.getDay()
        const thisMon = new Date(now); thisMon.setDate(now.getDate() - ((day + 6) % 7))
        const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7)
        const lastSun = new Date(thisMon); lastSun.setDate(thisMon.getDate() - 1)
        dFrom = startOfDay(lastMon); dTo = endOfDay(lastSun); break
      }
      case 'This Month':
        dFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        dTo   = endOfDay(now); break
      case 'Last Month':
        dFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
        dTo   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); break
      case 'This Year':
        dFrom = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        dTo   = endOfDay(now); break
      case 'Last Year':
        dFrom = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
        dTo   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999); break
      case 'Custom Range':
        if (customFrom) dFrom = startOfDay(new Date(customFrom))
        if (customTo)   dTo   = endOfDay(new Date(customTo))
        break
      case 'All Dates':
      default:
        dFrom = null; dTo = null
    }

    const f = meetings.filter((m) => {
      const ms = !s || m.title.toLowerCase().includes(s) || (m.summary || '').toLowerCase().includes(s)
      const mt =
        typeFilter === 'All' ||
        (typeFilter === 'Online' && m.tp === 'online') ||
        (typeFilter === 'Offline' && m.tp === 'offline')
      const mpl =
        platformFilter === 'All' ||
        (platformFilter === 'Google Meet' && m.pl === 'meet') ||
        (platformFilter === 'Zoom' && m.pl === 'zoom') ||
        (platformFilter === 'Teams' && m.pl === 'teams') ||
        (platformFilter === 'Other' && m.pl === 'other') ||
        (platformFilter === 'Offline' && m.tp === 'offline')
      // ── Date window check ──────────────────────────────────────────────────
      const md =
        (!dFrom || m.dt >= dFrom) &&
        (!dTo   || m.dt <= dTo)
      return ms && mt && mpl && md
    })
    setFiltered(f)
    setPage(1)
  }, [search, typeFilter, platformFilter, dateFilter, customFrom, customTo, meetings])

  const kpis = {
    total: filtered.length,
    online: filtered.filter((m) => m.tp === 'online').length,
    offline: filtered.filter((m) => m.tp === 'offline').length,
    actions: filtered.reduce((s, m) => s + m.ai.length, 0),
    decisions: filtered.reduce((s, m) => s + m.kd.length, 0),
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  function clearFilters() {
    setSearch('')
    setDateFilter('All Dates')
    setCustomFrom(''); setCustomTo('')
    setTypeFilter('All')
    setPlatformFilter('All')
  }

  // ── Recording functions ────────────────────────────────────────────────────
  useEffect(() => { recElapsedRef.current = recElapsed }, [recElapsed])

  // Fetch Zoom session on mount
  useEffect(() => {
    fetch('/api/meetings/zoom-status')
      .then(r => r.json())
      .then(d => setZoomSession(d))
      .catch(() => { })
  }, [])

  // Handle Zoom OAuth callback redirect — re-fetch session when returning from Zoom auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const zoomConnected = params.get('zoom_connected')
    const zoomError = params.get('zoom_error')

    if (zoomConnected === 'true') {
      // Re-fetch zoom session — cookie was just set by /api/zoom/callback
      fetch('/api/meetings/zoom-status')
        .then(r => r.json())
        .then(d => {
          setZoomSession(d)
          // Re-open recording modal if it was open before OAuth redirect
          const savedUrl = sessionStorage.getItem('zoom_return_url')
          sessionStorage.removeItem('zoom_return_url')
          // Clean URL without reload
          window.history.replaceState({}, '', window.location.pathname)
          // Open new meeting modal so user sees Zoom is now connected
          setNewMtgOpen(true)
        })
        .catch(() => { })
    }

    if (zoomError) {
      // Show error to user — zoom connection failed
      setNewMtgOpen(true)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const raw = sessionStorage.getItem('nm_restore')
    if (!raw) return
    try {
      const saved = JSON.parse(raw)
      sessionStorage.removeItem('nm_restore')
      if (saved.open) {
        setNmUrl(saved.nmUrl || '')
        setNmMode(saved.nmMode || 'online')
        setNmPlatform(saved.nmPlatform || 'meet')
        setNmTitle(saved.nmTitle || '')
        setNmMeetCode(saved.nmMeetCode || '')
        setNmZoomId(saved.nmZoomId || '')
        if (saved.nmUrl) {
          const parsed = parseMeetingInput(saved.nmUrl)
          setNmParsed(parsed)
        }
        setNewMtgOpen(true)
      }
    } catch { }
  }, [])

  const drawVisualiser = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const bufLen = analyserRef.current.frequencyBinCount
    const data = new Uint8Array(bufLen)
    analyserRef.current.getByteFrequencyData(data)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const barW = (canvas.width / bufLen) * 2.5
    let x = 0
    for (let i = 0; i < bufLen; i++) {
      const barH = (data[i] / 255) * canvas.height
      ctx.fillStyle = `hsla(${226 + (i / bufLen) * 20}, 70%, ${55 + (data[i] / 255) * 20}%, 0.9)`
      ctx.fillRect(x, canvas.height - barH, barW, barH)
      x += barW + 1
    }
    setAudioLevel(data.reduce((a, b) => a + b, 0) / bufLen / 255)
    animFrameRef.current = requestAnimationFrame(drawVisualiser)
  }, [])

  const startRecTimer = () => {
    startTimeRef.current = Date.now() - recElapsedRef.current * 1000
    timerRef.current = setInterval(
      () => setRecElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
      500
    )
  }
  const stopRecTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  function handleNmUrlChange(raw: string) {
    setNmUrl(raw)
    if (!raw.trim()) { setNmParsed(null); return }
    const parsed = parseMeetingInput(raw)
    setNmParsed(parsed)
    if (parsed.confidence === 'high') {
      setNmPlatform(parsed.platform)
      setNmMeetCode(parsed.meetCode || '')
      setNmZoomId(parsed.zoomId || '')
    }
  }

  async function handleConnectGoogle() {
    sessionStorage.setItem('nm_restore', JSON.stringify({
      nmUrl, nmMode, nmPlatform, nmTitle, nmMeetCode, nmZoomId, open: true,
    }))
    setSigningIn(true)
    try { await signIn('google', { redirect: true, callbackUrl: window.location.href }) }
    finally { setSigningIn(false) }
  }

  function handleConnectZoom() {
    // Save return URL so zoom callback redirects back to THIS page (not /meetings/record)
    sessionStorage.setItem('zoom_return_url', window.location.pathname + window.location.search)
    window.location.href = '/api/zoom/connect'
  }

  function getMeetingUrl(): string {
    if (nmPlatform === 'meet' && nmMeetCode) return `https://meet.google.com/${nmMeetCode}`
    if (nmPlatform === 'zoom' && nmZoomId) return `https://zoom.us/j/${nmZoomId}`
    if (nmPlatform === 'teams' && nmUrl) return nmUrl
    if (nmUrl) return nmUrl
    return ''
  }

  async function getAudioStreamWithExtension(): Promise<{ stream: MediaStream; method: string }> {
    return new Promise((resolve, reject) => {
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; reject(new Error('Extension not responding')) }
      }, 2000)
      const handler = async (event: MessageEvent) => {
        if (event.data?.type !== 'KAIRALI_STREAM_ID_RESPONSE') return
        window.removeEventListener('message', handler)
        clearTimeout(timeout)
        if (resolved) return
        resolved = true
        if (event.data.error || !event.data.streamId) { reject(new Error(event.data.error || 'No stream ID')); return }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: event.data.streamId } } as any,
            video: false,
          })
          resolve({ stream, method: 'extension' })
        } catch (e: any) { reject(new Error('getUserMedia with streamId failed: ' + e.message)) }
      }
      window.addEventListener('message', handler)
      window.postMessage({ type: 'KAIRALI_REQUEST_STREAM_ID' }, '*')
    })
  }

  function openMeetingTab() {
    const meetUrl = getMeetingUrl()
    if (meetUrl) window.open(meetUrl, '_blank', 'noopener')
    setMeetingOpened(true)
    setRecErrorMsg('')
  }

  async function startRecording() {
    setRecErrorMsg('')
    try {
      let stream: MediaStream
      if (nmMode === 'online') {
        let tabStream: MediaStream | null = null
        let captureMethod = 'screen_share'
        try {
          const result = await getAudioStreamWithExtension()
          tabStream = result.stream
          captureMethod = result.method
        } catch (extErr: any) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { echoCancellation: true, noiseSuppression: true } as any,
          })
          displayStream.getVideoTracks().forEach(t => t.stop())
          tabStream = displayStream
          const meetUrl = getMeetingUrl()
          if (meetUrl) window.open(meetUrl, '_blank', 'noopener')
        }
        let micStream: MediaStream | null = null
        try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }) } catch { }
        if (micStream) {
          micStreamRef.current = micStream
          const ctx = new AudioContext()
          const dest = ctx.createMediaStreamDestination()
          // Tab audio → straight to recording
          ctx.createMediaStreamSource(tabStream).connect(dest)
          // Mic → through a gain node (gain=1 normally, 0 when muted)
          const micSource = ctx.createMediaStreamSource(micStream)
          const micGain   = ctx.createGain()
          micGain.gain.value = micMuted ? 0 : 1
          micSource.connect(micGain)
          micGain.connect(dest)
          micGainRef.current = micGain
          const analyser = ctx.createAnalyser(); analyser.fftSize = 256
          ctx.createMediaStreamSource(tabStream).connect(analyser)
          analyserRef.current = analyser; stream = dest.stream
        } else {
          stream = tabStream
          const ctx = new AudioContext()
          const analyser = ctx.createAnalyser(); analyser.fftSize = 256
          ctx.createMediaStreamSource(stream).connect(analyser)
          analyserRef.current = analyser
        }
      } else {
        const constraints = [
          { echoCancellation: true, noiseSuppression: true },
          { echoCancellation: true },
          true,
        ]
        let last: any = null
        for (const c of constraints) {
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: c, video: false }); last = null; break }
          catch (e) { last = e }
        }
        if (!stream! || last) throw new Error(last?.message || 'Microphone not found')
        micStreamRef.current = stream
        // Route mic through a gain node so the mute button can silence it.
        const ctx  = new AudioContext()
        const dest = ctx.createMediaStreamDestination()
        const src  = ctx.createMediaStreamSource(stream)
        const gain = ctx.createGain()
        gain.gain.value = micMuted ? 0 : 1
        src.connect(gain)
        gain.connect(dest)
        micGainRef.current = gain
        const analyser = ctx.createAnalyser(); analyser.fftSize = 256
        src.connect(analyser)
        analyserRef.current = analyser
        stream = dest.stream   // record the gated output, not the raw mic
      }

      if (!stream! || stream.getAudioTracks().length === 0) {
        stream?.getTracks().forEach(t => t.stop())
        setRecErrorMsg('No audio captured. Make sure to enable "Share tab audio" when selecting the meeting tab.')
        return
      }

      streamRef.current = stream
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      audioChunks.current = []
      // Phase 1: persist each chunk to IndexedDB live, so a tab close never loses audio
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data)
          appendChunk(e.data, {
            mimeType:    mimeType || 'audio/webm',
            startedAt:   new Date().toISOString(),
            title:       nmTitle || 'Untitled Meeting',
            mode:        nmMode,
            platform:    nmPlatform,
            meetCode:    nmMeetCode || null,
            zoomId:      nmZoomId || null,
            durationSec: recElapsedRef.current,
          }).catch(() => {})
        }
      }
      recorder.onstop = () => handleRecStop()
      recorder.start(3000)  // 3s intervals — fewer chunks = less memory for long meetings (250ms gave 3000+ chunks for 14MB)
      mediaRecRef.current = recorder

      stream.getAudioTracks().forEach(track => {
        track.addEventListener('ended', () => {
          setRecState(cur => {
            if (cur === 'recording' || cur === 'paused') {
              stopRecTimer()
              cancelAnimationFrame(animFrameRef.current)
              // Don't stop stream here — mediaRecorder.stop() will trigger
              // ondataavailable + onstop, which stops stream after blob is built
              if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
                try { mediaRecRef.current.requestData() } catch {}
                mediaRecRef.current.stop()
              }
              return 'processing'
            }
            return cur
          })
        })
      })

      setRecState('recording')
      startRecTimer()
      drawVisualiser()
    } catch (err: any) {
      setRecErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Permission denied. Please allow screen/mic access and try again.'
          : `Could not start: ${err.message}`
      )
    }
  }

  function togglePause() {
    if (!mediaRecRef.current) return
    if (recState === 'recording') {
      mediaRecRef.current.pause(); stopRecTimer()
      cancelAnimationFrame(animFrameRef.current); setRecState('paused')
    } else if (recState === 'paused') {
      mediaRecRef.current.resume(); startRecTimer()
      drawVisualiser(); setRecState('recording')
    }
  }

  function stopRecording() {
    if (!mediaRecRef.current) return
    // requestData() flushes any buffered audio before stop()
    // This ensures the final chunk is captured before onstop fires
    try { mediaRecRef.current.requestData() } catch {}
    stopRecTimer()
    cancelAnimationFrame(animFrameRef.current)
    // Stop recorder first — onstop will fire, THEN we stop stream tracks
    // Stopping tracks before stop() causes the final chunk to be lost
    mediaRecRef.current.stop()
    // Stream tracks are stopped inside handleRecStop after blob is built
    setRecState('processing')
  }

  async function handleRecStop() {
    // Stop stream tracks NOW — after recorder has stopped and final chunk collected
    streamRef.current?.getTracks().forEach(t => t.stop())

    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
    audioBlobRef.current = audioBlob

    if (audioBlob.size < 1024) {
      // Less than 1KB — almost certainly silent or empty
      setRecErrorMsg(
        audioChunks.current.length === 0
          ? 'No audio was captured. If recording online, make sure to check "Share system audio" when sharing your screen.'
          : 'Recording is too short or silent. Please speak clearly and try again.'
      )
      setRecState('error')
      return
    }

    const recordedAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace("T", " ")
    let fetchedParticipants: any[] = []

    // Show fetching step in UI
    setRecState('processing')
    setRecStep('fetching')

    if (nmPlatform === 'meet' && nmMeetCode && isGoogleConnected) {
      const token = (googleSession as any)?.accessToken
      if (token) {
        try {
          setParticipantNote('Fetching participants from Google Meet...')
          const res = await fetch('/api/meetings/meet-participants', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetCode: nmMeetCode, accessToken: token }),
          })
          const d = await res.json()
          if (res.ok && d.participants?.length > 0) {
            fetchedParticipants = d.participants
            setParticipantNote(`✓ ${d.participants.length} participants from Google Meet`)
          }
        } catch { }
      }
    }

    if (nmPlatform === 'zoom' && nmZoomId && zoomSession.connected) {
      try {
        await new Promise(r => setTimeout(r, 3000))
        const res = await fetch('/api/meetings/zoom-participants', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: nmZoomId }),
        })
        const d = await res.json()
        if (d.participants?.length > 0) {
          fetchedParticipants = d.participants
          setParticipantNote(`✓ ${d.participants.length} participants from Zoom`)
        }
      } catch { }
    }

    setRecParticipants(fetchedParticipants)
    await runRecPipeline(audioBlob, recordedAt, fetchedParticipants)
  }


  // ── Safe JSON parser — handles 413, 502, HTML error pages ────────────────
  // Production guard: if server returns non-JSON (413 text, HTML error page)
  // this throws a human-readable error instead of cryptic "Unexpected token"
  async function safeJson(res: Response, step: string): Promise<any> {
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      const preview = text.substring(0, 120).replace(/\n/g, ' ')
      if (res.status === 413) throw new Error(`${step}: audio too large. Recording was too long.`)
      if (res.status === 504 || res.status === 502) throw new Error(`${step}: server timeout. Try a shorter recording.`)
      throw new Error(`${step} error (${res.status}): ${preview}`)
    }
  }

  async function runRecPipeline(
    audioBlob: Blob, recordedAt: string,
    fetchedParticipants: any[], existingCp?: PipelineCheckpoint | null
  ) {
    const sizeKb = existingCp?.sizeKb || Math.round(audioBlob.size / 1024)
    const finalElapsed = existingCp?.durationSec || recElapsedRef.current

    setRecState('processing')

    let cpId = existingCp?.id || null
    if (!cpId) {
      cpId = await createCheckpoint({
        title: nmTitle || 'Untitled Meeting',
        mode: nmMode, platform: nmPlatform,
        meetCode: nmMeetCode, zoomId: nmZoomId,
        recordedAt, durationSec: finalElapsed,
        sizeKb, participants: fetchedParticipants,
      })
    }

    const save = (data: Partial<PipelineCheckpoint>) =>
      cpId ? updateCheckpoint(cpId, data) : Promise.resolve()

    try {
      let audioUrl = existingCp?.audioUrl
      if (!audioUrl) {
        // ── Phase 1: compress before upload (skip if resuming an upload) ──────
        let uploadBlob = audioBlob
        let fileExt    = 'webm'
        if (!existingCp?.uploadSessionUrl) {
          setRecStep('compressing')
          setIsCompressing(true)
          setCompressProg(0)
          try {
            const result = await compressAudio(audioBlob, (p: CompressProgress) => setCompressProg(p.percent))
            uploadBlob = result.blob
            fileExt    = result.compressed ? 'mp3' : 'webm'
          } catch (e) {
            console.warn('[Compress] skipped:', e)
          } finally {
            setIsCompressing(false)
          }
        }

        setRecStep('uploading')
        setUploadProgress(null)
        const result = await uploadAudioChunked(
          uploadBlob,
          `${nmTitle || 'meeting'}_${recordedAt.replace(/[: ]/g, '-')}.${fileExt}`,
          (progress: UploadProgress) => setUploadProgress(progress),
          existingCp?.uploadSessionUrl
        )
        audioUrl = result.streamUrl
        await save({ audioUrl, uploadSessionUrl: result.uploadUrl, lastStep: 'uploading' })
      }

      let transcript  = existingCp?.transcript
      let txSegments  = existingCp?.segments || []
      if (!transcript) {
        setRecStep('transcribing')
        const absAudioUrl = audioUrl?.startsWith('http')
          ? audioUrl
          : `${window.location.origin}${audioUrl}`
        const participantsForDiarize = fetchedParticipants.length > 0
          ? fetchedParticipants
          : nmMode === 'offline' && offlineParticipants.length > 0
            ? offlineParticipants.map((n: string) => ({ name: n, role: 'attendee' }))
            : []

        const tr = await fetchWithTimeout('/api/meetings/transcribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl:     absAudioUrl,
            participants: participantsForDiarize,
            meetingTitle: nmTitle || 'Untitled Meeting',
          }),
        }, STEP_TIMEOUTS.transcribing, 'Transcription')
        const td = await safeJson(tr, 'Transcribe')
        if (!tr.ok) {
          // 422 = bad audio (echo/silent). Terminal — re-record, don't keep retrying.
          if (tr.status === 422 || td.terminal || td.code === 'EMPTY_TRANSCRIPT') {
            throw new Error(td.error || 'Could not transcribe — the audio may have echo or be too quiet. Please re-record in a quieter setting.')
          }
          throw new Error(td.error || 'Transcription failed')
        }
        if (!td.transcript || td.transcript.trim().length < 10) {
          throw new Error('Transcription returned empty. Audio may be silent or too short.')
        }
        transcript    = td.transcript
        const fmtTx   = td.formattedTranscript || td.transcript
        await save({ lastStep: 'transcribing' })  // don't save large transcript to checkpoint
      }

      let fmtTranscript = existingCp?.formattedTranscript || transcript
      if (!existingCp?.formattedTranscript && txSegments.length > 0) {
        try {
          const dr = await fetch('/api/meetings/diarize', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              segments: txSegments,
              participants: fetchedParticipants.length > 0
                ? fetchedParticipants
                : (nmMode === 'offline' && offlineParticipants.length > 0
                    ? offlineParticipants.map((n: string) => ({ name: n, role: 'attendee' }))
                    : empNames.map((n: string) => ({ name: n, role: 'attendee' }))),
              meetingTitle: nmTitle,
            }),
          })
          const dd = await safeJson(dr, 'Diarize').catch(() => ({}))
          if (dd && dd.formattedTranscript) {
            fmtTranscript = dd.formattedTranscript
            await save({ formattedTranscript: fmtTranscript, lastStep: 'diarizing' })
          }
        } catch { }
      }

      let notes = existingCp?.procData
      if (!notes) {
        setRecStep('processing')
        const nr = await fetchWithTimeout('/api/meetings/process', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: fmtTranscript || transcript, title: nmTitle }),
        }, STEP_TIMEOUTS.processing, 'Processing')
        const nd = await safeJson(nr, 'Process')
        if (!nr.ok) throw new Error(nd.error || 'Processing failed')
        notes = nd
        await save({ lastStep: 'processing' })  // don't save large procData to checkpoint
      }

      setRecStep('saving')
      const sr = await fetchWithTimeout('/api/meetings/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nmTitle || 'Untitled Meeting',
          meeting_type: nmMode, platform: nmPlatform,
          recorded_at: recordedAt, duration_sec: finalElapsed,
          audio_url: audioUrl,
          transcript,
          diarized_transcript: fmtTranscript || null,   // ← ADD
          summary: notes?.summary,
          action_items: notes?.action_items,
          key_decisions: notes?.key_decisions,
          participants: fetchedParticipants.length > 0
            ? fetchedParticipants
            : (nmMode === 'offline' && offlineParticipants.length > 0
                ? offlineParticipants.map((n: string) => ({ name: n, email: '', role: 'attendee', accepted: true }))
                : []),
          recorded_by: me.email,            // Phase 2: stamp the recorder
          recorded_by_name: me.name,
        }),
      }, STEP_TIMEOUTS.saving, 'Save')
      const sd = await safeJson(sr, 'Save')
      if (!sr.ok) throw new Error(sd.error || 'Save failed')
      const savedId = sd.id
      await save({ meetingId: savedId, lastStep: 'saving' })

      setRecStep('extracting')
      let tasksCount = 0
      try {
        const er = await fetchWithTimeout('/api/meetings/extract-tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id:           savedId,
            meeting_title:        nmTitle || 'Untitled Meeting',
            transcript:           transcript,
            formatted_transcript: fmtTranscript || transcript,
            participants:         fetchedParticipants.length > 0
              ? fetchedParticipants
              : empNames.map((n: string) => ({ name: n, role: 'attendee' })),
          }),
        }, STEP_TIMEOUTS.extracting, 'Extract tasks')
        const ed = await safeJson(er, 'Extract tasks')
        tasksCount = ed.tasks_created || 0
      } catch (e) { console.warn('[extracting]', e) }
      await save({ lastStep: 'extracting' })

      setRecTasksCount(tasksCount)
      setRecNotes(notes)
      setRecSavedId(savedId)
      setRecStep('done')
      setRecState('done')
      if (cpId) await clearCheckpoint(cpId)
      await clearActiveRecording()   // Phase 1: audio safely processed, remove from IndexedDB
      setRecoverable(null)
      fetchMeetings()
    } catch (err: any) {
      console.error('[pipeline error]', err)
      await save({ errorStep: recStep || 'unknown', errorMessage: err.message })
      setRecErrorMsg(err.message || 'An error occurred')
      setRecState('error')
    }
  }

  async function resumePipeline(cp: PipelineCheckpoint) {
    setNmTitle(cp.title || '')
    setNmMode(cp.mode as any || 'online')
    setNmPlatform(cp.platform as any || 'meet')
    if (cp.participants?.length) {
      setParticipantNote(`✓ ${cp.participants.length} participants restored`)
      setRecParticipants(cp.participants)
    }
    // Phase 1: if upload already done, blob not needed. Otherwise rebuild from
    // memory OR IndexedDB (survives tab close / reload).
    let audioBlob = new Blob([], { type: 'audio/webm' })
    if (!cp.audioUrl) {
      if (audioBlobRef.current && audioBlobRef.current.size > 1024) {
        audioBlob = audioBlobRef.current
      } else {
        const stored = await getActiveRecording()
        if (stored) audioBlob = blobFromStored(stored)
      }
    }
    await runRecPipeline(audioBlob, cp.recordedAt || new Date().toISOString(), cp.participants || [], cp)
  }

  // Toggle mic mute — sets gain to 0/1 (silences mic in recording, keeps tab audio)
  function toggleMic() {
    const next = !micMuted
    setMicMuted(next)
    if (micGainRef.current) {
      micGainRef.current.gain.value = next ? 0 : 1
    }
  }

  // Restart — discard current recording and begin fresh from 0:00 (with confirm)
  async function restartRecording() {
    const mins = Math.floor(recElapsed / 60)
    const secs = recElapsed % 60
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
    const ok = window.confirm(
      `Discard the current recording (${timeStr}) and start over from 0:00?\n\nThis cannot be undone.`
    )
    if (!ok) return

    // Tear down current recorder + stream WITHOUT processing
    try { if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.ondataavailable = null
      mediaRecRef.current.onstop = null
      mediaRecRef.current.stop()
    }} catch {}
    stopRecTimer()
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioChunks.current = []
    audioBlobRef.current = null
    micGainRef.current = null
    micStreamRef.current = null
    setMicMuted(false)
    setRecElapsed(0)
    recElapsedRef.current = 0
    await clearActiveRecording().catch(() => {})

    // Start a brand new recording immediately
    await startRecording()
  }

  function resetRecorder() {
    clearActiveRecording().catch(() => {})   // Phase 1: discard persisted audio
    setRecoverable(null)
    setMicMuted(false); micGainRef.current = null; micStreamRef.current = null
    setRecState('idle'); setRecStep(null); setRecElapsed(0)
    setRecErrorMsg(''); setRecNotes(null); setRecSavedId(null)
    setRecTasksCount(0); setRecParticipants([]); setParticipantNote('')
    setNmParsed(null); setNmMeetCode(''); setNmZoomId('')
    setMeetingOpened(false)
    setIsResuming(false)
    setOfflineParticipants([])
    setShowManualInput(false)
    setManualName('')
    stopRecTimer(); cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioBlobRef.current = null
  }

  async function submitManualTask(meetingId: number, meetingTitle: string) {
    if (!addTaskForm.task.trim() || !meetingId) return
    setAddingTask(true)
    try {
      const res = await fetch('/api/meetings/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          meeting_title: meetingTitle,
          task: addTaskForm.task.trim(),
          priority: addTaskForm.priority,
          assignee: addTaskForm.assignee || null,
          deadline: addTaskForm.deadline || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Add to local meeting state so it appears immediately
        const newTask: ActionItem = {
          task: addTaskForm.task.trim(),
          owner: addTaskForm.assignee || '',
          deadline: addTaskForm.deadline || 'Not specified',
          priority: addTaskForm.priority as any,
          status: 'pending',
        }
        setMeetingTasksCache(prev => {
          const existing = prev[meetingId] || []
          const updated = [...existing, newTask]
          setTPopup(p => p ? { ...p, m: { ...p.m, ai: updated } } : p)
          return { ...prev, [meetingId]: updated }
        })
        setAddTaskForm({ task: '', assignee: '', priority: 'medium', deadline: '' })
        setShowAddTask(false)
      }
    } catch (e) { console.error('[submitManualTask]', e) }
    finally { setAddingTask(false) }
  }


  async function callGAS(action: string, tasks: any[]) {
    if (!GAS_URL) { console.warn('GAS_URL not set'); return false }

    try {
      var newUrl = new URL(GAS_URL)
      newUrl.searchParams.set('action', action)
      const res = await fetch(newUrl, {
        method: 'POST',
        body: JSON.stringify({ action, tasks }),
      })
      const data = await res.json()
      return data.success !== false
    } catch (e) {
      console.error('[callGAS]', e)
      return false
    }
  }

  async function handleTaskAction(action: 'delegate' | 'ht' | 'email', key: string, taskObj: any, meeting: Meeting, tidx: number) {
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      const ok = await callGAS(action, [{
        task: taskObj.task, assignee: taskObj.owner || '',
        priority: taskObj.priority || 'medium', deadline: taskObj.deadline || '',
        meetingTitle: meeting.title,
        meetingDate: meeting.dt ? new Date(meeting.dt).toLocaleDateString('en-IN') : '',
        fromPerson: taskObj.owner || '', fromPersonID: '',
        toPerson: taskObj.owner || '', toPersonID: '',
        department: 'General', challanges: taskObj.task,
        issueLevel: taskObj.priority || 'medium', solution: 'Pending review',
        assignedBy: 'Abhilash Sir',
        assignedByEmail: getEmail(taskObj.owner || ''),
        assigneeEmail: getEmail(taskObj.owner || ''),
      }])

      if (ok) {
        setTaskActions(prev => ({ ...prev, [key]: true }))
        const dbId = (taskObj)._db_id
        const col = action === 'delegate' ? 'delegated' : action === 'ht' ? 'ht_raised' : 'emailed'
        if (dbId) await fetch('/api/meetings/tasks', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: dbId, [col]: true }),
        }).catch(() => { })
      }
    } finally { setActionLoading(prev => ({ ...prev, [key]: false })) }
  }

  async function handleBulkAction(action: 'delegate' | 'ht' | 'email', taskObjs: any[], meeting: Meeting, keys: string[]) {
    const bk = 'bulk-' + action + '-' + meeting.id
    setActionLoading(prev => ({ ...prev, [bk]: true }))
    try {
      const ok = await callGAS(action, taskObjs.map(t => ({
        task: t.task, assignee: t.owner || '',
        priority: t.priority || 'medium', deadline: t.deadline || '',
        meetingTitle: meeting.title,
        meetingDate: meeting.dt ? new Date(meeting.dt).toLocaleDateString('en-IN') : '',
        fromPerson: t.owner || '', fromPersonID: '',
        toPerson: t.owner || '', toPersonID: '',
        department: 'General', challanges: t.task,
        issueLevel: t.priority || 'medium', solution: 'Pending review',
        assigneeEmail: getEmail(t.owner || ''),
      })))
      if (ok) {
        setTaskActions(prev => { const n = { ...prev }; keys.forEach(k => { n[k] = true }); return n })
        const col = action === 'delegate' ? 'delegated' : action === 'ht' ? 'ht_raised' : 'emailed'
        await Promise.allSettled(taskObjs.map(t => {
          const dbId = t._db_id
          if (!dbId) return Promise.resolve()
          return fetch('/api/meetings/tasks', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dbId, [col]: true }),
          })
        }))
      }
    } finally { setActionLoading(prev => ({ ...prev, [bk]: false })) }
  }

  async function saveTask(midx: number, tidx: number, updated: ActionItem) {
    const meeting = meetings[midx]
    const taskList = meetingTasksCache[meeting.id] || meeting.ai
    const oldTask = taskList[tidx]
    const dbId = (oldTask)?._db_id
    setMeetingTasksCache(prev => {
      const cur = [...(prev[meeting.id] || meeting.ai)]; cur[tidx] = updated
      return { ...prev, [meeting.id]: cur }
    })
    setTPopup(prev => {
      if (!prev) return prev
      const cur = [...prev.m.ai]; cur[tidx] = updated
      return { ...prev, m: { ...prev.m, ai: cur } }
    })
    setEditingTask(null)
    if (!dbId) return
    try {
      await fetch('/api/meetings/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dbId, task: updated.task, priority: updated.priority,
          deadline: updated.deadline && updated.deadline !== 'Not specified' ? updated.deadline : null,
          assignee: updated.owner || null,
          company: updated.company || null,
          status: updated.status === 'completed' ? 'done'
            : updated.status === 'in-progress' ? 'in_progress' : 'todo',
        }),
      })
    } catch (e) { console.error('[saveTask]', e) }
  }

  async function deleteTask(midx: number, tidx: number) {
    const meeting = meetings[midx]
    const taskList = meetingTasksCache[meeting.id] || meeting.ai
    const dbId = (taskList[tidx])?._db_id
    setMeetingTasksCache(prev => {
      const cur = [...(prev[meeting.id] || meeting.ai)]; cur.splice(tidx, 1)
      return { ...prev, [meeting.id]: cur }
    })
    setTPopup(prev => {
      if (!prev) return prev
      const cur = [...prev.m.ai]; cur.splice(tidx, 1)
      return { ...prev, m: { ...prev.m, ai: cur } }
    })
    if (!dbId) return
    try {
      await fetch('/api/meetings/tasks', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dbId }),
      })
    } catch (e) { console.error('[deleteTask]', e) }
  }

  async function deleteMeeting(id: number) {
    try {
      const res = await fetch(`/api/meetings/${id}?email=${encodeURIComponent(me.email)}&role=${encodeURIComponent(me.role)}`, { method: 'DELETE' })
      if (res.ok) {
        const next = meetings.filter((m) => m.id !== id)
        setMeetings(next)
        setAllMeetings(prev => prev.filter((m) => m.id !== id))
      }
    } catch (e) {
      console.error('[deleteMeeting]', e)
    }
    setDelPopup(null)
  }





  const KPI_CFG = [
    { label: 'Total Meetings', val: kpis.total, icon: '📋', bg: '#eff6ff', border: '#93c5fd', valColor: '#1e3a5f', iconBg: '#dbeafe' },
    { label: 'Online', val: kpis.online, icon: '🖥', bg: '#ecfdf5', border: '#6ee7b7', valColor: '#14532d', iconBg: '#d1fae5' },
    { label: 'Offline', val: kpis.offline, icon: '🎙', bg: '#f5f3ff', border: '#c4b5fd', valColor: '#4c1d95', iconBg: '#ede9fe' },
    { label: 'Action Items', val: kpis.actions, icon: '✅', bg: '#fff1f2', border: '#fca5a5', valColor: '#7f1d1d', iconBg: '#fee2e2' },
    { label: 'Key Decisions', val: kpis.decisions, icon: '🔑', bg: '#fdf2f8', border: '#f9a8d4', valColor: '#701a75', iconBg: '#fce7f3' },
  ]

  return (
    <DashboardLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes modalIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes kfade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

        /* ── Mobile: table rows become cards ── */
        @media (max-width: 767px) {
          .mtg-table thead { display: none; }
          .mtg-table, .mtg-table tbody, .mtg-table tr, .mtg-table td { display: block; width: 100%; }
          .mtg-table tr { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; padding: 10px 12px; background: #fff; }
          .mtg-table td { padding: 4px 0 !important; border: none !important; font-size: 12px; }
          .mtg-table td[data-label]::before { content: attr(data-label); font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 2px; letter-spacing: 0.05em; }
          .mtg-table td[data-label="S.No"] { display: none; }
          .mtg-overflow { overflow-x: visible !important; }
        }

        /* ── Tablet: horizontal scroll for table ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .mtg-overflow { overflow-x: auto; }
        }

        /* ── Modal responsive ── */
        @media (max-width: 640px) {
          .modal-wide { max-width: 100% !important; margin: 0 8px !important; }
          .modal-wrap { padding: 8px !important; padding-top: 10px !important; }
        }

        /* ── Header action buttons ── */
        @media (max-width: 640px) {
          .header-actions { flex-wrap: wrap; gap: 6px !important; }
          .header-actions span { display: none; }
        }

        /* ── KPI cards — reduce padding on mobile ── */
        @media (max-width: 640px) {
          .kpi-card { padding: 12px !important; }
          .kpi-card .kpi-val { font-size: 22px !important; }
        }
          .cal2-day { height: 110px; overflow: hidden; }
        .cal2-day:hover { background: #f9fafb !important; }
        .cal2-event:hover { opacity: 0.8; }
        .cal2-event { cursor: pointer; }
      `}</style>
      <div style={{ background: '#f4f6fa', minHeight: '100vh', width: '100%', fontFamily: "'Geist','Inter',sans-serif" }}>

        {/* ── Hero Banner ────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden -mt-6 sm:-mt-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-6"
          style={{
            background: 'linear-gradient(135deg,#0f1f45 0%,#162d6b 45%,#1a3080 100%)',
            borderBottom: '1px solid rgba(29,78,216,0.2)',
            boxShadow: '0 4px 24px rgba(15,31,69,0.3)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to right,rgba(29,78,216,0.05),transparent,rgba(99,102,241,0.08))' }} />
          <div className="absolute -top-10 left-1/4 w-96 h-28 rounded-full pointer-events-none"
            style={{ background: 'rgba(59,130,246,0.08)', filter: 'blur(48px)' }} />
          <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6">
            <BackButton className="mb-4" />
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg,rgba(59,130,246,0.3) 0%,rgba(99,102,241,0.2) 100%)',
                    border: '1px solid rgba(147,197,253,0.2)',
                    boxShadow: '0 0 24px rgba(59,130,246,0.2)',
                  }}>
                  <StickyNote className="h-7 w-7" style={{ color: '#bfdbfe' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
                    style={{ color: '#f0f7ff' }}>
                    Meeting Insights
                  </h1>
                  <p className="text-sm mt-1.5"
                    style={{ color: 'rgba(147,197,253,0.55)' }}>
                    Centralize all your meetings, recordings, and notes in one place
                  </p>
                </div>
              </div>
              <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                <div className="rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(147,197,253,0.15)',
                  }}>
                  <p className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(147,197,253,0.55)' }}>Last Updated</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(240,247,255,0.85)' }}>
                    {lastUpd}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* ── Filters ─────────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'visible', position: 'relative', zIndex: 2 }}>
            <div style={{ background: 'linear-gradient(to right,#eff6ff,#fff,#eef2ff)', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔍</div>
                {/* <span style={{ fontSize: 14 }}>🔍</span> */}
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f' }}>Filters & Search</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }} className="hidden sm:block">Refine your meeting feed using smart parameters</span>
              </div>
              <button
                onClick={clearFilters}
                style={{
                  fontSize: 12, padding: '6px 14px',
                  background: 'linear-gradient(to right,#1e3a5f,#1d4ed8)',
                  color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Clear Filters
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f', display: 'block', marginBottom: 6 }}>Search Meetings</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: 12, color: '#94a3b8' }}>🔎</span>
                  <input
                    type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Title, participant..."
                    style={{
                      width: '100%', height: 40, paddingLeft: 28, paddingRight: 12,
                      fontSize: 12, border: '1px solid #bfdbfe', borderRadius: 6,
                      background: '#fff', color: '#1e293b', outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 1px rgba(29,78,216,0.2)' }}
                    onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f', display: 'block', marginBottom: 6 }}>Date Range</label>
                <div className="relative">
                  <button onClick={() => setDateDropOpen(!dateDropOpen)}
                    style={{
                      width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 12px', fontSize: 12, border: '1px solid #bfdbfe', borderRadius: 6,
                      background: '#fff', color: '#1e293b', cursor: 'pointer',
                    }}>
                    <span>{dateFilter}</span>
                    <span style={{ color: '#94a3b8' }}>▾</span>
                  </button>
                  {dateDropOpen && (
                    <div style={{
                      position: 'absolute', zIndex: 20, top: 44, left: 0,
                      borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      width: 192, paddingTop: 4, paddingBottom: 4,
                      background: '#fff', border: '1px solid #e2e8f0',
                    }}>
                      {DATE_OPTIONS.map((o) => (
                        <button key={o} onClick={() => { setDateFilter(o); setDateDropOpen(false) }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '8px 14px',
                            fontSize: 12, cursor: 'pointer', background: dateFilter === o ? '#eff6ff' : 'transparent',
                            color: dateFilter === o ? '#1d4ed8' : '#1e293b',
                            fontWeight: dateFilter === o ? 600 : 400, border: 'none',
                          }}
                          onMouseEnter={e => { if (dateFilter !== o) (e.target as HTMLElement).style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (dateFilter !== o) (e.target as HTMLElement).style.background = 'transparent' }}
                        >
                          {o} {dateFilter === o && <span style={{ float: 'right' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Custom Range date inputs — appear only when selected */}
                {dateFilter === 'Custom Range' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      style={{ flex: 1, height: 34, padding: '0 8px', fontSize: 11, border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e293b', outline: 'none' }} />
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      style={{ flex: 1, height: 34, padding: '0 8px', fontSize: 11, border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e293b', outline: 'none' }} />
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f', display: 'block', marginBottom: 6 }}>Meeting Type</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    width: '100%', height: 40, padding: '0 12px', fontSize: 12,
                    border: '1px solid #bfdbfe', borderRadius: 6, background: '#fff',
                    color: '#1e293b', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 1px rgba(29,78,216,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none' }}>
                  <option>All</option><option>Online</option><option>Offline</option>
                </select>
              </div>

              {/* Platform */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f', display: 'block', marginBottom: 6 }}>Platform</label>
                <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
                  style={{
                    width: '100%', height: 40, padding: '0 12px', fontSize: 12,
                    border: '1px solid #bfdbfe', borderRadius: 6, background: '#fff',
                    color: '#1e293b', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 1px rgba(29,78,216,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none' }}>
                  {PLATFORMS_FILTER.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* Recorded By — admins only: filter meetings by who recorded them */}
              {isAdmin && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f', display: 'block', marginBottom: 6 }}>Recorded By</label>
                  <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}
                    style={{
                      width: '100%', height: 40, padding: '0 12px', fontSize: 12,
                      border: '1px solid #bfdbfe', borderRadius: 6, background: '#fff',
                      color: '#1e293b', outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 1px rgba(29,78,216,0.2)' }}
                    onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none' }}>
                    <option value="">All People</option>
                    {recorderOptions.map(r => (
                      <option key={r.email} value={r.email}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── KPI Cards ──────────────────────────────────────────────────── */}

          <div className="mt-5">

            {/* ================= KPI WRAPPER ================= */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'visible', position: 'relative', zIndex: 1 }}>
              <div style={{ background: 'linear-gradient(to right,#eff6ff,#fff,#eef2ff)', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                <div className="flex items-center gap-3">

                  {/* ICON */}
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
                  {/* <span style={{ fontSize: 14 }}>📊</span> */}

                  {/* TEXT */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e3a5f' }}>
                      Key Performance Indicators
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }} className="hidden sm:block">
                      Overview of order metrics & performance
                    </span>
                  </div>

                </div>




              </div>

              {/* ================= KPI GRID ================= */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

                {/* TOTAL ORDERS */}
                {KPI_CFG.map((k) => (
                  <div key={k.label} className="kpi-card" style={{
                    padding: 20, borderRadius: 12,
                    background: k.bg, border: `1px solid ${k.border}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', marginBottom: 8 }}>{k.label}</p>
                        <p className="kpi-val" style={{ fontSize: 30, fontWeight: 700, color: k.valColor, lineHeight: 1 }}>{k.val}</p>
                      </div>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: k.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                      }}>{k.icon}</div>
                    </div>
                  </div>
                ))}


              </div>
            </div>
          </div>
          {/* <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"> */}

          {/* </div> */}

          {/* ── Main Table Card ─────────────────────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

            {/* Card Header */}
            <div style={{ background: 'linear-gradient(to right,#dbeafe,#fff,#e0e7ff)', borderBottom: '1px solid #e2e8f0', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎙</div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Meeting Records</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{filtered.length} total meetings</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Resume Banner */}
                {showResumeBanner && resumeCheckpoint && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#FFFBF0', border: '1px solid #fde68a', borderRadius: 8,
                    padding: '8px 14px', flexWrap: 'wrap',
                  }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#854F0B', margin: 0 }}>
                        ⚡ "{resumeCheckpoint.title || 'Untitled'}" — incomplete
                      </p>
                      <p style={{ fontSize: 10, color: '#a16207', margin: 0 }}>
                        Stopped at: {resumeCheckpoint.errorStep || resumeCheckpoint.lastStep}
                        {resumeCheckpoint.createdAt && ` · ${new Date(resumeCheckpoint.createdAt).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <button onClick={async () => {
                      setShowResumeBanner(false)
                      setNmTitle(resumeCheckpoint.title || '')
                      setNmMode(resumeCheckpoint.mode as any || 'online')
                      setNmPlatform(resumeCheckpoint.platform as any || 'meet')
                      setNmMeetCode(resumeCheckpoint.meetCode || '')
                      if (resumeCheckpoint.participants?.length) {
                        setParticipantNote(`✓ ${resumeCheckpoint.participants.length} participants restored`)
                      }
                      setIsResuming(true)
                      setNewMtgOpen(true)
                      await resumePipeline(resumeCheckpoint)
                    }}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      ▶ Resume
                    </button>
                    <button onClick={async () => {
                      const id = resumeCheckpoint.id
                      if (id) await clearCheckpoint(id)
                      setShowResumeBanner(false); setResumeCheckpoint(null)
                    }}
                      style={{ fontSize: 11, padding: '5px 10px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                      Discard
                    </button>
                  </div>
                )}

                {/* Calendar popup button — always visible */}
                <button
                  onClick={() => { setCalendarPopupOpen(true); setCalSelected(null) }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    background: 'linear-gradient(to right,#1e3a5f,#1d4ed8)',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(29,78,216,0.2)',
                  }}>
                  📅 Calendar
                </button>

                <button
                  onClick={() => { setNewMtgOpen(true); setNmTitle(''); setNmUrl(''); setNmMode('online'); setNmPlatform('meet') }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, padding: '6px 14px',
                    background: '#1c2333', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2d3748')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1c2333')}
                >
                  + Add New Meeting
                </button>
                <span style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
                  background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                }}>
                  {filtered.length} Records
                </span>
              </div>
            </div>

            {/* Meetings Table — always shown */}
            <div className="overflow-x-auto mtg-overflow" style={{ position: 'relative' }}>
              <table className="mtg-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, tableLayout: 'fixed', minWidth: isAdmin ? 1440 : 1280 }}>
                <colgroup>
                  <col style={{ width: 40 }} />A
                  <col style={{ width: 90 }} />B
                  <col style={{ width: 160 }} />C
                  {isAdmin && <col style={{ width: 100 }} />} Extra
                  <col style={{ width: 70 }} />D
                  <col style={{ width: 105 }} />E
                  <col style={{ width: 115 }} />F
                  <col style={{ width: 150 }} />G
                  <col style={{ width: 100 }} />H
                  <col style={{ width: 100 }} />I
                  <col style={{ width: 100 }} />J
                  <col style={{ width: 110 }} />K
                  <col style={{ width: 210 }} />L
                </colgroup>
                <thead>
                  <tr style={{ background: '#1e3a5f', borderBottom: '1px solid #e2e8f0' }}>
                    {/* Frozen column 1 — S.No */}
                    <th style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: 10,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden',
                      position: 'sticky', left: 0, zIndex: 3, background: '#1e3a5f',

                    }}>S.No</th>

                    {/* Frozen column 2 — Date & Time (left = col1 width = 40px) */}
                    <th style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: 10,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden',
                      position: 'sticky', left: 40, zIndex: 3, background: '#1e3a5f',

                    }}>Date & Time</th>

                    {/* Frozen column 3 — Title (left = col1 + col2 = 40 + 90 = 130px) */}
                    <th style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: 10,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden',
                      position: 'sticky', left: 130, zIndex: 3, background: '#1e3a5f',
                      borderRight: '2px solid #3b6ea5',
                    }}>Title</th>

                    {/* Remaining columns — normal */}
                    {[...(isAdmin ? ['Recorded By'] : []), 'Duration', 'Type', 'Platform', 'Summary', 'Recording', 'Participants', 'Action Items', 'Key Decisions', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left', fontSize: 10,
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                        color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden',
                        width: h === 'Recorded By' ? 140 : h === 'Summary' ? 220 : h === 'Actions' ? 180 : 'auto',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 13 : 12} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                          <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTop: '2px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          Loading meetings...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 13 : 12} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        No meetings found.{' '}
                        {/* <button onClick={() => router.push('/meetings/record')}
                          style={{ color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                          Record your first meeting →
                        </button> */}
                      </td>
                    </tr>
                  ) : pageRows.map((m, i) => {
                    const high = m.ai.filter((a) => a.priority === 'high').length
                    const med = m.ai.filter((a) => a.priority === 'medium').length
                    const lo = m.ai.filter((a) => a.priority === 'low').length
                    return (
                      <tr key={m.id}
                        style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb', transition: 'background .1s' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8fafc'
                          e.currentTarget.querySelectorAll<HTMLElement>('td[data-sticky]').forEach(td => td.style.background = '#f8fafc')
                        }}
                        onMouseLeave={(e) => {
                          const bg = i % 2 === 0 ? '#fff' : '#f9fafb'
                          e.currentTarget.style.background = bg
                          e.currentTarget.querySelectorAll<HTMLElement>('td[data-sticky]').forEach(td => td.style.background = bg)
                        }}
                      >
                        {/* S.No */}
                        <td data-label="S.No" style={{
                          padding: '10px 12px', color: '#94a3b8', fontWeight: 500,
                          position: 'sticky', left: 0, zIndex: 1,
                          background: i % 2 === 0 ? '#fff' : '#f9fafb',

                        }}>
                          {(page - 1) * rowsPerPage + i + 1}
                        </td>

                        {/* Date & Time */}
                        <td data-label="Date & Time" style={{
                          padding: '10px 12px',
                          position: 'sticky', left: 40, zIndex: 1,
                          background: i % 2 === 0 ? '#fff' : '#f9fafb',

                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{fmtDate(m.dt)}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtTime(m.dt)}</div>
                        </td>

                        {/* Title */}
                        <td data-label="Title" style={{
                          padding: '10px 12px', fontWeight: 600, color: '#1e293b', lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          position: 'sticky', left: 130, zIndex: 1,
                          background: i % 2 === 0 ? '#fff' : '#f9fafb',
                          borderRight: '2px solid #d1d5db',
                        }}>
                          {m.title}
                        </td>

                        {/* Recorded By — admins only */}
                        {isAdmin && (
                          <td data-label="Recorded By" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 22, height: 22, borderRadius: 11, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#1d4ed8' }}>
                                {(m.recorded_by_name || m.recorded_by || '?').charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 11, color: '#475569' }}>{m.recorded_by_name || m.recorded_by || '—'}</span>
                            </div>
                          </td>
                        )}

                        {/* Duration */}
                        <td data-label="Duration" style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          ⏱ {fmtDur(m.dur)}
                        </td>

                        {/* Type badge */}
                        <td data-label="Type" style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                            ...(m.tp === 'online'
                              ? { background: '#ecfdf5', color: '#166534', border: '1px solid #6ee7b7' }
                              : { background: '#f5f3ff', color: '#5b21b6', border: '1px solid #c4b5fd' }),
                          }}>
                            {m.tp === 'online' ? '🖥 Online' : '🎙 Offline'}
                          </span>
                        </td>

                        {/* Platform badge */}
                        <td data-label="Platform" style={{ padding: '10px 12px' }}>
                          {m.pl ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                              ...(m.pl === 'meet'
                                ? { background: '#ecfdf5', color: '#166534', border: '1px solid #6ee7b7' }
                                : m.pl === 'zoom'
                                  ? { background: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd' }
                                  : m.pl === 'teams'
                                    ? { background: '#f5f3ff', color: '#5b21b6', border: '1px solid #c4b5fd' }
                                    : { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }),
                            }}>
                              <PlatformLogo platform={m.pl} size={12} />
                              {PLATFORM_LABELS[m.pl]}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                          )}
                        </td>

                        {/* Summary + tooltip */}
                        <td data-label="Summary" style={{ padding: '10px 12px', maxWidth: 150 }}>
                          <div style={{ position: 'relative' }}
                            onMouseEnter={() => setHoveredSummary(m.id)}
                            onMouseLeave={() => setHoveredSummary(null)}>
                            <p style={{
                              fontSize: 11, color: '#64748b', lineHeight: 1.4,
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            } as React.CSSProperties}>
                              {m.summary}
                            </p>
                            {hoveredSummary === m.id && (
                              <div style={{
                                position: 'absolute', zIndex: 40,
                                bottom: 'calc(100% + 6px)', left: 0, width: 260,
                                background: '#1e293b', color: '#f0f7ff',
                                fontSize: 11, lineHeight: 1.6, borderRadius: 8,
                                padding: '8px 12px', pointerEvents: 'none',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                              }}>
                                {m.summary}
                                <div style={{
                                  position: 'absolute', top: '100%', left: 12,
                                  width: 0, height: 0,
                                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                                  borderTop: '5px solid #1e293b',
                                }} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Recording */}
                        <td data-label="Recording" style={{ padding: '10px 12px' }}>
                          {m.audio_url ? (
                            <button onClick={() => setAudioPopup({ m })}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 10, fontWeight: 600, color: '#1e3a5f',
                                background: '#eff6ff', padding: '3px 9px', borderRadius: 7,
                                border: '1px solid #93c5fd', cursor: 'pointer',
                              }}>
                              🎧 Listen
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                          )}
                        </td>

                        {/* Participants */}
                        <td data-label="Participants" style={{ padding: '10px 12px' }}>
                          <button onClick={() => setPPopup({ m })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, fontWeight: 600, color: '#1e40af',
                              background: '#eff6ff', padding: '3px 9px', borderRadius: 7,
                              border: '1px solid #93c5fd', cursor: 'pointer',
                            }}>
                            👥 {m.pa.length}
                          </button>
                        </td>

                        {/* Action Items */}
                        <td data-label="Action Items" style={{ padding: '10px 12px' }}>
                          <button onClick={() => setAPopup({ m })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{m.ai.length} items</div>
                            <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                              {high > 0 && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#FCEBEB', color: '#791F1F', border: '0.5px solid #fca5a5' }}>H:{high}</span>}
                              {med > 0 && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#FFFBF0', color: '#854F0B', border: '0.5px solid #fde68a' }}>M:{med}</span>}
                              {lo > 0 && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#ecfdf5', color: '#166534', border: '0.5px solid #6ee7b7' }}>L:{lo}</span>}
                            </div>
                          </button>
                        </td>

                        {/* Key Decisions */}
                        <td data-label="Key Decisions" style={{ padding: '10px 12px' }}>
                          <button onClick={() => setDPopup({ m })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, fontWeight: 600, color: '#5b21b6',
                              background: '#f5f3ff', padding: '3px 9px', borderRadius: 7,
                              border: '1px solid #c4b5fd', cursor: 'pointer',
                            }}>
                            🔑 {m.kd.length}
                          </button>
                        </td>

                        {/* Actions */}
                        <td data-label="Actions" style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap', flexShrink: 0 }}>
                            <button onClick={() => setNPopup({ m })}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                fontSize: 10, fontWeight: 600, color: '#1e3a5f',
                                background: '#eff6ff', padding: '4px 8px', borderRadius: 6,
                                border: '1px solid #bfdbfe', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>
                              📄 Notes
                            </button>
                            <button onClick={async () => {
                              const midx = meetings.indexOf(m)
                              setTasksLoading(true)
                              try {
                                const res = await fetch(`/api/meetings/tasks?meeting_id=${m.id}&limit=100`)
                                const data = await res.json()
                                const dbTasks: any[] = (data.tasks || []).map((t: any) => ({
                                  task: t.task, owner: t.assignee || '',
                                  deadline: t.deadline || 'Not specified',
                                  priority: t.priority || 'medium',
                                  status: t.status === 'done' ? 'completed'
                                    : t.status === 'in_progress' ? 'in-progress' : 'pending',
                                  company: t.company || '',
                                  _db_id: t.id, _delegated: !!t.delegated,
                                  _ht: !!t.ht_raised, _emailed: !!t.emailed,
                                }))
                                const dbTexts = new Set(dbTasks.map((t: any) => t.task.trim().toLowerCase()))
                                const unsaved = m.ai.filter(ai => !dbTexts.has(ai.task.trim().toLowerCase()))
                                const merged = [...dbTasks, ...unsaved]
                                setMeetingTasksCache(prev => ({ ...prev, [m.id]: merged }))
                                const restored: Record<string, boolean> = {}
                                dbTasks.forEach((t: any, i: number) => {
                                  if (t._delegated) restored[`delegate-${m.id}-${i}`] = true
                                  if (t._ht) restored[`ht-${m.id}-${i}`] = true
                                  if (t._emailed) restored[`email-${m.id}-${i}`] = true
                                })
                                setTaskActions(prev => ({ ...prev, ...restored }))
                                setTPopup({ m: { ...m, ai: merged }, midx })
                              } catch { setTPopup({ m, midx }) }
                              finally { setTasksLoading(false) }
                            }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                fontSize: 10, fontWeight: 600, color: '#166534',
                                background: '#ecfdf5', padding: '4px 8px', borderRadius: 6,
                                border: '1px solid #6ee7b7', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>
                              {tasksLoading ? '⏳' : '✅'} Tasks
                            </button>
                            <button onClick={() => setDelPopup({ m })}
                              style={{
                                display: 'inline-flex', alignItems: 'center',
                                fontSize: 10, color: '#791F1F',
                                background: '#FCEBEB', padding: '4px 7px', borderRadius: 6,
                                border: '1px solid #fca5a5', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                Rows
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(+e.target.value); setPage(1) }}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontSize: 12, background: '#fff', color: '#1e293b', outline: 'none' }}>
                  {[5, 10, 25].map((n) => <option key={n}>{n}</option>)}
                </select>
                <span style={{ color: '#94a3b8' }}>
                  Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                Page {page} of {totalPages}
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1, fontSize: 14,
                  }}>‹</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.3 : 1, fontSize: 14,
                  }}>›</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Calendar Popup Modal ───────────────────────────────────────────── */}
        {calendarPopupOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => e.target === e.currentTarget && setCalendarPopupOpen(false)}
          >
            <div style={{
              width: '100%', maxWidth: 1100, maxHeight: '90vh',
              background: '#fff', borderRadius: 16,
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column',
              animation: 'modalIn 0.2s ease',
              overflow: 'hidden',
            }}>
              {/* ── Top bar ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Calendar</h2>
                  {calLoading && <div style={{ width: 16, height: 16, border: '2px solid #e5e7eb', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={fetchCalendar}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                  >↻ Refresh</button>
                  <button
                    onClick={() => setCalendarPopupOpen(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              </div>

              {/* ── Body ── */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Not connected */}
                {!isGoogleConnected && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <div style={{ textAlign: 'center', maxWidth: 380 }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Google Calendar</p>
                      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>
                        See all your meetings in a calendar view. Google Meet and Zoom links are auto-detected.
                      </p>
                      <button
                        onClick={() => { setCalSigningIn(true); sessionStorage.setItem('cal_return', '1'); signIn('google', { redirect: true, callbackUrl: window.location.href }) }}
                        disabled={calSigningIn}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: calSigningIn ? 0.7 : 1 }}
                      >
                        {calSigningIn ? '⏳ Connecting...' : '🔑 Connect Google Account'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Scope error */}
                {isGoogleConnected && calError === '__SCOPE__' && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '24px 28px', maxWidth: 440 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>📅 Calendar permission needed</p>
                      <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, marginBottom: 18 }}>
                        Your Google account is connected but calendar access wasn't granted. Click below to grant permission.
                      </p>
                      <button
                        onClick={() => { sessionStorage.setItem('cal_return', '1'); signIn('google', { redirect: true, callbackUrl: window.location.href }) }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        🔑 Grant Calendar Access
                      </button>
                    </div>
                  </div>
                )}

                {/* Generic error */}
                {isGoogleConnected && calError && calError !== '__SCOPE__' && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '20px 24px', display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>⚠️</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>{calError}</p>
                        <button onClick={fetchCalendar} style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Try again</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Calendar UI ── */}
                {isGoogleConnected && !calError && (() => {
                  const calCells = buildCalendarGrid(calViewYear, calViewMonth)
                  const calWeeks: (Date | null)[][] = []
                  for (let i = 0; i < calCells.length; i += 7) calWeeks.push(calCells.slice(i, i + 7))
                  const calCurrentYear = today.getFullYear()
                  const getMtgsForDay = (date: Date) =>
                    calMeetings.filter(m => m.start && calIsSameDay(new Date(m.start), date))
                      .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())

                  // Platform → color config for new design
                  const PILL_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
                    meet: { bg: '#fee2e2', dot: '#ef4444', text: '#991b1b' },
                    zoom: { bg: '#dbeafe', dot: '#3b82f6', text: '#1e40af' },
                    teams: { bg: '#ede9fe', dot: '#8b5cf6', text: '#5b21b6' },
                    live: { bg: '#fee2e2', dot: '#ef4444', text: '#991b1b' },
                    other: { bg: '#d1fae5', dot: '#10b981', text: '#065f46' },
                  }
                  const getPillColor = (m: CalendarMeeting) => {
                    if (m.status === 'live') return PILL_COLOR.live
                    return m.platform ? (PILL_COLOR[m.platform] || PILL_COLOR.other) : PILL_COLOR.other
                  }

                  // Mini calendar helpers
                  const miniCells = buildCalendarGrid(calViewYear, calViewMonth)

                  return (
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                      {/* ── LEFT SIDEBAR ── */}
                      <div style={{ width: 180, flexShrink: 0, borderRight: '1px solid #f3f4f6', padding: '20px 16px', overflowY: 'auto', background: '#fafafa' }}>

                        {/* Platform filters legend */}
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 10, marginTop: 0 }}>Filters</p>
                        {[
                          { label: 'Google Meet', color: '#ef4444', bg: '#fee2e2' },
                          { label: 'Zoom', color: '#3b82f6', bg: '#dbeafe' },
                          { label: 'Teams', color: '#8b5cf6', bg: '#ede9fe' },
                          { label: 'Other / Offline', color: '#10b981', bg: '#d1fae5' },
                        ].map(f => (
                          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: f.bg, border: `1.5px solid ${f.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <div style={{ width: 6, height: 6, borderRadius: 1, background: f.color }} />
                            </div>
                            <span style={{ fontSize: 12, color: '#374151' }}>{f.label}</span>
                          </div>
                        ))}

                        {/* Mini calendar */}
                        <div style={{ marginTop: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{CAL_MONTHS[calViewMonth].slice(0, 3)} {calViewYear}</span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button onClick={() => { if (calViewMonth === 0) { if (calViewYear <= calCurrentYear) return; setCalViewYear(y => y - 1); setCalViewMonth(11) } else setCalViewMonth(m => m - 1); setCalSelected(null) }}
                                style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>‹</button>
                              <button onClick={() => { if (calViewMonth === 11) { if (calViewYear >= calCurrentYear) return; setCalViewYear(y => y + 1); setCalViewMonth(0) } else setCalViewMonth(m => m + 1); setCalSelected(null) }}
                                style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>›</button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 4 }}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                              <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#9ca3af', padding: '2px 0' }}>{d}</div>
                            ))}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                            {miniCells.map((date, i) => {
                              const isToday = date ? calIsSameDay(date, today) : false
                              const isSel = date && calSelected && calIsSameDay(date, calSelected.date)
                              const hasMtg = date ? getMtgsForDay(date).length > 0 : false
                              return (
                                <div key={i}
                                  onClick={() => { if (!date) return; const mtgs = getMtgsForDay(date); setCalSelected(isSel ? null : { date, meetings: mtgs }) }}
                                  style={{ textAlign: 'center', fontSize: 10, padding: '3px 0', borderRadius: 4, cursor: date ? 'pointer' : 'default', color: isToday ? '#fff' : date ? '#374151' : 'transparent', background: isToday ? '#4f46e5' : isSel ? '#e0e7ff' : 'transparent', fontWeight: isToday ? 700 : 400, position: 'relative' }}
                                >
                                  {date?.getDate()}
                                  {hasMtg && !isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1', margin: '1px auto 0' }} />}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* ── MAIN CALENDAR ── */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

                        {/* Month nav */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>
                            {CAL_MONTHS[calViewMonth]} {calViewYear}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => { setCalViewYear(today.getFullYear()); setCalViewMonth(today.getMonth()); setCalSelected(null) }}
                              style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500 }}
                            >Today</button>
                            <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                              <button
                                onClick={() => { if (calViewMonth === 0) { if (calViewYear <= calCurrentYear) return; setCalViewYear(y => y - 1); setCalViewMonth(11) } else setCalViewMonth(m => m - 1); setCalSelected(null) }}
                                disabled={calViewMonth === 0 && calViewYear <= calCurrentYear}
                                style={{ width: 30, height: 30, border: 'none', borderRight: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: calViewMonth === 0 && calViewYear <= calCurrentYear ? 0.35 : 1 }}
                              >←</button>
                              <button
                                onClick={() => { if (calViewMonth === 11) { if (calViewYear >= calCurrentYear) return; setCalViewYear(y => y + 1); setCalViewMonth(0) } else setCalViewMonth(m => m + 1); setCalSelected(null) }}
                                disabled={calViewMonth === 11 && calViewYear >= calCurrentYear}
                                style={{ width: 30, height: 30, border: 'none', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: calViewMonth === 11 && calViewYear >= calCurrentYear ? 0.35 : 1 }}
                              >→</button>
                            </div>
                          </div>
                        </div>

                        {/* Day headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{d}</div>
                          ))}
                        </div>

                        {/* Grid */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                          <style>{`
                            .cal2-day:hover { background: #f9fafb !important; }
                            .cal2-event:hover { opacity: 0.8; }
                          `}</style>
                          {calWeeks.map((week, wi) => {
                            // Reorder week: Mon first (screenshot starts Mon)
                            const monFirst = [...week.slice(1), week[0]]
                            return (
                              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: wi < calWeeks.length - 1 ? '1px solid #f3f4f6' : 'none', minHeight: 100 }}>
                                {monFirst.map((date, di) => {
                                  const isToday = date ? calIsSameDay(date, today) : false
                                  const isPast = date && date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                                  const dayMtgs = date ? getMtgsForDay(date) : []
                                  const isSelected = date && calSelected && calIsSameDay(date, calSelected.date)
                                  return (
                                    <div key={di} className="cal2-day"
                                      onClick={() => { if (!date) return; setCalSelected(isSelected ? null : { date, meetings: dayMtgs }) }}
                                      style={{
                                        borderLeft: di > 0 ? '1px solid #f3f4f6' : 'none',
                                        padding: '8px 8px 6px',
                                        background: isSelected ? '#f0f0ff' : '#fff',
                                        cursor: date ? 'pointer' : 'default',
                                        opacity: !date ? 0.3 : 1,
                                        transition: 'background 0.1s',
                                      }}
                                    >
                                      {date && (
                                        <>
                                          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
                                            <span style={{
                                              width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                              borderRadius: '50%', fontSize: 13, fontWeight: isToday ? 700 : 400,
                                              color: isToday ? '#fff' : isPast ? '#9ca3af' : '#111827',
                                              background: isToday ? '#111827' : 'transparent',
                                            }}>{date.getDate()}</span>
                                          </div>
                                          {dayMtgs.slice(0, 3).map((m, mi) => {
                                            const pc = getPillColor(m)
                                            return (
                                              <div key={mi} className="cal2-event"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  if (m.status !== 'ended') {
                                                    setCalendarPopupOpen(false)
                                                    setNmTitle(m.title)
                                                    if (m.meetingUrl) { setNmMode('online'); setNmUrl(m.meetingUrl); setNmPlatform((m.platform as any) || 'meet'); setNmMeetCode(m.meetCode || ''); handleNmUrlChange(m.meetingUrl) }
                                                    else { setNmMode('offline'); setNmUrl(''); setNmMeetCode(''); setNmZoomId(''); setNmParsed(null) }
                                                    setNewMtgOpen(true)
                                                  } else setCalSelected({ date, meetings: dayMtgs })
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: pc.bg, borderRadius: 5, padding: '2px 6px', marginBottom: 2, overflow: 'hidden', cursor: 'pointer' }}
                                              >
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                                                <span style={{ fontSize: 11, color: pc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 500 }}>
                                                  {m.status === 'live' && '● '}{calFmtTime(m.start)} {m.title}
                                                </span>
                                              </div>
                                            )
                                          })}
                                          {dayMtgs.length > 3 && (
                                            <div style={{ fontSize: 10, color: '#6366f1', paddingLeft: 4, marginTop: 1, fontWeight: 600 }}>+{dayMtgs.length - 3} more</div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>

                        {/* Day detail panel */}
                        {/* {calSelected && (
                          <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '14px 20px', flexShrink: 0, maxHeight: 240, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                                {calSelected.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                {calIsSameDay(calSelected.date, today) && (
                                  <span style={{ marginLeft: 8, fontSize: 10, background: '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Today</span>
                                )}
                              </p>
                              <button onClick={() => setCalSelected(null)} style={{ fontSize: 16, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                            </div>
                            {calSelected.meetings.length === 0 ? (
                              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>No meetings scheduled</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {calSelected.meetings.map(m => {
                                  const pc = getPillColor(m)
                                  const canRec = m.status !== 'ended'
                                  const isLive = m.status === 'live'
                                  const isSoon = m.status === 'soon'
                                  return (
                                    <div key={m.id} style={{
                                      background: '#fff', border: '1px solid #e5e7eb',
                                      borderLeft: `3px solid ${pc.dot}`,
                                      borderRadius: 8, padding: '10px 14px',
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                    }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                                          {isLive && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#ef4444', padding: '1px 7px', borderRadius: 20 }}>● LIVE</span>}
                                          <span style={{ fontSize: 11, fontWeight: 600, color: pc.text, background: pc.bg, padding: '1px 8px', borderRadius: 20 }}>
                                            {m.platform ? m.platform.charAt(0).toUpperCase() + m.platform.slice(1) : 'Meeting'}
                                          </span>
                                          {m.participantCount > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>👥 {m.participantCount}</span>}
                                        </div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                                        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                                          {calFmtTime(m.start)} – {calFmtTime(m.end)}
                                          {m.organizer && ` · ${m.organizer}`}
                                        </p>
                                      </div>
                                      {canRec ? (
                                        <button
                                          onClick={() => { setCalendarPopupOpen(false); setNmTitle(m.title); if (m.meetingUrl) { setNmMode('online'); setNmUrl(m.meetingUrl); setNmPlatform((m.platform as any) || 'meet'); setNmMeetCode(m.meetCode || ''); handleNmUrlChange(m.meetingUrl) } else { setNmMode('offline'); setNmUrl(''); setNmMeetCode(''); setNmZoomId(''); setNmParsed(null) } setNewMtgOpen(true) }}
                                          style={{ padding: '7px 16px', background: isLive ? '#ef4444' : isSoon ? '#f59e0b' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                        >
                                          {isLive ? '⏺ Join & Record' : '🎙 Record'}
                                        </button>
                                      ) : m.status === 'ended' ? (
                                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>Ended</span>
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )} */}
                        {/* Day detail popup — floats over calendar */}
                        {calSelected && (
                          <div
                            onClick={() => setCalSelected(null)}
                            style={{
                              position: 'absolute', inset: 0, zIndex: 20,
                              background: 'rgba(0,0,0,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{
                                width: 420, maxWidth: '90%', maxHeight: '70vh',
                                background: '#fff', borderRadius: 14,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
                                border: '1px solid #e5e7eb',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                              }}
                            >
                              {/* Popup header */}
                              <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 18px',
                                background: 'linear-gradient(135deg,#0C447C,#185FA5)',
                                flexShrink: 0,
                              }}>
                                <div>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                                    {calSelected.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                  </p>
                                  {calIsSameDay(calSelected.date, today) && (
                                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '1px 8px', borderRadius: 20, fontWeight: 600, marginTop: 4, display: 'inline-block' }}>Today</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setCalSelected(null)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: 'rgba(255,255,255,0.15)',
                                    border: '1px solid rgba(255,255,255,0.25)',
                                    color: '#fff', cursor: 'pointer',
                                    fontSize: 18, lineHeight: 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >×</button>
                              </div>

                              {/* Popup body */}
                              <div style={{ overflowY: 'auto', padding: '14px 16px', flex: 1 }}>
                                {calSelected.meetings.length === 0 ? (
                                  <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>No meetings scheduled</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {calSelected.meetings.map(m => {
                                      const pc = getPillColor(m)
                                      const canRec = m.status !== 'ended'
                                      const isLive = m.status === 'live'
                                      const isSoon = m.status === 'soon'
                                      return (
                                        <div key={m.id} style={{
                                          background: '#fff', border: '1px solid #e5e7eb',
                                          borderLeft: `3px solid ${pc.dot}`,
                                          borderRadius: 8, padding: '10px 14px',
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                        }}>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                                              {isLive && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#ef4444', padding: '1px 7px', borderRadius: 20 }}>● LIVE</span>}
                                              <span style={{ fontSize: 11, fontWeight: 600, color: pc.text, background: pc.bg, padding: '1px 8px', borderRadius: 20 }}>
                                                {m.platform ? m.platform.charAt(0).toUpperCase() + m.platform.slice(1) : 'Meeting'}
                                              </span>
                                              {m.participantCount > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>👥 {m.participantCount}</span>}
                                            </div>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                                            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                                              {calFmtTime(m.start)} – {calFmtTime(m.end)}
                                              {m.organizer && ` · ${m.organizer}`}
                                            </p>
                                          </div>
                                          {canRec ? (
                                            <button
                                              onClick={() => { setCalSelected(null); setCalendarPopupOpen(false); setNmTitle(m.title); if (m.meetingUrl) { setNmMode('online'); setNmUrl(m.meetingUrl); setNmPlatform((m.platform as any) || 'meet'); setNmMeetCode(m.meetCode || ''); handleNmUrlChange(m.meetingUrl) } else { setNmMode('offline'); setNmUrl(''); setNmMeetCode(''); setNmZoomId(''); setNmParsed(null) } setNewMtgOpen(true) }}
                                              style={{ padding: '7px 16px', background: isLive ? '#ef4444' : isSoon ? '#f59e0b' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                            >
                                              {isLive ? '⏺ Join & Record' : '🎙 Record'}
                                            </button>
                                          ) : m.status === 'ended' ? (
                                            <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>Ended</span>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Participants Modal ─────────────────────────────────────────────── */}
        <Modal open={!!pPopup} onClose={() => setPPopup(null)} title={`👥 Participants — ${pPopup?.m?.title}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(pPopup?.m?.pa ?? []).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0C447C,#1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {p.name?.trim()?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', textTransform: 'capitalize' }}>{p.role}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>

        {/* ── Audio Player Modal ─────────────────────────────────────────────── */}
        <Modal open={!!audioPopup} onClose={() => setAudioPopup(null)} title={`🎧 Recording — ${audioPopup?.m?.title || ''}`}>
          {audioPopup?.m && (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>📅 {audioPopup.m.dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>⏱ {Math.floor(audioPopup.m.dur / 60)}m {audioPopup.m.dur % 60}s</span>
                <span style={{ textTransform: 'capitalize' }}>{audioPopup.m.tp}</span>
              </div>
              <AudioPlayer src={audioPopup.m.audio_url!} fallbackDur={audioPopup.m.dur} />
            </div>
          )}
        </Modal>

        {/* ── Action Items Modal ─────────────────────────────────────────────── */}
        <Modal open={!!aPopup} onClose={() => setAPopup(null)} title={`✅ Action Items — ${aPopup?.m?.title}`} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(aPopup?.m?.ai ?? []).map((a, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', flex: 1, margin: 0 }}>{a.task}</p>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${PRIORITY_COLOR[a.priority]}`}>
                    {a.priority}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>👤 {a.owner} · 📅 {a.deadline}</p>
              </div>
            ))}
          </div>
        </Modal>

        {/* ── Key Decisions Modal ────────────────────────────────────────────── */}
        <Modal open={!!dPopup} onClose={() => setDPopup(null)} title={`🔑 Key Decisions — ${dPopup?.m?.title}`} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(dPopup?.m?.kd ?? []).map((d, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: '#f5f3ff', border: '1px solid #ede9fe', borderLeft: '3px solid #a78bfa' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>{d.decision}</p>
                {d.context && <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{d.context}</p>}
              </div>
            ))}
          </div>
        </Modal>

        {/* ── Meeting Notes Modal ────────────────────────────────────────────── */}
        <Modal open={!!nPopup} onClose={() => setNPopup(null)} title="📋 Meeting Notes" wide>
          {nPopup?.m && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Meta */}
              <div style={{ background: '#f6faff', border: '1.5px solid #b8d0ea', borderRadius: 12, padding: '16px 18px' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>{nPopup.m.title}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#475569', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '3px 10px' }}>📅 {fmtDateTime(nPopup.m.dt)}</span>
                  <span style={{ fontSize: 11, color: '#475569', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '3px 10px' }}>⏱ {fmtDur(nPopup.m.dur)}</span>
                  <Badge className={nPopup.m.tp === 'online' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                    {nPopup.m.tp}
                  </Badge>
                  {nPopup.m.pl && (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${PLATFORM_COLOR[nPopup.m.pl]}`}>
                      <PlatformLogo platform={nPopup.m.pl} size={11} />
                      {PLATFORM_LABELS[nPopup.m.pl]}
                    </span>
                  )}
                </div>
              </div>
              {/* Summary */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8', marginBottom: 8 }}>📄 Summary</p>
                <p style={{ fontSize: 13, color: '#1e3a5f', lineHeight: 1.7, margin: 0 }}>{nPopup.m.summary}</p>
              </div>
              {/* Action Items */}
              <div style={{ background: '#FFFBF0', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#854F0B', marginBottom: 10 }}>
                  ✅ Action Items <span style={{ marginLeft: 6, background: '#fde68a', color: '#854F0B', padding: '1px 7px', borderRadius: 20, fontSize: 10 }}>{(nPopup.m.ai ?? []).length}</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(nPopup.m.ai ?? []).map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px' }}>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span>
                      <div>
                        <p style={{ fontSize: 12, color: '#1e293b', margin: '0 0 3px' }}>{a.task}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>👤 {a.owner} · 📅 {a.deadline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Key Decisions */}
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5b21b6', marginBottom: 10 }}>
                  🔑 Key Decisions <span style={{ marginLeft: 6, background: '#c4b5fd', color: '#5b21b6', padding: '1px 7px', borderRadius: 20, fontSize: 10 }}>{(nPopup.m.kd ?? []).length}</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(nPopup.m.kd ?? []).map((d, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #ede9fe', borderLeft: '3px solid #a78bfa', borderRadius: 8, padding: '10px 14px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: '0 0 3px' }}>{d.decision}</p>
                      {d.context && <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{d.context}</p>}
                    </div>
                  ))}
                </div>
              </div>
              {/* Participants */}
              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#166534', marginBottom: 10 }}>
                  👥 Participants <span style={{ marginLeft: 6, background: '#6ee7b7', color: '#166534', padding: '1px 7px', borderRadius: 20, fontSize: 10 }}>{(nPopup.m.pa ?? []).length}</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(nPopup.m.pa ?? []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{p.name?.trim()?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{p.name}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{p.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Transcript */}
              <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8', marginBottom: 8 }}>📝 Transcript</p>
                <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, margin: 0 }}>
                  {nPopup?.m.transcript || 'No transcript available for this meeting.'}
                </p>
              </div>
              {/* Diarized Transcript
              <div style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5b21b6', marginBottom: 8 }}>💬 Diarized Transcript</p>
                <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, margin: 0 }}>
                  {nPopup?.m.diarized_transcript || 'No diarized transcript available for this meeting.'}
                </p>
              </div> */}
              {/* Diarized Transcript */}
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#7c3aed', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  💬 Diarized Transcript
                </p>

                {(() => {
                  const raw = nPopup?.m?.diarized_transcript;

                  let entries: { timestamp: string; speaker: string; text: string }[] = [];
                  if (typeof raw === 'string') {
                    try { entries = JSON.parse(raw); } catch { /* fallback */ }
                  } else if (Array.isArray(raw)) {
                    entries = raw;
                  }

                  if (!entries.length) {
                    return (
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                        {typeof raw === 'string' ? raw : 'No diarized transcript available.'}
                      </p>
                    );
                  }

                  const palette: Record<string, { bg: string; avatar: string; name: string }> = {};
                  const colors = [
                    { bg: '#ede9fe', avatar: '#7c3aed', name: '#6d28d9' },
                    { bg: '#dbeafe', avatar: '#2563eb', name: '#1d4ed8' },
                    { bg: '#d1fae5', avatar: '#059669', name: '#065f46' },
                    { bg: '#fef3c7', avatar: '#d97706', name: '#92400e' },
                    { bg: '#fce7f3', avatar: '#db2777', name: '#9d174d' },
                  ];
                  let ci = 0;
                  const getColor = (speaker: string) => {
                    if (!palette[speaker]) palette[speaker] = colors[ci++ % colors.length];
                    return palette[speaker];
                  };

                  const initials = (name: string) =>
                    name === 'Unknown' ? '?' :
                      name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {entries.map((entry, i) => {
                        const c = getColor(entry.speaker);
                        return (
                          <div key={i} style={{
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                            padding: '7px 0',
                            borderBottom: i < entries.length - 1 ? '1px solid rgba(196,181,253,0.25)' : 'none',
                          }}>
                            {/* Avatar */}
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: c.bg, color: c.avatar,
                              fontSize: 10, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, marginTop: 1,
                            }}>
                              {initials(entry.speaker)}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: c.name }}>
                                  {entry.speaker === 'Unknown' ? 'Unknown Speaker' : entry.speaker}
                                </span>
                                {entry.timestamp && (
                                  <span style={{
                                    fontSize: 10, color: '#94a3b8',
                                    background: '#f1f5f9', borderRadius: 4,
                                    padding: '1px 5px', fontFamily: 'monospace',
                                  }}>
                                    {entry.timestamp}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.6, margin: 0 }}>
                                {entry.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </Modal>

        {/* ── Tasks Modal ────────────────────────────────────────────────────── */}
        <Modal open={!!tPopup} onClose={() => { setTPopup(null); setEditingTask(null); setTaskOrder([]); setEditingPriority(null) }} title={`🗂 Tasks — ${tPopup?.m?.title}`} wide>
          {tPopup && (() => {
            const tasks = tPopup.m.ai
            const order = taskOrder.length === tasks.length ? taskOrder : tasks.map((_, i) => i)
            const orderedTasks = order.map(i => ({ task: tasks[i], origIdx: i }))
            const mid = tPopup.m.id

            const allDelegate = order.every(i => taskActions[`delegate-${mid}-${i}`])
            const allHT = order.every(i => taskActions[`ht-${mid}-${i}`])
            const allEmail = order.every(i => taskActions[`email-${mid}-${i}`])
            const allSelected = order.every(i => taskActions[`sel-${mid}-${i}`])

            const setAction = (key: string, val: boolean) =>
              setTaskActions(prev => ({ ...prev, [key]: val }))

            const toggleAll = (action: string, val: boolean) => {
              const next = { ...taskActions }
              order.forEach(i => { next[`${action}-${mid}-${i}`] = val })
              setTaskActions(next)
            }


            const BULK_ACTS = [
              { action: 'delegate', pre: 'Delegate All', post: 'Delegated All', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '👥', done: allDelegate },
              { action: 'ht', pre: 'Help Ticket All', post: 'HT Sent All', color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc', icon: '🎫', done: allHT },
              { action: 'email', pre: 'Email All', post: 'Email Sent All', color: '#15803d', bg: '#f0fdf4', border: '#86efac', icon: '✉️', done: allEmail },
            ]

            const TASK_ACTS = [
              { key: 'delegate', pre: 'Delegate', post: 'Delegated', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '👥' },
              { key: 'ht', pre: 'Help Ticket', post: 'HT Raised', color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc', icon: '🎫' },
              { key: 'email', pre: 'Email', post: 'Email Sent', color: '#15803d', bg: '#f0fdf4', border: '#86efac', icon: '✉️' },
            ]

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 14px', flexWrap: 'wrap', gap: 8 }}>
                  {/* Select All checkbox-style */}
                  <button
                    onClick={() => toggleAll('sel', !allSelected)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7, border: `1.5px solid ${allSelected ? '#1d4ed8' : '#cbd5e1'}`, background: allSelected ? '#eff6ff' : '#fff', color: allSelected ? '#1d4ed8' : '#475569', cursor: 'pointer' }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${allSelected ? '#1d4ed8' : '#94a3b8'}`, background: allSelected ? '#1d4ed8' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>
                      {allSelected ? '✓' : ''}
                    </span>
                    Select All
                  </button>

                  {/* Bulk pill buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {BULK_ACTS.map(({ action, pre, post, color, bg, border, icon, done }) => (
                      <button key={action}
                        onClick={async () => {
                          if (!done) {
                            const keys = order.map(i => action + '-' + mid + '-' + i)
                            await handleBulkAction(action as any, order.map(i => tasks[i]), tPopup.m, keys)
                          } else toggleAll(action, false)
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 14px', fontSize: 11, fontWeight: 600,
                          borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                          border: `1.5px solid ${done ? border : '#e2e8f0'}`,
                          background: done ? bg : '#f8fafc',
                          color: done ? color : '#64748b',
                        }}
                      >
                        {done
                          ? <><span style={{ width: 15, height: 15, borderRadius: '50%', background: color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>✓</span> {post}</>
                          : <>{icon} {pre}</>
                        }
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderedTasks.map(({ task: t, origIdx }, displayIdx) => {
                    const isSelected = !!taskActions[`sel-${mid}-${origIdx}`]
                    const isDragging = dragIdx === displayIdx
                    const isDragOver = dragOverIdx === displayIdx
                    const isEditText = editingTask === origIdx

                    const priorityColors: Record<string, { bg: string; color: string; border: string }> = {
                      high: { bg: '#FCEBEB', color: '#791F1F', border: '#fca5a5' },
                      medium: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
                      low: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
                    }
                    const pc = priorityColors[t.priority] || priorityColors.low

                    return (
                      <div key={origIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>

                        {/* ── Drag handle — outside card, triggers card drag ── */}
                        <div
                          style={{ flexShrink: 0, paddingTop: 14, cursor: 'grab', color: '#cbd5e1', fontSize: 16, lineHeight: 1, userSelect: 'none', touchAction: 'none' }}
                          title="Drag to reorder"
                          onPointerDown={e => {
                            e.preventDefault()
                            e.currentTarget.setPointerCapture(e.pointerId)
                            setDragIdx(displayIdx)
                          }}
                          onPointerMove={e => {
                            if (dragIdx === null) return
                            // find which card we're hovering over
                            const el = document.elementFromPoint(e.clientX, e.clientY)
                            const cardEl = el?.closest('[data-task-di]') as HTMLElement | null
                            if (cardEl) {
                              const overDi = parseInt(cardEl.dataset.taskDi || '-1')
                              if (!isNaN(overDi) && overDi !== dragIdx) setDragOverIdx(overDi)
                            }
                          }}
                          onPointerUp={() => {
                            if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                              const newOrder = [...order]
                              const [moved] = newOrder.splice(dragIdx, 1)
                              newOrder.splice(dragOverIdx, 0, moved)
                              setTaskOrder(newOrder)
                            }
                            setDragIdx(null); setDragOverIdx(null)
                          }}
                        >⠿</div>

                        {/* ── Card ── */}
                        <div
                          data-task-di={displayIdx}
                          style={{
                            flex: 1, minWidth: 0,
                            borderRadius: 10,
                            border: `1.5px solid ${isDragOver ? '#93c5fd' : isSelected ? '#bfdbfe' : '#e2e8f0'}`,
                            background: isDragging ? '#f0f7ff' : isSelected ? '#f8fbff' : '#fff',
                            boxShadow: isDragging ? '0 4px 16px rgba(29,78,216,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                            opacity: isDragging ? 0.6 : 1,
                            transition: 'border 0.1s, background 0.1s',
                          }}
                        >
                          {/* Top row */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px 8px' }}>

                            {/* Checkbox — inline with task title */}
                            {(() => {
                              const isDisabled = !t.owner || !t.deadline || t.deadline === 'Not specified'
                              return (
                                <div
                                  onClick={() => { if (!isDisabled) setAction(`sel-${mid}-${origIdx}`, !isSelected) }}
                                  style={{
                                    width: 16, height: 16, borderRadius: 4,
                                    border: `1.5px solid ${isDisabled ? '#e2e8f0' : isSelected ? '#1d4ed8' : '#94a3b8'}`,
                                    background: isDisabled ? '#f1f5f9' : isSelected ? '#1d4ed8' : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, color: '#fff',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    flexShrink: 0, marginTop: 2,
                                    opacity: isDisabled ? 0.5 : 1,
                                  }}
                                  title={isDisabled ? 'Fill task, owner & deadline first' : ''}
                                >
                                  {isSelected && !isDisabled ? '✓' : ''}
                                </div>
                              )
                            })()}

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* Unsaved badge */}
                              {!(t as any)._db_id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>
                                    ⚠ Not saved to Tasks
                                  </span>
                                  <button
                                    onClick={async () => {
                                      const r = await fetch('/api/meetings/tasks', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          meeting_id: tPopup.m.id, meeting_title: tPopup.m.title,
                                          task: t.task, priority: t.priority || 'medium',
                                          assignee: t.owner || null,
                                          deadline: t.deadline && t.deadline !== 'Not specified' ? t.deadline : null,
                                        }),
                                      })
                                      if (r.ok) {
                                        const d = await r.json()
                                        setMeetingTasksCache(prev => {
                                          const cur = [...(prev[tPopup.m.id] || tPopup.m.ai)]
                                          cur[origIdx] = { ...t, _db_id: d.id } as any
                                          setTPopup(p => p ? { ...p, m: { ...p.m, ai: cur } } : p)
                                          return { ...prev, [tPopup.m.id]: cur }
                                        })
                                      }
                                    }}
                                    style={{ fontSize: 10, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                                  >+ Save to Tasks</button>
                                </div>
                              )}
                              {/* Task text — click to edit inline */}
                              {isEditText ? (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                                  <textarea id={`et-${origIdx}`} defaultValue={t.task}
                                    style={{ flex: 1, minHeight: 52, padding: '6px 10px', fontSize: 12, border: '1.5px solid #93c5fd', borderRadius: 8, background: '#fff', color: '#1e293b', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none' }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <button onClick={() => {
                                      const el = document.getElementById(`et-${origIdx}`) as HTMLTextAreaElement
                                      if (el) saveTask(tPopup.midx, origIdx, { ...t, task: el.value.trim() || t.task })
                                      setEditingTask(null)
                                    }} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, background: '#1d4ed8', color: '#fff', border: 'none', cursor: 'pointer' }}>✓</button>
                                    <button onClick={() => setEditingTask(null)}
                                      style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>✕</button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  onClick={() => setEditingTask(origIdx)}
                                  title="Click to edit"
                                  style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: '0 0 6px', lineHeight: 1.5, cursor: 'text', borderBottom: '1px dashed transparent', transition: 'border-color 0.15s' }}
                                  onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#cbd5e1')}
                                  onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
                                >{t.task}</p>
                              )}

                              {/* Badges row — priority badge only, no inline edit here anymore */}
                              {/* <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{t.priority}</span>
                              {(() => {
                                const st = t.status || 'pending'
                                const sColor = st === 'completed' ? { bg: '#dcfce7', color: '#166534', border: '#86efac' } : st === 'in-progress' ? { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' } : { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
                                return <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: sColor.bg, color: sColor.color, border: `1px solid ${sColor.border}` }}>{st === 'in-progress' ? 'In Progress' : st.charAt(0).toUpperCase() + st.slice(1)}</span>
                              })()}
                            </div> */}
                            </div>

                            {/* Status dropdown — replaces delete button position */}
                            {!isEditText && (

                              <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-end', gap: 4 }}>

                                {(() => {
                                  const st = t.status || 'pending'
                                  const sColor = st === 'completed' ? { bg: '#dcfce7', color: '#166534', border: '#86efac' } : st === 'in-progress' ? { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' } : { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
                                  return <span style={{ height: 25, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '5px 7px', borderRadius: 5, background: sColor.bg, color: sColor.color, border: `1px solid ${sColor.border}` }}>{st === 'in-progress' ? 'In Progress' : st.charAt(0).toUpperCase() + st.slice(1)}</span>
                                })()}
                                {(() => {
                                  const hasDbId = !!(t as any)._db_id

                                  const hasActionDone =
                                    !!taskActions[`delegate-${mid}-${origIdx}`] ||
                                    !!taskActions[`ht-${mid}-${origIdx}`] ||
                                    !!taskActions[`email-${mid}-${origIdx}`]

                                  const isDisabled = !hasDbId || hasActionDone

                                  return (
                                    <button
                                      onClick={() => deleteTask(tPopup.midx, origIdx)}
                                      disabled={isDisabled}
                                      title={
                                        !hasDbId
                                          ? 'Save to Tasks first'
                                          : hasActionDone
                                            ? 'Task action already completed'
                                            : 'Delete task'
                                      }
                                      style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 7,
                                        border: `1px solid ${isDisabled ? '#e5e7eb' : '#fca5a5'}`,
                                        background: isDisabled ? '#f9fafb' : '#FCEBEB',
                                        color: isDisabled ? '#d1d5db' : '#791F1F',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        opacity: isDisabled ? 0.7 : 1
                                      }}
                                    >
                                      🗑
                                    </button>
                                  )
                                })()}

                              </div>


                            )}
                          </div>

                          {/* ── Bottom: two rows — controls + actions ── */}
                          {!isEditText && (
                            <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                              {/* Row 1: Assignee | Date | Priority */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

                                {/* Assignee dropdown */}
                                <select
                                  value={t.owner || ''}
                                  onChange={e => saveTask(tPopup.midx, origIdx, { ...t, owner: e.target.value })}
                                  disabled={!(t as any)._db_id || !!taskActions[`delegate-${mid}-${origIdx}`] || taskActions[`ht-${mid}-${origIdx}`] || taskActions[`email-${mid}-${origIdx}`]}
                                  style={{ height: 28, fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 5, border: `1px solid ${(t as any)._db_id ? '#e2e8f0' : '#f0f0f0'}`, background: (t as any)._db_id ? '#f8fafc' : '#fafafa', color: (t as any)._db_id ? (t.owner ? '#1e293b' : '#94a3b8') : '#c8c8c8', outline: 'none', cursor: (t as any)._db_id ? 'pointer' : 'not-allowed', flex: '1 1 130px', minWidth: 0, maxWidth: 200 }}
                                >
                                  <option value="">👤 Assign to...</option>
                                  {Object.entries(empGrouped).map(([dept, emps]) => (
                                    <optgroup key={dept} label={dept}>
                                      {(emps as any[]).map(emp => (
                                        <option key={emp.email} value={emp.name}>{emp.name}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>

                                {/* Date picker */}

                                <input
                                  type="date"
                                  value={t.deadline && t.deadline !== 'Not specified' ? new Date(t.deadline).toISOString().split('T')[0] : ''}
                                  onChange={e => saveTask(tPopup.midx, origIdx, { ...t, deadline: e.target.value || 'Not specified' })}
                                  disabled={!(t as any)._db_id || !!taskActions[`delegate-${mid}-${origIdx}`] || taskActions[`ht-${mid}-${origIdx}`] || taskActions[`email-${mid}-${origIdx}`]}
                                  title={!(t as any)._db_id ? 'Save to Tasks first' : 'Due date'}
                                  style={{
                                    height: 28, fontSize: 11, padding: '0 8px', borderRadius: 5,
                                    border: `1px solid ${(t as any)._db_id ? '#e2e8f0' : '#f0f0f0'}`,
                                    background: (t as any)._db_id ? '#f8fafc' : '#fafafa',
                                    color: (t as any)._db_id ? (t.deadline && t.deadline !== 'Not specified' ? '#1e293b' : '#94a3b8') : '#c8c8c8',
                                    outline: 'none', cursor: (t as any)._db_id ? 'pointer' : 'not-allowed',
                                    fontFamily: 'inherit', flex: '1 1 120px', minWidth: 0, maxWidth: 150,
                                  }}
                                />

                                {/* Priority dropdown */}
                                <select
                                  value={t.priority}
                                  onChange={e => {
                                    const val = e.target.value as 'high' | 'medium' | 'low'
                                    saveTask(tPopup.midx, origIdx, { ...t, priority: val })
                                  }}
                                  disabled={!(t as any)._db_id || !!taskActions[`delegate-${mid}-${origIdx}`] || taskActions[`ht-${mid}-${origIdx}`] || taskActions[`email-${mid}-${origIdx}`]}
                                  style={{ height: 28, fontSize: 11, fontWeight: 600, padding: '0 8px', borderRadius: 5, border: `1px solid ${(t as any)._db_id ? pc.border : '#f0f0f0'}`, background: (t as any)._db_id ? pc.bg : '#fafafa', color: (t as any)._db_id ? pc.color : '#c8c8c8', outline: 'none', cursor: (t as any)._db_id ? 'pointer' : 'not-allowed', flex: '0 0 auto' }}
                                >
                                  <option value="high">🔴 High</option>
                                  <option value="medium">🟡 Medium</option>
                                  <option value="low">🟢 Low</option>
                                </select>
                                <select
                                  value={t.company || ''}
                                  onChange={e => {
                                    const val = e.target.value as NonNullable<ActionItem['company']>
                                    saveTask(tPopup.midx, origIdx, { ...t, company: val })
                                  }}
                                  disabled={!(t as any)._db_id || !!taskActions[`delegate-${mid}-${origIdx}`] || taskActions[`ht-${mid}-${origIdx}`] || taskActions[`email-${mid}-${origIdx}`]}
                                  style={{ height: 28, fontSize: 11, fontWeight: 600, padding: '0 8px', borderRadius: 5, border: `1px solid ${(t as any)._db_id ? pc.border : '#f0f0f0'}`, background: (t as any)._db_id ? pc.bg : '#fafafa', color: (t as any)._db_id ? pc.color : '#c8c8c8', outline: 'none', cursor: (t as any)._db_id ? 'pointer' : 'not-allowed', flex: '0 0 auto' }}
                                >
                                  <option value="" disabled>Select Company</option>
                                  <option value="KTAHV">KTAHV</option>
                                  <option value="KAPPL">KAPPL</option>
                                  <option value="VILLA RAGA">VILLA RAGA</option>
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="ALLIANCES">ALLIANCES</option>
                                  <option value="OTHERS">OTHERS</option>
                                </select>
                              </div>

                              {/* Row 2: Action buttons — always full width, wrap naturally */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {TASK_ACTS.map(({ key, pre, post, color, bg, border, icon }) => {
                                  const done = !!taskActions[`${key}-${mid}-${origIdx}`]
                                  const owner = t.owner || 'Assignee'
                                  const isLocked = !(t as any)._db_id || !t.owner || !t.deadline || t.deadline === 'Not specified' || !t.company
                                  const isLoading = !!actionLoading[`${key}-${mid}-${origIdx}`]
                                  return (
                                    <button key={key}
                                      disabled={done || isLoading || isLocked}
                                      onClick={() => handleTaskAction(key as any, `${key}-${mid}-${origIdx}`, t, tPopup.m, origIdx)}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '5px 10px', fontSize: 11, fontWeight: 600,
                                        borderRadius: 8, flex: '1 1 auto', justifyContent: 'center',
                                        cursor: (done || isLocked) ? 'not-allowed' : 'pointer',
                                        border: `1.5px solid ${done ? border : isLocked ? '#efefef' : '#e2e8f0'}`,
                                        background: done ? bg : isLocked ? '#fafafa' : '#f8fafc',
                                        color: done ? color : isLocked ? '#d1d5db' : '#64748b',
                                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                                        minWidth: 0, overflow: 'hidden',
                                      }}
                                    >
                                      {isLoading
                                        ? <><span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Sending...</span></>
                                        : done
                                          ? <><span style={{ width: 13, height: 13, borderRadius: '50%', background: color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>✓</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{post} · {owner}</span></>
                                          : isLocked
                                            ? <><span style={{ fontSize: 10, flexShrink: 0 }}>🔒</span><span>{pre}</span></>
                                            : <><span style={{ flexShrink: 0 }}>{icon}</span><span>{pre}</span></>
                                      }
                                    </button>
                                  )
                                })}
                              </div>

                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {tasks.length === 0 && (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>No tasks for this meeting</p>
                )}

                {/* ── Add Task manually ── */}
                <div style={{ marginTop: 4 }}>
                  {!showAddTask ? (
                    <button
                      onClick={() => setShowAddTask(true)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 600,
                        borderRadius: 8, cursor: 'pointer',
                        border: '1.5px dashed #93c5fd',
                        background: '#f8faff', color: '#1d4ed8',
                      }}
                    >
                      + Add Task Manually
                    </button>
                  ) : (
                    <div style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 10, padding: '14px 16px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>
                        + Add Task
                      </p>
                      <textarea
                        placeholder="Describe the task..."
                        value={addTaskForm.task}
                        onChange={e => setAddTaskForm(p => ({ ...p, task: e.target.value }))}
                        rows={2}
                        style={{
                          width: '100%', padding: '8px 10px', fontSize: 12,
                          border: '1px solid #bfdbfe', borderRadius: 7,
                          resize: 'vertical', fontFamily: 'inherit',
                          outline: 'none', color: '#1e293b', background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <select
                          value={addTaskForm.assignee}
                          onChange={e => setAddTaskForm(p => ({ ...p, assignee: e.target.value }))}
                          style={{ height: 32, padding: '0 8px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', color: addTaskForm.assignee ? '#1e293b' : '#94a3b8', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="">👤 Assign to...</option>
                          {Object.entries(empGrouped).map(([dept, emps]) => (
                            <optgroup key={dept} label={dept}>
                              {(emps as any[]).map(emp => (
                                <option key={emp.email} value={emp.name}>{emp.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <select
                          value={addTaskForm.priority}
                          onChange={e => setAddTaskForm(p => ({ ...p, priority: e.target.value }))}
                          style={{ height: 32, padding: '0 8px', fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', color: '#1e293b', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="high">🔴 High</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="low">🟢 Low</option>
                        </select>
                        <input
                          type="date"
                          value={addTaskForm.deadline}
                          onChange={e => setAddTaskForm(p => ({ ...p, deadline: e.target.value }))}
                          style={{ height: 32, padding: '0 8px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', color: '#1e293b', background: '#fff', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => submitManualTask(tPopup.m.id, tPopup.m.title)}
                          disabled={addingTask || !addTaskForm.task.trim()}
                          style={{
                            flex: 1, height: 34, fontSize: 12, fontWeight: 600,
                            borderRadius: 8, border: 'none',
                            cursor: addTaskForm.task.trim() ? 'pointer' : 'default',
                            background: addTaskForm.task.trim() ? 'linear-gradient(to right,#1e3a5f,#1d4ed8)' : '#e2e8f0',
                            color: addTaskForm.task.trim() ? '#fff' : '#94a3b8',
                          }}
                        >
                          {addingTask ? 'Saving...' : '✓ Save Task'}
                        </button>
                        <button
                          onClick={() => { setShowAddTask(false); setAddTaskForm({ task: '', assignee: '', priority: 'medium', deadline: '' }) }}
                          style={{ height: 34, padding: '0 16px', fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            )
          })()}
        </Modal>

        {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
        <Modal open={!!delPopup} onClose={() => setDelPopup(null)} title="🗑 Delete Meeting">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FCEBEB', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 13, color: '#1e293b', margin: '0 0 6px' }}>Are you sure you want to delete this meeting?</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#791F1F', margin: '0 0 8px' }}>"{delPopup?.m?.title}"</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                This will permanently remove the meeting, its notes, transcript, and all extracted tasks.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDelPopup(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 500, color: '#475569', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => delPopup && deleteMeeting(delPopup.m.id)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Delete Meeting
              </button>
            </div>
          </div>
        </Modal>

        {/* ── New Meeting Modal ──────────────────────────────────────────────── */}
        <Modal
          open={newMtgOpen}
          onClose={() => {
            if (isResuming || recState === 'processing') return
            if (recState === 'idle' || recState === 'done' || recState === 'error') {
              setNewMtgOpen(false)
              resetRecorder()
              setIsResuming(false)
            }
          }}
          title={recState === 'idle' ? '🎙 New Meeting Recording' : recState === 'recording' || recState === 'paused' ? '⏺ Recording...' : recState === 'processing' ? '⚙ Processing...' : recState === 'done' ? '✅ Meeting Saved' : '🎙 New Meeting Recording'}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── IDLE ── */}
            {recState === 'idle' && !isResuming && (<>
              {/* Phase 1: Recovery banner — orphaned recording from a closed tab */}
              {recoverable && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10,
                  padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                      Unfinished recording found
                    </div>
                    <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                      "{recoverable.title || 'Untitled'}" · {Math.floor((recoverable.durationSec || 0) / 60)}m {(recoverable.durationSec || 0) % 60}s · {(blobFromStored(recoverable).size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const rec = recoverable
                      setRecoverable(null)
                      const blob = blobFromStored(rec)
                      audioBlobRef.current = blob
                      audioChunks.current = rec.chunks
                      recElapsedRef.current = rec.durationSec || 0
                      setNmTitle(rec.title || 'Recovered Meeting')
                      setNmMode(rec.mode as any || 'offline')
                      setNmPlatform(rec.platform as any || null)
                      const recordedAt = rec.startedAt
                        ? new Date(rec.startedAt).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ')
                        : new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ')
                      await runRecPipeline(blob, recordedAt, [])
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer',
                    }}>
                    Resume Processing
                  </button>
                  <button
                    onClick={async () => { await clearActiveRecording(); setRecoverable(null) }}
                    style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: 'transparent', color: '#92400e', border: '1px solid #fcd34d', cursor: 'pointer',
                    }}>
                    Discard
                  </button>
                </div>
              )}

              {/* Mode */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', display: 'block', marginBottom: 8 }}>Meeting Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['online', '🖥 Online'], ['offline', '🎙 Offline']].map(([v, l]) => (
                    <button key={v} onClick={() => setNmMode(v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: nmMode === v ? 'linear-gradient(to right,#1e3a5f,#1d4ed8)' : '#fff',
                        color: nmMode === v ? '#fff' : '#475569',
                        border: nmMode === v ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart URL input */}
              {nmMode === 'online' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', display: 'block', marginBottom: 8 }}>
                    Meeting Link or Code <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(auto-detected)</span>
                  </label>
                  <input type="text" value={nmUrl} onChange={e => handleNmUrlChange(e.target.value)}
                    placeholder="meet.google.com/abc-xyz · zoom.us/j/123456 · or just the code"
                    style={{
                      width: '100%', height: 40, padding: '0 14px',
                      fontSize: 13, fontFamily: 'monospace',
                      border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff',
                      color: '#1e293b', outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 1px rgba(29,78,216,0.2)' }}
                    onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none' }}
                  />
                  {nmParsed && nmParsed.confidence === 'high' && (
                    <p style={{ fontSize: 11, color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ✅ {nmParsed.platform === 'meet' ? `Google Meet · ${nmParsed.meetCode}` : nmParsed.platform === 'zoom' ? `Zoom · ID: ${nmParsed.zoomId}` : 'Teams detected'}
                    </p>
                  )}
                  {nmParsed?.error && <p style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>⚠ {nmParsed.error}</p>}
                </div>
              )}

              {/* Platform */}
              {nmMode === 'online' && (!nmParsed || nmParsed.confidence === 'low') && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', display: 'block', marginBottom: 8 }}>Platform</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => setNmPlatform(k)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                          cursor: 'pointer',
                          background: nmPlatform === k ? 'linear-gradient(to right,#1e3a5f,#1d4ed8)' : '#fff',
                          color: nmPlatform === k ? '#fff' : '#475569',
                          border: nmPlatform === k ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
                        }}>
                        <PlatformLogo platform={k} size={15} />{v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auth: Google Meet */}
              {nmMode === 'online' && nmPlatform === 'meet' && nmMeetCode && (
                <div style={{ borderRadius: 10, border: isGoogleConnected ? '1px solid #6ee7b7' : '1px solid #fde68a', padding: '12px 14px', background: isGoogleConnected ? '#ecfdf5' : '#FFFBF0' }}>
                  {isGoogleConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#166534' }}>✅</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', margin: 0 }}>Google connected · {googleUserName}</p>
                        <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>Participants fetched after recording stops</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#854F0B', margin: 0 }}>Connect Google to fetch participants</p>
                        <p style={{ fontSize: 11, color: '#a16207', margin: '2px 0 0' }}>Sign in now — no redirect during recording</p>
                      </div>
                      <button onClick={handleConnectGoogle} disabled={signingIn}
                        style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, border: '1px solid #fde68a', background: '#fff', color: '#854F0B', cursor: 'pointer' }}>
                        {signingIn ? 'Connecting...' : '🔑 Connect Google'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Auth: Zoom */}
              {nmMode === 'online' && nmPlatform === 'zoom' && nmZoomId && (
                <div style={{ borderRadius: 10, border: zoomSession.connected ? '1px solid #6ee7b7' : '1px solid #93c5fd', padding: '12px 14px', background: zoomSession.connected ? '#ecfdf5' : '#eff6ff' }}>
                  {zoomSession.connected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#166534' }}>✅</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', margin: 0 }}>Zoom connected · {zoomSession.userName}</p>
                        <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>Recording auto-stops when meeting ends</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', margin: 0 }}>Connect Zoom for auto-stop + participants</p>
                      <button onClick={handleConnectZoom}
                        style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        🎥 Connect Zoom
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', display: 'block', marginBottom: 8 }}>Meeting Title</label>
                <input type="text" value={nmTitle} onChange={e => setNmTitle(e.target.value)}
                  placeholder="e.g. KTAHV Sales Review, KAPPL Factory Head Interview..."
                  style={{
                    width: '100%', height: 40, padding: '0 14px', fontSize: 13,
                    border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff',
                    color: '#1e293b', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 1px rgba(29,78,216,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* Offline participants selector */}
            {nmMode === 'offline' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', display: 'block', marginBottom: 8 }}>
                  Who is in this meeting?
                  <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', marginLeft: 6 }}>(helps AI identify speakers)</span>
                </label>
                {offlineParticipants.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {offlineParticipants.map((name, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                        {name}
                        <button onClick={() => setOfflineParticipants(p => p.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: 16, lineHeight: 1, padding: '0 0 0 2px' }}>x</button>
                      </span>
                    ))}
                  </div>
                )}
                {!showManualInput ? (
                  <select value="" onChange={e => {
                    const val = e.target.value
                    if (!val) return
                    if (val === 'ADD_MANUAL') { setShowManualInput(true); return }
                    if (!offlineParticipants.includes(val)) setOfflineParticipants(p => [...p, val])
                    e.target.value = ''
                  }} style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer' }}>
                    <option value="">+ Select participant...</option>
                    {Object.entries(empGrouped).map(([dept, emps]) => (
                      <optgroup key={dept} label={dept}>
                        {(emps as any[]).filter(emp => !offlineParticipants.includes(emp.name)).map(emp => (
                          <option key={emp.email} value={emp.name}>{emp.name}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="ADD_MANUAL">+ Add name manually...</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input autoFocus type="text" placeholder="Type name and press Enter..."
                      value={manualName} onChange={e => setManualName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && manualName.trim()) {
                          if (!offlineParticipants.includes(manualName.trim())) setOfflineParticipants(p => [...p, manualName.trim()])
                          setManualName(''); setShowManualInput(false)
                        }
                        if (e.key === 'Escape') { setManualName(''); setShowManualInput(false) }
                      }}
                      style={{ flex: 1, height: 36, padding: '0 10px', fontSize: 12, border: '1px solid #93c5fd', borderRadius: 8, outline: 'none', color: '#1e293b' }} />
                    <button onClick={() => {
                        if (manualName.trim() && !offlineParticipants.includes(manualName.trim())) setOfflineParticipants(p => [...p, manualName.trim()])
                        setManualName(''); setShowManualInput(false)
                      }}
                      style={{ height: 36, padding: '0 14px', fontSize: 12, fontWeight: 600, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Add</button>
                    <button onClick={() => { setManualName(''); setShowManualInput(false) }}
                      style={{ height: 36, padding: '0 12px', fontSize: 12, background: '#fff', color: '#6b7280', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {/* Hint */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#1e40af' }}>
                {nmMode === 'online' ? (
                  getMeetingUrl()
                    ? <><p style={{ fontWeight: 600, marginBottom: 4 }}>📌 {PLATFORM_LABELS[nmPlatform] || 'Online'} recording</p>
                      <p style={{ margin: 0, lineHeight: 1.6 }}>Click Start — browser will ask to share screen. Select <strong>"Entire Screen"</strong> and check <strong>"Share system audio"</strong>, then click Share.</p></>
                    : <><p style={{ fontWeight: 600, marginBottom: 4 }}>📌 Online recording</p>
                      <p style={{ margin: 0, lineHeight: 1.6 }}>Paste a meeting link above. Click Start, select <strong>"Entire Screen"</strong> with <strong>"Share system audio"</strong> checked.</p></>
                ) : (
                  <><p style={{ fontWeight: 600, marginBottom: 4 }}>🎙 Offline recording</p>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>Your laptop microphone will be used. Place it close to all participants.</p></>
                )}
              </div>

              {recErrorMsg && (
                <div style={{ background: '#FCEBEB', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#791F1F' }}>⚠ {recErrorMsg}</div>
              )}

              <button onClick={startRecording}
                style={{
                  width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(to right,#1e3a5f,#1d4ed8)', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
                }}>
                🎙 Start Recording
              </button>
            </>)}

            {/* ── RECORDING / PAUSED ── */}
            {(recState === 'recording' || recState === 'paused') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 16 }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {recState === 'recording' && (
                      <div style={{
                        position: 'absolute', borderRadius: '50%', background: '#fecaca',
                        width: 80 + audioLevel * 40, height: 80 + audioLevel * 40,
                        opacity: 0.4 + audioLevel * 0.3, transition: 'all 0.1s',
                      }} />
                    )}
                    <span style={{ position: 'relative', fontSize: 48, fontWeight: 700, color: '#1e293b', fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
                      {fmtRecTime(recElapsed)}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, margin: 0 }}>
                    {recState === 'paused' ? 'Recording paused' : `Recording · ${nmTitle || 'Untitled'}`}
                  </p>
                </div>
                <div style={{ borderRadius: 10, overflow: 'hidden', background: '#0f172a', padding: 8 }}>
                  <canvas ref={canvasRef} width={600} height={64} style={{ width: '100%', height: 64, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={togglePause}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 500, color: '#475569', background: '#fff', cursor: 'pointer' }}>
                    {recState === 'recording' ? '⏸ Pause' : '▶ Resume'}
                  </button>
                  <button onClick={toggleMic}
                    title={micMuted ? 'Your mic is muted — your voice is NOT being recorded' : 'Mute your mic in the recording'}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
                      border: micMuted ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                      fontSize: 13, fontWeight: 600,
                      color: micMuted ? '#dc2626' : '#475569',
                      background: micMuted ? '#fef2f2' : '#fff', cursor: 'pointer' }}>
                    {micMuted ? '🔇 Mic Muted' : '🎤 Mute Mic'}
                  </button>
                  <button onClick={restartRecording}
                    title="Discard this recording and start over"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 500, color: '#475569', background: '#fff', cursor: 'pointer' }}>
                    🔄 Restart
                  </button>
                  <button onClick={stopRecording}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ⏹ Stop & Process
                  </button>
                </div>
                {micMuted && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                    🔇 Your microphone is muted — your voice won't be in the recording. Tab/meeting audio is still recording.
                  </div>
                )}
              </div>
            )}

            {/* ── PROCESSING ── */}
            {recState === 'processing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {participantNote && (
                  <div style={{
                    borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, border: participantNote.startsWith('✓') ? '1px solid #6ee7b7' : '1px solid #e2e8f0',
                    background: participantNote.startsWith('✓') ? '#ecfdf5' : '#f8fafc',
                    color: participantNote.startsWith('✓') ? '#166534' : '#475569',
                  }}>
                    {participantNote}
                  </div>
                )}
                {REC_STEPS.map(step => {
                  const isDone = REC_STEP_ORDER.indexOf(step.key) < REC_STEP_ORDER.indexOf(recStep || 'uploading')
                  const isActive = step.key === recStep
                  const isUpload = step.key === 'uploading'
                  return (
                    <div key={step.key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10, transition: 'all 0.2s',
                      border: isDone ? '1px solid #6ee7b7' : isActive ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      background: isDone ? '#ecfdf5' : isActive ? '#eff6ff' : '#f8fafc',
                      color: isDone ? '#166534' : isActive ? '#1e40af' : '#94a3b8',
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        background: isDone ? '#059669' : isActive ? '#1d4ed8' : '#cbd5e1',
                        color: isDone || isActive ? '#fff' : '#94a3b8',
                      }}>
                        {isDone ? '✓' : isActive ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'kfade 1s ease infinite alternate' }} /> : '○'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{step.label}</span>
                        {isActive && isUpload && uploadProgress && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1d4ed8', marginBottom: 4 }}>
                              <span>{uploadProgress.percent}% uploaded</span>
                              <span>{Math.round(uploadProgress.uploadedBytes / 1024 / 1024)}MB / {Math.round(uploadProgress.totalBytes / 1024 / 1024)}MB</span>
                            </div>
                            <div style={{ height: 4, background: '#dbeafe', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${uploadProgress.percent}%`, background: 'linear-gradient(90deg,#1d4ed8,#6366f1)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        )}
                        {isActive && step.key === 'compressing' && isCompressing && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7c3aed', marginBottom: 4 }}>
                              <span>{compressProg}% compressed</span>
                              <span>shrinking for faster upload</span>
                            </div>
                            <div style={{ height: 4, background: '#ede9fe', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${compressProg}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── DONE ── */}
            {recState === 'done' && recNotes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', margin: 0 }}>✅ Meeting saved · ID #{recSavedId} · {fmtRecTime(recElapsedRef.current)}</p>
                    {recTasksCount > 0 && <p style={{ fontSize: 11, color: '#059669', margin: '3px 0 0' }}>🗂 {recTasksCount} task{recTasksCount !== 1 ? 's' : ''} extracted</p>}
                    {recParticipants.length > 0 && <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>👥 {recParticipants.length} participants from API</p>}
                  </div>
                  <button onClick={() => { setNewMtgOpen(false); resetRecorder() }}
                    style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, border: '1px solid #6ee7b7', color: '#166534', background: '#fff', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
                {recNotes.summary && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 6 }}>Summary</p>
                    <p style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.7, margin: 0 }}>{recNotes.summary}</p>
                  </div>
                )}
                {recNotes.action_items?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>✅ Action Items ({recNotes.action_items.length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {recNotes.action_items.map((ai: any, i: number) => (
                        <div key={i} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', flex: 1 }}>{ai.task}</span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${PRIORITY_COLOR[ai.priority] || PRIORITY_COLOR.low}`}>{ai.priority}</span>
                          </div>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>👤 {ai.owner || 'Unassigned'} · 📅 {ai.deadline || 'No deadline'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recNotes.key_decisions?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>🔑 Key Decisions</p>
                    {recNotes.key_decisions.map((d: any, i: number) => (
                      <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid #93c5fd', marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: '0 0 2px' }}>{d.decision}</p>
                        {d.context && <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{d.context}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ERROR ── */}
            {recState === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: '#FCEBEB', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#791F1F' }}>
                  ⚠ {recErrorMsg}
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                  Completed steps are saved — your recording is safe.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      const cp = await loadCheckpoint()
                      if (cp?.audioUrl) {
                        setRecErrorMsg('')
                        setIsResuming(true)
                        await resumePipeline(cp)
                      } else {
                        setRecState('idle')
                        setRecErrorMsg('')
                        setIsResuming(false)
                      }
                    }}
                    style={{ flex: 1, padding: '10px 0', background: 'linear-gradient(to right,#1e3a5f,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ▶ Resume from where it stopped
                  </button>
                  <button
                    onClick={async () => {
                      const id = getStoredCheckpointId()
                      if (id) await clearCheckpoint(id)
                      setRecState('idle')
                      setRecErrorMsg('')
                      setIsResuming(false)
                    }}
                    style={{ padding: '10px 16px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}

          </div>
        </Modal>
      </div>

    </DashboardLayout>
  )
}
