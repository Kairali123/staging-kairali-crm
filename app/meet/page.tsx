'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Mic, Monitor, CheckCircle, Save, AlertCircle,
    Play, Pause, Square, ChevronDown, Upload, Brain,
    ListChecks, Users, Loader2, LogIn, Video, Link2, X,
    Search, Filter, Calendar, Plus, Eye, Trash2, ClipboardList,
    ChevronLeft, ChevronRight, FileText, Clock, BarChart2,
    Headphones, AudioLines, RefreshCw, SlidersHorizontal,
} from 'lucide-react'
import { parseMeetingInput, type ParsedMeeting } from '@/lib/meeting-url-parser'

// ─── Types ────────────────────────────────────────────────────────────────────
type RecordMode = 'online' | 'offline'
type Platform = 'meet' | 'zoom' | 'teams' | 'other'
type AppState = 'idle' | 'recording' | 'paused' | 'processing' | 'done' | 'error'
type ProcessStep = 'uploading' | 'transcribing' | 'processing' | 'saving' | 'extracting' | 'done'
type PageView = 'list' | 'recorder'

interface MeetingMeta {
    title: string; mode: RecordMode; platform: Platform
    contactEmail: string; leadId: string
    meetCode: string
    zoomMeetingId: string
    meetingUrl: string
}
interface Participant {
    name: string; email: string; role: string
    joinTime: string | null; leaveTime: string | null
}
interface ProcessedNotes {
    summary: string
    action_items: { task: string; owner: string; deadline: string; priority: string }[]
    key_decisions: { decision: string; context: string }[]
    participants: { name: string; role: string }[]
    follow_ups: { topic: string; notes: string }[]
}
interface ZoomSession {
    connected: boolean; userName?: string; userEmail?: string; expired?: boolean
}

// Meeting list types
interface MeetingRecord {
    id: number
    title: string
    meeting_type: 'online' | 'offline'
    platform: string | null
    recorded_at: string
    duration_sec: number
    summary: string
    audio_url: string | null
    participants: { name: string; role: string }[]
    action_items: { task: string; owner: string; deadline: string; priority: string }[]
    key_decisions: { decision: string; context: string }[]
    follow_ups: { topic: string; notes: string }[]
    transcript: string
}
interface MeetingTask {
    id: number
    title: string
    description: string
    priority: string
    status: string
    due_date: string | null
    assigned_to: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(sec: number) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function formatDuration(sec: number) {
    if (!sec) return '—'
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}
function formatDateTime(dt: string) {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
function getLastUpdated() {
    return new Date().toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).replace(',', ',')
}

const PLATFORM_LABELS: Record<string, string> = {
    meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams', other: 'Other'
}
const PLATFORM_COLOR: Record<string, string> = {
    meet: 'bg-blue-100 text-blue-700 border-blue-200',
    zoom: 'bg-sky-100 text-sky-700 border-sky-200',
    teams: 'bg-purple-100 text-purple-700 border-purple-200',
    other: 'bg-gray-100 text-gray-600 border-gray-200',
}
const PRIORITY_BADGE: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
}
const STATUS_BADGE: Record<AppState, string> = {
    idle: 'bg-gray-100 text-gray-600', recording: 'bg-red-100 text-red-700',
    paused: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<AppState, string> = {
    idle: 'Ready', recording: '⏺ Live', paused: '⏸ Paused',
    processing: '⚙ Processing', done: '✓ Saved', error: '✗ Error',
}
const PIPELINE_STEPS = [
    { key: 'uploading', label: 'Uploading audio to Google Drive', icon: <Upload className="h-3.5 w-3.5" /> },
    { key: 'transcribing', label: 'Transcribing with Whisper AI', icon: <Mic className="h-3.5 w-3.5" /> },
    { key: 'processing', label: 'Generating notes with Claude AI', icon: <Brain className="h-3.5 w-3.5" /> },
    { key: 'saving', label: 'Saving meeting to CRM', icon: <Save className="h-3.5 w-3.5" /> },
    { key: 'extracting', label: 'Extracting tasks automatically', icon: <ListChecks className="h-3.5 w-3.5" /> },
]
const STEP_ORDER = ['uploading', 'transcribing', 'processing', 'saving', 'extracting', 'done']

const DATE_RANGE_OPTIONS = [
    'All Dates', 'Today', 'Yesterday', 'This Week',
    'Last 7 Days', 'Last Week', 'This Month', 'Last Month',
    'This Year', 'Last Year', 'Custom Range',
]

// ─── Modal Component ──────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide = false }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] flex flex-col`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-base font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MeetingFMSPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth() as any
    const { data: googleSession, status: sessionStatus } = useSession()

    // ── View state ────────────────────────────────────────────────────────────
    const [pageView, setPageView] = useState<PageView>('list')
    const [lastUpdated, setLastUpdated] = useState(getLastUpdated())

    // ── Recorder state ────────────────────────────────────────────────────────
    const [appState, setAppState] = useState<AppState>('idle')
    const [processStep, setProcessStep] = useState<ProcessStep | null>(null)
    const [elapsed, setElapsed] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const [savedId, setSavedId] = useState<number | null>(null)
    const [notes, setNotes] = useState<ProcessedNotes | null>(null)
    const [transcript, setTranscript] = useState('')
    const [audioLevel, setAudioLevel] = useState(0)
    const [tasksCount, setTasksCount] = useState(0)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [participantNote, setParticipantNote] = useState('')
    const [signingIn, setSigningIn] = useState(false)
    const [zoomSession, setZoomSession] = useState<ZoomSession>({ connected: false })
    const [zoomConnecting, setZoomConnecting] = useState(false)
    const [isHost, setIsHost] = useState<boolean | null>(null)
    const [zoomStatus, setZoomStatus] = useState('')
    const [autoStopped, setAutoStopped] = useState(false)
    const [retryAvailable, setRetryAvailable] = useState(false)
    const [retryingParticipants, setRetryingParticipants] = useState(false)
    const [meta, setMeta] = useState<MeetingMeta>({
        title: '', mode: 'online', platform: 'meet',
        contactEmail: '', leadId: '', meetCode: '', zoomMeetingId: '', meetingUrl: '',
    })
    const [parsedMeeting, setParsedMeeting] = useState<ParsedMeeting | null>(null)

    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const audioChunks = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animFrameRef = useRef<number>(0)
    const streamRef = useRef<MediaStream | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const elapsedRef = useRef(0)
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const metaRef = useRef(meta)

    // ── List / FMS state ──────────────────────────────────────────────────────
    const [meetings, setMeetings] = useState<MeetingRecord[]>([])
    const [meetingsLoading, setMeetingsLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState('All Dates')
    const [meetingTypeFilter, setMeetingTypeFilter] = useState('All')
    const [platformFilter, setPlatformFilter] = useState('All')
    const [dateRangeOpen, setDateRangeOpen] = useState(false)

    // KPIs
    const [kpis, setKpis] = useState({ total: 0, online: 0, offline: 0, actionItems: 0, decisions: 0 })

    // Popups
    const [participantsPopup, setParticipantsPopup] = useState<{ open: boolean; data: { name: string; role: string }[]; title: string }>({ open: false, data: [], title: '' })
    const [actionsPopup, setActionsPopup] = useState<{ open: boolean; data: { task: string; owner: string; deadline: string; priority: string }[]; title: string }>({ open: false, data: [], title: '' })
    const [decisionsPopup, setDecisionsPopup] = useState<{ open: boolean; data: { decision: string; context: string }[]; title: string }>({ open: false, data: [], title: '' })
    const [notesPopup, setNotesPopup] = useState<{ open: boolean; meeting: MeetingRecord | null }>({ open: false, meeting: null })
    const [tasksPopup, setTasksPopup] = useState<{ open: boolean; meetingId: number | null; meetingTitle: string; tasks: MeetingTask[] }>({ open: false, meetingId: null, meetingTitle: '', tasks: [] })
    const [tasksLoading, setTasksLoading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; meetingId: number | null; title: string }>({ open: false, meetingId: null, title: '' })
    const [deleting, setDeleting] = useState(false)

    // Task edit state
    const [editingTask, setEditingTask] = useState<MeetingTask | null>(null)
    const [taskSaving, setTaskSaving] = useState(false)

    // ── Fetch meetings list ───────────────────────────────────────────────────
    const fetchMeetings = useCallback(async () => {
        setMeetingsLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(rowsPerPage),
                search: searchQuery,
                date_range: dateRange,
                meeting_type: meetingTypeFilter === 'All' ? '' : meetingTypeFilter.toLowerCase(),
                platform: platformFilter === 'All' ? '' : platformFilter.toLowerCase(),
            })
            const res = await fetch(`/api/meetings/save?${params}`)
            const data = await res.json()
            setMeetings(data.meetings || [])
            setTotalCount(data.total || 0)
            setKpis({
                total: data.kpis?.total || 0,
                online: data.kpis?.online || 0,
                offline: data.kpis?.offline || 0,
                actionItems: data.kpis?.action_items || 0,
                decisions: data.kpis?.decisions || 0,
            })
            setLastUpdated(getLastUpdated())
        } catch (err) {
            console.error('[fetchMeetings]', err)
        } finally {
            setMeetingsLoading(false)
        }
    }, [currentPage, rowsPerPage, searchQuery, dateRange, meetingTypeFilter, platformFilter])

    useEffect(() => {
        if (pageView === 'list') fetchMeetings()
    }, [fetchMeetings, pageView])

    // ── Fetch tasks for a meeting ─────────────────────────────────────────────
    const fetchTasksForMeeting = async (meetingId: number, meetingTitle: string) => {
        setTasksLoading(true)
        setTasksPopup({ open: true, meetingId, meetingTitle, tasks: [] })
        try {
            const res = await fetch(`/api/meetings/tasks?meeting_id=${meetingId}`)
            const data = await res.json()
            setTasksPopup(prev => ({ ...prev, tasks: data.tasks || [] }))
        } catch (err) {
            console.error('[fetchTasks]', err)
        } finally {
            setTasksLoading(false)
        }
    }

    // ── Delete meeting ────────────────────────────────────────────────────────
    const deleteMeeting = async () => {
        if (!deleteConfirm.meetingId) return
        setDeleting(true)
        try {
            await fetch(`/api/meetings/delete`, {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deleteConfirm.meetingId }),
            })
            setDeleteConfirm({ open: false, meetingId: null, title: '' })
            fetchMeetings()
        } catch (err) {
            console.error('[deleteMeeting]', err)
        } finally {
            setDeleting(false)
        }
    }

    // ── Save task edit ────────────────────────────────────────────────────────
    const saveTaskEdit = async () => {
        if (!editingTask) return
        setTaskSaving(true)
        try {
            await fetch(`/api/meetings/tasks`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTask),
            })
            setTasksPopup(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === editingTask.id ? editingTask : t)
            }))
            setEditingTask(null)
        } catch (err) {
            console.error('[saveTask]', err)
        } finally {
            setTaskSaving(false)
        }
    }

    // ── Delete task ───────────────────────────────────────────────────────────
    const deleteTask = async (taskId: number) => {
        try {
            await fetch(`/api/meetings/tasks`, {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId }),
            })
            setTasksPopup(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }))
        } catch (err) {
            console.error('[deleteTask]', err)
        }
    }

    // ── Recorder logic (untouched) ────────────────────────────────────────────
    useEffect(() => { elapsedRef.current = elapsed }, [elapsed])
    useEffect(() => { metaRef.current = meta }, [meta])

    useEffect(() => { fetchZoomSession() }, [])

    useEffect(() => {
        const zoomConnected = searchParams.get('zoom_connected')
        const zoomError = searchParams.get('zoom_error')
        const meetingUrl = searchParams.get('meeting_url')
        if (zoomConnected === 'true') {
            fetchZoomSession().then(() => { router.replace('/meetings/record') })
        }
        if (zoomError) {
            setErrorMsg(`Zoom connection failed: ${zoomError}`)
            router.replace('/meetings/record')
        }
        if (meetingUrl) {
            handleMeetingUrlChange(meetingUrl)
            router.replace('/meetings/record')
        }
    }, [searchParams])

    const fetchZoomSession = async () => {
        try {
            const res = await fetch('/api/meetings/zoom-status')
            const data = await res.json()
            setZoomSession(data)
            return data
        } catch { return { connected: false } }
    }

    const handleMeetingUrlChange = (raw: string) => {
        setMeta(p => ({ ...p, meetingUrl: raw }))
        if (!raw.trim()) { setParsedMeeting(null); return }
        const parsed = parseMeetingInput(raw)
        setParsedMeeting(parsed)
        if (parsed.confidence === 'high') {
            setMeta(p => ({ ...p, meetingUrl: raw, platform: parsed.platform, meetCode: parsed.meetCode, zoomMeetingId: parsed.zoomId }))
        }
    }

    const clearMeetingUrl = () => {
        setMeta(p => ({ ...p, meetingUrl: '', meetCode: '', zoomMeetingId: '', platform: 'meet' }))
        setParsedMeeting(null)
    }

    const googleError = (googleSession as any)?.error
    const isGoogleConnected = sessionStatus === 'authenticated' && !!(googleSession as any)?.accessToken && googleError !== 'RefreshAccessTokenError'
    const googleUserName = (googleSession as any)?.user?.name || ''

    const drawVisualiser = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')!
        const bufLen = analyserRef.current.frequencyBinCount
        const dataArr = new Uint8Array(bufLen)
        analyserRef.current.getByteFrequencyData(dataArr)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const barW = (canvas.width / bufLen) * 2.5
        let x = 0
        for (let i = 0; i < bufLen; i++) {
            const barH = (dataArr[i] / 255) * canvas.height
            ctx.fillStyle = `hsla(${226 + (i / bufLen) * 20}, 70%, ${55 + (dataArr[i] / 255) * 20}%, 0.9)`
            ctx.fillRect(x, canvas.height - barH, barW, barH)
            x += barW + 1
        }
        setAudioLevel(dataArr.reduce((a, b) => a + b, 0) / bufLen / 255)
        animFrameRef.current = requestAnimationFrame(drawVisualiser)
    }, [])

    const startTimer = () => {
        startTimeRef.current = Date.now() - elapsed * 1000
        timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500)
    }
    const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

    const startZoomPolling = async (meetingId: string) => {
        const res = await fetch('/api/meetings/zoom-status', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId }),
        })
        const data = await res.json()
        if (!data.isHost) { setIsHost(false); setZoomStatus('You are not the host — stop recording manually when done'); return }
        setIsHost(true); setZoomStatus('You are the host — recording will stop automatically when meeting ends')
        pollIntervalRef.current = setInterval(async () => {
            try {
                const pollRes = await fetch('/api/meetings/zoom-status', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meetingId: metaRef.current.zoomMeetingId }),
                })
                const pollData = await pollRes.json()
                if (pollData.isEnded || pollData.status === 'finished') {
                    clearInterval(pollIntervalRef.current!)
                    setZoomStatus('Meeting ended — stopping recording automatically...')
                    setAutoStopped(true)
                    triggerAutoStop()
                }
            } catch (err) { console.warn('[Zoom poll]', err) }
        }, 30000)
    }

    const stopZoomPolling = () => {
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    }

    const triggerAutoStop = () => {
        if (!mediaRecorder.current) return
        mediaRecorder.current.stop(); stopTimer()
        cancelAnimationFrame(animFrameRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        setAppState('processing')
    }

    const handleConnectGoogle = async () => {
        setSigningIn(true)
        try { await signIn('google', { redirect: false, callbackUrl: window.location.href }) }
        finally { setSigningIn(false) }
    }

    const handleConnectZoom = () => { window.location.href = '/api/zoom/connect' }

    const startRecording = async () => {
        setErrorMsg('')
        try {
            let stream: MediaStream
            if (meta.mode === 'online') {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true, audio: { echoCancellation: true, noiseSuppression: true } as any,
                })
                displayStream.getVideoTracks().forEach(t => t.stop())
                let micStream: MediaStream | null = null
                try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }) } catch { }
                if (micStream) {
                    const ctx = new AudioContext()
                    const dest = ctx.createMediaStreamDestination()
                    ctx.createMediaStreamSource(displayStream).connect(dest)
                    ctx.createMediaStreamSource(micStream).connect(dest)
                    const analyser = ctx.createAnalyser(); analyser.fftSize = 256
                    ctx.createMediaStreamSource(displayStream).connect(analyser)
                    analyserRef.current = analyser; stream = dest.stream
                } else {
                    stream = displayStream
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
                let lastErr: any = null
                for (const c of constraints) {
                    try { stream = await navigator.mediaDevices.getUserMedia({ audio: c, video: false }); lastErr = null; break }
                    catch (e: any) { lastErr = e }
                }
                if (!stream! || lastErr) {
                    let devices: MediaDeviceInfo[] = []
                    try { devices = await navigator.mediaDevices.enumerateDevices() } catch { }
                    const hasMic = devices.some(d => d.kind === 'audioinput')
                    throw new Error(hasMic
                        ? `Microphone access failed: ${lastErr?.message}. Please allow mic permission and try again.`
                        : 'No microphone found. Please connect a microphone and try again.')
                }
                const ctx = new AudioContext()
                const analyser = ctx.createAnalyser(); analyser.fftSize = 256
                ctx.createMediaStreamSource(stream).connect(analyser)
                analyserRef.current = analyser
            }
            if (stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach(t => t.stop())
                setErrorMsg('No audio captured. Make sure to check "Share tab audio" when selecting your tab.')
                return
            }
            streamRef.current = stream
            if (meta.mode === 'online') {
                stream.getAudioTracks().forEach(track => {
                    track.addEventListener('ended', () => {
                        setAppState(current => {
                            if (current === 'recording' || current === 'paused') {
                                stopZoomPolling(); stopTimer()
                                cancelAnimationFrame(animFrameRef.current)
                                streamRef.current?.getTracks().forEach(t => t.stop())
                                setAutoStopped(true)
                                if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                                    mediaRecorder.current.stop()
                                }
                                return 'processing'
                            }
                            return current
                        })
                    })
                })
            }
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t))
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
            audioChunks.current = []
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
            recorder.onstop = () => handleRecordingStop()
            recorder.start(1000)
            mediaRecorder.current = recorder
            setAppState('recording'); startTimer(); drawVisualiser()
            if (meta.platform === 'zoom' && meta.zoomMeetingId.trim() && zoomSession.connected) {
                await startZoomPolling(meta.zoomMeetingId.trim())
            }
        } catch (err: any) {
            setErrorMsg(err.name === 'NotAllowedError'
                ? 'Permission denied. Please allow microphone/screen access and try again.'
                : `Could not start recording: ${err.message}`)
        }
    }

    const togglePause = () => {
        if (!mediaRecorder.current) return
        if (appState === 'recording') {
            mediaRecorder.current.pause(); stopTimer(); cancelAnimationFrame(animFrameRef.current); setAppState('paused')
        } else {
            mediaRecorder.current.resume(); startTimer(); drawVisualiser(); setAppState('recording')
        }
    }

    const stopRecording = () => {
        stopZoomPolling(); mediaRecorder.current?.stop(); stopTimer()
        cancelAnimationFrame(animFrameRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        setAppState('processing')
    }

    const retryFetchParticipants = async () => {
        if (!savedId || !meta.meetCode || !isGoogleConnected) return
        const accessToken = (googleSession as any)?.accessToken
        if (!accessToken) return
        setRetryingParticipants(true)
        setParticipantNote('⏳ Retrying participant fetch...')
        try {
            const res = await fetch('/api/meetings/meet-participants', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetCode: meta.meetCode.trim(), accessToken }),
            })
            const data = await res.json()
            if (res.ok && data.participants?.length > 0) {
                setParticipants(data.participants)
                setParticipantNote(`✓ ${data.participants.length} participants fetched from Google Meet`)
                setRetryAvailable(false)
                setNotes(prev => prev ? { ...prev, participants: data.participants.map((p: any) => ({ name: p.name, role: p.role || 'attendee' })) } : prev)
                await fetch('/api/meetings/save', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: savedId, participants: data.participants.map((p: any) => ({ name: p.name, role: p.role || 'attendee' })) }),
                })
            } else if (data.retry_suggestion) {
                setParticipantNote('⚠️ Still not ready — try again in 1-2 minutes.')
            } else {
                setParticipantNote(`Could not fetch: ${data.error}`); setRetryAvailable(false)
            }
        } catch { setParticipantNote('Retry failed — try again.') }
        finally { setRetryingParticipants(false) }
    }

    const handleRecordingStop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const recordedAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace("T", " ")
        const userName = user?.name || 'kairali_crm_user'
        let fetchedParticipants: Participant[] = []
        if (meta.platform === 'meet' && meta.meetCode.trim() && isGoogleConnected) {
            const accessToken = (googleSession as any)?.accessToken
            if (accessToken) {
                try {
                    setParticipantNote('⏳ Fetching participants from Google Meet (may take up to 1 min)...')
                    const res = await fetch('/api/meetings/meet-participants', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ meetCode: meta.meetCode.trim(), accessToken }),
                    })
                    const data = await res.json()
                    if (res.ok && data.participants?.length > 0) {
                        fetchedParticipants = data.participants
                        setParticipantNote(`✓ ${fetchedParticipants.length} participants fetched from Google Meet`)
                        setRetryAvailable(false)
                    } else if (data.retry_suggestion) {
                        setParticipantNote(`⚠️ Meet conference record not ready yet — click Retry after 1-2 minutes.`)
                        setRetryAvailable(true)
                    } else {
                        setParticipantNote(`Note: ${data.error || 'No participants found'} — participants from transcript instead.`)
                    }
                } catch (err: any) { setParticipantNote('Could not fetch Meet participants — continuing.') }
            }
        }
        if (meta.platform === 'zoom' && meta.zoomMeetingId.trim() && zoomSession.connected && isHost) {
            try {
                setParticipantNote('Fetching participants from Zoom...')
                await new Promise(r => setTimeout(r, 3000))
                const res = await fetch('/api/meetings/zoom-participants', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meetingId: meta.zoomMeetingId.trim() }),
                })
                const data = await res.json()
                if (data.participants?.length > 0) {
                    fetchedParticipants = data.participants
                    setParticipantNote(`✓ ${fetchedParticipants.length} participants from Zoom`)
                } else {
                    setParticipantNote(data.note || 'No Zoom participants found — using transcript.')
                }
            } catch (err: any) { setParticipantNote('Could not fetch Zoom participants — continuing.') }
        }
        setParticipants(fetchedParticipants)
        await runPipeline(audioBlob, recordedAt, fetchedParticipants)
    }

    const runPipeline = async (audioBlob: Blob, recordedAt: string, fetchedParticipants: Participant[]) => {
        const sizeKb = Math.round(audioBlob.size / 1024)
        const userName = user?.name || 'kairali_crm_user'
        const finalElapsed = elapsedRef.current
        try {
            setProcessStep('uploading')
            const uploadForm = new FormData()
            uploadForm.append('audio', audioBlob, 'recording.webm')
            const uploadRes = await fetch('/api/meetings/upload-audio', { method: 'POST', body: uploadForm })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Audio upload failed')
            const audioUrl = uploadData.streamUrl

            setProcessStep('transcribing')
            const txForm = new FormData()
            txForm.append('audio', audioBlob, 'recording.webm')
            const txRes = await fetch('/api/meetings/transcribe', { method: 'POST', body: txForm })
            const txData = await txRes.json()
            if (!txRes.ok) throw new Error(txData.error || 'Transcription failed')
            const txText: string = txData.transcript || ''
            setTranscript(txText)

            setProcessStep('processing')
            const procRes = await fetch('/api/meetings/process', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: txText, title: meta.title || 'Untitled Meeting', meeting_type: meta.mode }),
            })
            const procData = await procRes.json()
            if (!procRes.ok) throw new Error(procData.error || 'AI processing failed')
            const mergedParticipants = fetchedParticipants.length > 0
                ? fetchedParticipants.map(p => ({ name: p.name, role: p.role || 'attendee' }))
                : (procData.participants || [])
            setNotes({ ...procData, participants: mergedParticipants })

            setProcessStep('saving')
            const saveRes = await fetch('/api/meetings/save', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: meta.title || 'Untitled Meeting',
                    meeting_type: meta.mode,
                    platform: meta.mode === 'online' ? meta.platform : null,
                    recorded_at: recordedAt,
                    duration_sec: finalElapsed,
                    audio_size_kb: sizeKb,
                    audio_url: audioUrl,
                    transcript: txText,
                    summary: procData.summary,
                    action_items: procData.action_items,
                    key_decisions: procData.key_decisions,
                    participants: mergedParticipants,
                    follow_ups: procData.follow_ups,
                    lead_id: meta.leadId || null,
                    contact_email: meta.contactEmail || null,
                    recorded_by: userName,
                }),
            })
            const saveData = await saveRes.json()
            if (!saveRes.ok) throw new Error(saveData.error || 'Save failed')
            setSavedId(saveData.id)

            setProcessStep('extracting')
            const taskRes = await fetch('/api/meetings/extract-tasks', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meeting_id: saveData.id, meeting_title: meta.title || 'Untitled Meeting', transcript: txText, assigned_by: userName }),
            })
            const taskData = await taskRes.json()
            setTasksCount(taskData.tasks_created || 0)
            setProcessStep('done')
            setAppState('done')
        } catch (err: any) {
            setErrorMsg(err.message || 'Something went wrong during processing')
            setAppState('error')
        }
    }

    useEffect(() => {
        return () => {
            stopTimer(); stopZoomPolling()
            cancelAnimationFrame(animFrameRef.current)
            streamRef.current?.getTracks().forEach(t => t.stop())
        }
    }, [])

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(totalCount / rowsPerPage)

    const clearFilters = () => {
        setSearchQuery(''); setDateRange('All Dates')
        setMeetingTypeFilter('All'); setPlatformFilter('All')
        setCurrentPage(1)
    }

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>

            {/* ── Banner ────────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-900 text-white px-6 py-5 flex items-center justify-between flex-wrap gap-4 -mx-6 -mt-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center flex-shrink-0">
                        <AudioLines className="h-6 w-6 text-indigo-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">AI Meeting Notes</h1>
                        <p className="text-sm text-slate-400 mt-0.5">Record · Transcribe · Extract Tasks · Save</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Last Updated</p>
                        <p className="text-sm font-semibold text-slate-200">{lastUpdated}</p>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                LIST VIEW
            ════════════════════════════════════════════════════════════════ */}
            {pageView === 'list' && (
                <div className="space-y-5">

                    {/* ── Filters ─────────────────────────────────────────── */}
                    <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-3 border-b border-gray-100 flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                                <CardTitle className="text-sm font-bold text-gray-800">Filters & Search</CardTitle>
                                <span className="text-xs text-gray-400">Refine your meeting feed using smart parameters</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs border-gray-300 text-gray-600 hover:bg-gray-50">
                                Clear Filters
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                                {/* Search */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Meetings</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                        <Input
                                            placeholder="Title, participant..."
                                            value={searchQuery}
                                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                            className="pl-8 h-9 text-sm border-gray-300 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date Range</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setDateRangeOpen(!dateRangeOpen)}
                                            className="w-full h-9 flex items-center justify-between px-3 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
                                        >
                                            <span>{dateRange}</span>
                                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                        </button>
                                        {dateRangeOpen && (
                                            <div className="absolute z-20 top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl w-52 py-1 overflow-hidden">
                                                {DATE_RANGE_OPTIONS.map(opt => (
                                                    <button key={opt} onClick={() => { setDateRange(opt); setDateRangeOpen(false); setCurrentPage(1) }}
                                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${dateRange === opt ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                                                        {opt}
                                                        {dateRange === opt && <span className="float-right text-indigo-500">✓</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Meeting Type */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meeting Type</label>
                                    <select
                                        value={meetingTypeFilter}
                                        onChange={e => { setMeetingTypeFilter(e.target.value); setCurrentPage(1) }}
                                        className="w-full h-9 text-sm border border-gray-300 rounded-md bg-white text-gray-700 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option>All</option>
                                        <option>Online</option>
                                        <option>Offline</option>
                                    </select>
                                </div>

                                {/* Platform */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</label>
                                    <select
                                        value={platformFilter}
                                        onChange={e => { setPlatformFilter(e.target.value); setCurrentPage(1) }}
                                        className="w-full h-9 text-sm border border-gray-300 rounded-md bg-white text-gray-700 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option>All</option>
                                        <option value="meet">Google Meet</option>
                                        <option value="zoom">Zoom</option>
                                        <option value="teams">Teams</option>
                                        <option value="other">Other</option>
                                        <option value="offline">Offline</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── KPI Cards ────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Total Meetings', value: kpis.total, icon: <ClipboardList className="h-5 w-5" />, color: 'border-slate-200 bg-white', iconBg: 'bg-slate-100 text-slate-600', valColor: 'text-slate-900' },
                            { label: 'Online', value: kpis.online, icon: <Monitor className="h-5 w-5" />, color: 'border-blue-100 bg-blue-50', iconBg: 'bg-blue-100 text-blue-600', valColor: 'text-blue-700' },
                            { label: 'Offline', value: kpis.offline, icon: <Mic className="h-5 w-5" />, color: 'border-green-100 bg-green-50', iconBg: 'bg-green-100 text-green-600', valColor: 'text-green-700' },
                            { label: 'Action Items', value: kpis.actionItems, icon: <ListChecks className="h-5 w-5" />, color: 'border-amber-100 bg-amber-50', iconBg: 'bg-amber-100 text-amber-600', valColor: 'text-amber-700' },
                            { label: 'Key Decisions', value: kpis.decisions, icon: <BarChart2 className="h-5 w-5" />, color: 'border-purple-100 bg-purple-50', iconBg: 'bg-purple-100 text-purple-600', valColor: 'text-purple-700' },
                        ].map(kpi => (
                            <Card key={kpi.label} className={`border shadow-sm ${kpi.color}`}>
                                <CardContent className="pt-4 pb-4 px-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-none mb-2">{kpi.label}</p>
                                            <p className={`text-3xl font-bold ${kpi.valColor}`}>{meetingsLoading ? '—' : kpi.value}</p>
                                        </div>
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.iconBg}`}>
                                            {kpi.icon}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* ── Table ────────────────────────────────────────────── */}
                    <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-3 border-b border-gray-100 flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <AudioLines className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-wide">Meeting Records</CardTitle>
                                    <p className="text-xs text-gray-400">{totalCount} total meetings</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={fetchMeetings} className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
                                </Button>
                                <Button size="sm" onClick={() => setPageView('recorder')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add New Meeting
                                </Button>
                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold">
                                    {totalCount} Records
                                </Badge>
                            </div>
                        </CardHeader>

                        <div className="overflow-x-auto">
                            {meetingsLoading ? (
                                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-sm">Loading meetings...</span>
                                </div>
                            ) : meetings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
                                    <AudioLines className="h-8 w-8 opacity-30" />
                                    <p className="text-sm font-medium">No meetings found</p>
                                    <p className="text-xs">Try adjusting filters or record a new meeting</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {['S.No', 'Meeting Date & Time', 'Title', 'Duration', 'Type', 'Platform', 'Summary', 'Recording', 'Participants', 'Action Items', 'Key Decisions', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {meetings.map((m, i) => {
                                            const high = m.action_items?.filter(a => a.priority === 'high').length || 0
                                            const medium = m.action_items?.filter(a => a.priority === 'medium').length || 0
                                            const low = m.action_items?.filter(a => a.priority === 'low').length || 0
                                            const totalActions = m.action_items?.length || 0
                                            const totalDecisions = m.key_decisions?.length || 0
                                            const totalParticipants = m.participants?.length || 0
                                            const rowNum = (currentPage - 1) * rowsPerPage + i + 1

                                            return (
                                                <tr key={m.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                                                    {/* S.No */}
                                                    <td className="px-4 py-3 text-gray-500 font-medium">{rowNum}</td>

                                                    {/* Date & Time */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-xs font-semibold text-gray-800">
                                                            {new Date(m.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {new Date(m.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                    </td>

                                                    {/* Title */}
                                                    <td className="px-4 py-3 min-w-[160px]">
                                                        <span className="font-semibold text-gray-900 line-clamp-2">{m.title || 'Untitled Meeting'}</span>
                                                    </td>

                                                    {/* Duration */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                            {formatDuration(m.duration_sec)}
                                                        </div>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="px-4 py-3">
                                                        <Badge className={m.meeting_type === 'online'
                                                            ? 'bg-blue-100 text-blue-700 border-blue-200 font-semibold'
                                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold'}>
                                                            {m.meeting_type === 'online' ? '🖥 Online' : '🎙 Offline'}
                                                        </Badge>
                                                    </td>

                                                    {/* Platform */}
                                                    <td className="px-4 py-3">
                                                        {m.platform ? (
                                                            <Badge className={`font-semibold ${PLATFORM_COLOR[m.platform] || PLATFORM_COLOR.other}`}>
                                                                {PLATFORM_LABELS[m.platform] || m.platform}
                                                            </Badge>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>

                                                    {/* Summary */}
                                                    <td className="px-4 py-3 max-w-[180px]">
                                                        <div className="relative group cursor-default">
                                                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{m.summary || '—'}</p>
                                                            {m.summary && (
                                                                <div className="absolute z-30 left-0 top-full mt-1 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 leading-relaxed shadow-xl
                                                                    invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 pointer-events-none">
                                                                    {m.summary}
                                                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Recording */}
                                                    <td className="px-4 py-3">
                                                        {m.audio_url ? (
                                                            <a href={m.audio_url} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                                                                <Headphones className="h-3.5 w-3.5" />Listen
                                                            </a>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>

                                                    {/* Participants */}
                                                    <td className="px-4 py-3">
                                                        {totalParticipants > 0 ? (
                                                            <button
                                                                onClick={() => setParticipantsPopup({ open: true, data: m.participants, title: m.title })}
                                                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border border-slate-200 hover:border-indigo-200"
                                                            >
                                                                <Users className="h-3 w-3" />{totalParticipants}
                                                            </button>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>

                                                    {/* Action Items */}
                                                    <td className="px-4 py-3">
                                                        {totalActions > 0 ? (
                                                            <button
                                                                onClick={() => setActionsPopup({ open: true, data: m.action_items, title: m.title })}
                                                                className="group flex flex-col gap-1 hover:opacity-80 transition-opacity text-left"
                                                            >
                                                                <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-700">{totalActions} items</span>
                                                                <div className="flex gap-1">
                                                                    {high > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">H:{high}</span>}
                                                                    {medium > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">M:{medium}</span>}
                                                                    {low > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">L:{low}</span>}
                                                                </div>
                                                            </button>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>

                                                    {/* Key Decisions */}
                                                    <td className="px-4 py-3">
                                                        {totalDecisions > 0 ? (
                                                            <button
                                                                onClick={() => setDecisionsPopup({ open: true, data: m.key_decisions, title: m.title })}
                                                                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border border-purple-200"
                                                            >
                                                                <BarChart2 className="h-3 w-3" />{totalDecisions}
                                                            </button>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <button
                                                                onClick={() => setNotesPopup({ open: true, meeting: m })}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors whitespace-nowrap"
                                                            >
                                                                <FileText className="h-3 w-3" />Notes
                                                            </button>
                                                            <button
                                                                onClick={() => fetchTasksForMeeting(m.id, m.title)}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors whitespace-nowrap"
                                                            >
                                                                <ListChecks className="h-3 w-3" />Tasks
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm({ open: true, meetingId: m.id, title: m.title })}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border border-red-200 transition-colors"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {!meetingsLoading && meetings.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Rows</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 bg-white"
                                    >
                                        {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                                    </select>
                                    <span className="text-gray-400">
                                        Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, totalCount)} of {totalCount}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-gray-300 h-8 w-8 p-0">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-gray-300 h-8 w-8 p-0">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                RECORDER VIEW
            ════════════════════════════════════════════════════════════════ */}
            {pageView === 'recorder' && (
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Recorder header */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">New Meeting Recording</h2>
                            <p className="text-sm text-gray-500">Configure and start recording your meeting</p>
                        </div>
                        <Badge className={STATUS_BADGE[appState]}>{STATUS_LABEL[appState]}</Badge>
                    </div>

                    {/* IDLE */}
                    {appState === 'idle' && (
                        <Card className="border border-gray-200 shadow-sm">
                            <CardHeader className="pb-4 border-b border-gray-100">
                                <CardTitle className="text-lg font-semibold text-gray-900">Configure Meeting</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5 space-y-5">

                                {/* Mode */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Meeting Type</label>
                                    <div className="flex gap-2">
                                        {(['online', 'offline'] as RecordMode[]).map(m => (
                                            <button key={m} onClick={() => setMeta(p => ({ ...p, mode: m }))}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${meta.mode === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                                {m === 'online' ? <Monitor className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                                {m === 'online' ? 'Online' : 'Offline'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Smart Meeting URL Input */}
                                {meta.mode === 'online' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                            Meeting Link or Code
                                            <span className="font-normal text-gray-400 normal-case ml-1">(paste any Meet/Zoom/Teams URL or just the code)</span>
                                        </label>
                                        <div className="relative">
                                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                            <Input
                                                placeholder="Paste link — meet.google.com/abc-xyz · zoom.us/j/123456"
                                                value={meta.meetingUrl}
                                                onChange={e => handleMeetingUrlChange(e.target.value)}
                                                className="pl-9 pr-9 border-gray-300 focus:ring-indigo-500 font-mono text-sm"
                                            />
                                            {meta.meetingUrl && (
                                                <button onClick={clearMeetingUrl}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        {parsedMeeting && parsedMeeting.confidence === 'high' && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                <span className="text-xs text-green-700 font-medium">
                                                    {parsedMeeting.platform === 'meet' && `Google Meet · ${parsedMeeting.meetCode}`}
                                                    {parsedMeeting.platform === 'zoom' && `Zoom · ID: ${parsedMeeting.zoomId}`}
                                                    {parsedMeeting.platform === 'teams' && 'Microsoft Teams detected'}
                                                </span>
                                            </div>
                                        )}
                                        {parsedMeeting?.error && (
                                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" />{parsedMeeting.error}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Platform override */}
                                {meta.mode === 'online' && (!parsedMeeting || parsedMeeting.confidence === 'low') && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Platform</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(Object.keys(PLATFORM_LABELS) as Platform[]).map(p => (
                                                <button key={p} onClick={() => setMeta(prev => ({ ...prev, platform: p }))}
                                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${meta.platform === p ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                                    {PLATFORM_LABELS[p]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Google connect */}
                                {meta.mode === 'online' && meta.platform === 'meet' && meta.meetCode && (
                                    <div className={`rounded-lg border p-4 ${isGoogleConnected ? 'bg-green-50 border-green-200' : googleError === 'RefreshAccessTokenError' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                        {isGoogleConnected ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-green-800">Google connected · {googleUserName}</p>
                                                    <p className="text-xs text-green-600">Participants fetched automatically after recording stops</p>
                                                </div>
                                            </div>
                                        ) : googleError === 'RefreshAccessTokenError' ? (
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-red-800">Google session expired</p>
                                                    <p className="text-xs text-red-700 mt-0.5">Your Google token expired and could not be refreshed. Please reconnect.</p>
                                                </div>
                                                <Button size="sm" onClick={handleConnectGoogle} disabled={signingIn} className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0">
                                                    {signingIn ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Reconnecting...</> : <><LogIn className="h-3.5 w-3.5 mr-1.5" />Reconnect Google</>}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-800">Connect Google to fetch participants</p>
                                                    <p className="text-xs text-amber-700 mt-0.5">Sign in now — no redirect during recording</p>
                                                </div>
                                                <Button size="sm" onClick={handleConnectGoogle} disabled={signingIn} className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 flex-shrink-0 shadow-none">
                                                    {signingIn ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Connecting...</> : <><LogIn className="h-3.5 w-3.5 mr-1.5" />Connect Google</>}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Zoom connect */}
                                {meta.mode === 'online' && meta.platform === 'zoom' && meta.zoomMeetingId && (
                                    <div className={`rounded-lg border p-4 ${zoomSession.connected ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                                        {zoomSession.connected ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-green-800">Zoom connected · {zoomSession.userName}</p>
                                                    <p className="text-xs text-green-600">Recording auto-stops when meeting ends · Participants fetched after</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-blue-800">Connect Zoom for auto-stop + participants</p>
                                                    <p className="text-xs text-blue-700 mt-0.5">You'll be redirected to Zoom — returns right back</p>
                                                </div>
                                                <Button size="sm" onClick={handleConnectZoom} className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
                                                    <Video className="h-3.5 w-3.5 mr-1.5" />Connect Zoom
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Meeting Title</label>
                                    <Input placeholder="e.g. KTAHV Sales Review, KAPPL Factory Head Interview..."
                                        value={meta.title} onChange={e => setMeta(p => ({ ...p, title: e.target.value }))}
                                        className="border-gray-300 focus:ring-indigo-500" />
                                </div>

                                {/* CRM fields */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Contact Email <span className="font-normal text-gray-400 normal-case">(auto)</span></label>
                                        <Input placeholder="lead@example.com" value={user?.email || meta.contactEmail}
                                            onChange={e => setMeta(p => ({ ...p, contactEmail: e.target.value }))}
                                            className="border-gray-300 focus:ring-indigo-500" disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Lead ID <span className="font-normal text-gray-400 normal-case">(auto)</span></label>
                                        <Input placeholder="CRM Lead ID" value={Date.now() || meta.leadId}
                                            onChange={e => setMeta(p => ({ ...p, leadId: e.target.value }))}
                                            className="border-gray-300 focus:ring-indigo-500" disabled />
                                    </div>
                                </div>

                                {/* Instructions */}
                                {meta.mode === 'online' && meta.platform === 'meet' && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 space-y-1">
                                        <p className="font-semibold">📌 Google Meet recording</p>
                                        <p>1. Enter Meet code + connect Google above</p>
                                        <p>2. Click Start → share the <strong>Meet tab</strong> with "Share tab audio"</p>
                                        <p>3. Recording <strong>auto-stops</strong> when you leave Meet or close the tab</p>
                                        <p>4. Participants fetched automatically, then pipeline runs</p>
                                    </div>
                                )}
                                {meta.mode === 'online' && meta.platform === 'zoom' && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 space-y-1">
                                        <p className="font-semibold">📌 Zoom recording</p>
                                        <p>1. Enter Meeting ID + connect Zoom above</p>
                                        <p>2. Click Start → share the <strong>Zoom tab</strong> with "Share tab audio"</p>
                                        <p>3. Recording <strong>auto-stops</strong> when the meeting ends or you leave</p>
                                        <p>4. Participants fetched after stop (host only, Pro account)</p>
                                    </div>
                                )}
                                {meta.mode === 'online' && (meta.platform === 'teams' || meta.platform === 'other') && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
                                        <p className="font-semibold mb-1">📌 Online recording</p>
                                        <p>Select the <strong>{PLATFORM_LABELS[meta.platform]}</strong> tab and enable "Share tab audio".</p>
                                    </div>
                                )}
                                {meta.mode === 'offline' && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
                                        <p className="font-semibold mb-1">🎙 Offline recording</p>
                                        <p>Your laptop microphone will be used. Place it close to all participants.</p>
                                    </div>
                                )}

                                {errorMsg && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{errorMsg}
                                    </div>
                                )}

                                <Button onClick={startRecording} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11">
                                    <Mic className="h-4 w-4 mr-2" />Start Recording
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* RECORDING / PAUSED */}
                    {(appState === 'recording' || appState === 'paused') && (
                        <Card className="border border-gray-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold text-gray-900">{meta.title || 'Untitled Meeting'}</CardTitle>
                                    <span className="text-sm text-gray-500">{meta.mode === 'online' ? `🖥 ${PLATFORM_LABELS[meta.platform]}` : '🎙 Offline'}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-5 space-y-4">
                                {meta.platform === 'zoom' && zoomStatus && (
                                    <div className={`rounded-lg p-3 flex items-center gap-2 text-sm border ${isHost === true ? 'bg-blue-50 border-blue-200 text-blue-800' : isHost === false ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        {isHost === true
                                            ? <><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />{zoomStatus}</>
                                            : <><AlertCircle className="h-4 w-4 flex-shrink-0" />{zoomStatus}</>}
                                    </div>
                                )}
                                {autoStopped && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
                                        <CheckCircle className="h-4 w-4 flex-shrink-0" />Meeting ended — recording stopped automatically
                                    </div>
                                )}
                                <div className="flex flex-col items-center gap-2 py-4">
                                    <div className="relative flex items-center justify-center">
                                        {appState === 'recording' && (
                                            <div className="absolute rounded-full bg-red-200 transition-all duration-100"
                                                style={{ width: 80 + audioLevel * 40, height: 80 + audioLevel * 40, opacity: 0.4 + audioLevel * 0.3 }} />
                                        )}
                                        <span className="relative text-5xl font-bold text-gray-900 tabular-nums tracking-wide">{formatTime(elapsed)}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                        {appState === 'paused' ? 'Recording paused' : 'Recording in progress'}
                                    </span>
                                </div>
                                <div className="rounded-xl overflow-hidden bg-gray-900 p-2">
                                    <canvas ref={canvasRef} width={600} height={72} className="w-full block" style={{ height: 72 }} />
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <Button variant="outline" onClick={togglePause} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                                        {appState === 'recording' ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2" />Resume</>}
                                    </Button>
                                    <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white">
                                        <Square className="h-4 w-4 mr-2" />Stop & Process
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* PROCESSING */}
                    {appState === 'processing' && (
                        <Card className="border border-gray-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-gray-100">
                                <CardTitle className="text-lg font-semibold text-gray-900">Processing your meeting...</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5 space-y-2">
                                {participantNote && (
                                    <div className={`rounded-lg p-3 mb-2 flex items-center gap-2 text-sm border ${participantNote.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        {participantNote.startsWith('✓') ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" /> : <Users className="h-4 w-4 flex-shrink-0" />}
                                        {participantNote}
                                    </div>
                                )}
                                {PIPELINE_STEPS.map(step => {
                                    const isDone = STEP_ORDER.indexOf(step.key) < STEP_ORDER.indexOf(processStep || 'uploading')
                                    const isActive = step.key === processStep
                                    return (
                                        <div key={step.key} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${isDone ? 'bg-green-50 border-green-200 text-green-700' : isActive ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                                {isDone ? '✓' : isActive ? <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" /> : step.icon}
                                            </div>
                                            <span className="text-sm font-medium">{step.label}</span>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}

                    {/* DONE */}
                    {appState === 'done' && notes && (
                        <div className="space-y-4">
                            <Card className="border border-green-200 bg-green-50 shadow-sm">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            <span className="font-semibold text-green-800">Meeting Notes Saved</span>
                                            <span className="text-sm text-green-600">· ID #{savedId} · {formatTime(elapsedRef.current)}</span>
                                            {tasksCount > 0 && (
                                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                                                    🗂 {tasksCount} task{tasksCount !== 1 ? 's' : ''} extracted
                                                </span>
                                            )}
                                            {participants.length > 0 && (
                                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full border border-green-200">
                                                    👥 {participants.length} participants
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setPageView('list')}
                                                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">← View All Meetings</Button>
                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                onClick={() => { setAppState('idle'); setElapsed(0); setNotes(null); setTranscript(''); setTasksCount(0); setParticipants([]); setParticipantNote(''); setIsHost(null); setZoomStatus(''); setAutoStopped(false) }}>
                                                + New Meeting
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-gray-200 shadow-sm">
                                <CardHeader className="pb-3 border-b border-gray-100">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">📋 Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">{notes.summary}</p>
                                </CardContent>
                            </Card>

                            {participants.length > 0 && (
                                <Card className="border border-green-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">👥 Participants ({participants.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="flex flex-wrap gap-2">
                                            {participants.map((p, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center text-xs font-bold">
                                                        {p.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 leading-none">{p.name}</p>
                                                        {p.email && <p className="text-xs text-gray-500 mt-0.5">{p.email}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {participants.length === 0 && retryAvailable && meta.platform === 'meet' && (
                                <Card className="border border-amber-200 bg-amber-50 shadow-sm">
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">👥 Participants not available yet</p>
                                                <p className="text-xs text-amber-700 mt-1">Google Meet takes 1–2 min to generate the attendance report. Click Retry to fetch.</p>
                                            </div>
                                            <Button size="sm" onClick={retryFetchParticipants} disabled={retryingParticipants}
                                                className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0">
                                                {retryingParticipants ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Retrying...</> : '↻ Retry'}
                                            </Button>
                                        </div>
                                        {participantNote && <p className="text-xs text-amber-700 mt-2">{participantNote}</p>}
                                    </CardContent>
                                </Card>
                            )}

                            {notes.action_items.length > 0 && (
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">✅ Action Items ({notes.action_items.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-3">
                                        {notes.action_items.map((ai, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="text-sm font-medium text-gray-900 flex-1">{ai.task}</span>
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${PRIORITY_BADGE[ai.priority] || PRIORITY_BADGE.low}`}>{ai.priority}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">👤 {ai.owner || 'Unassigned'} · 📅 {ai.deadline || 'No deadline'}</p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {notes.key_decisions.length > 0 && (
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">🔑 Key Decisions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        {notes.key_decisions.map((d, i) => (
                                            <div key={i} className="pl-4 border-l-2 border-indigo-400 py-1">
                                                <p className="text-sm font-semibold text-gray-900">{d.decision}</p>
                                                {d.context && <p className="text-xs text-gray-500 mt-0.5">{d.context}</p>}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="border border-gray-200 shadow-sm">
                                <details>
                                    <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-900 select-none list-none">
                                        <ChevronDown className="h-4 w-4" />View Raw Transcript
                                    </summary>
                                    <div className="px-6 pb-5">
                                        <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">{transcript}</pre>
                                    </div>
                                </details>
                            </Card>
                        </div>
                    )}

                    {/* ERROR */}
                    {appState === 'error' && (
                        <Card className="border border-red-200 shadow-sm">
                            <CardContent className="pt-5 space-y-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{errorMsg}
                                </div>
                                <Button onClick={() => { setAppState('idle'); setErrorMsg('') }} variant="outline" className="w-full border-gray-300">
                                    ← Try Again
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                POPUPS
            ════════════════════════════════════════════════════════════════ */}

            {/* Participants Popup */}
            <Modal open={participantsPopup.open} onClose={() => setParticipantsPopup(p => ({ ...p, open: false }))} title={`👥 Participants — ${participantsPopup.title}`}>
                <div className="space-y-2">
                    {participantsPopup.data.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No participants found</p>
                    ) : participantsPopup.data.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {p.name[0]?.toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{p.role || 'attendee'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Action Items Popup */}
            <Modal open={actionsPopup.open} onClose={() => setActionsPopup(p => ({ ...p, open: false }))} title={`✅ Action Items — ${actionsPopup.title}`} wide>
                <div className="space-y-3">
                    {actionsPopup.data.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No action items</p>
                    ) : actionsPopup.data.map((ai, i) => (
                        <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <p className="text-sm font-semibold text-gray-900 flex-1">{ai.task}</p>
                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${PRIORITY_BADGE[ai.priority] || PRIORITY_BADGE.low}`}>{ai.priority}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>👤 {ai.owner || 'Unassigned'}</span>
                                <span>📅 {ai.deadline || 'No deadline'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Key Decisions Popup */}
            <Modal open={decisionsPopup.open} onClose={() => setDecisionsPopup(p => ({ ...p, open: false }))} title={`🔑 Key Decisions — ${decisionsPopup.title}`} wide>
                <div className="space-y-3">
                    {decisionsPopup.data.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No decisions recorded</p>
                    ) : decisionsPopup.data.map((d, i) => (
                        <div key={i} className="p-4 rounded-xl bg-purple-50 border border-purple-100 border-l-4 border-l-purple-500">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{d.decision}</p>
                            {d.context && <p className="text-xs text-gray-500 leading-relaxed">{d.context}</p>}
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Meeting Notes Popup */}
            <Modal open={notesPopup.open} onClose={() => setNotesPopup({ open: false, meeting: null })} title="📋 Meeting Notes" wide>
                {notesPopup.meeting && (
                    <div className="space-y-4">

                        {/* ── Header meta ─────────────────────────────────── */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h4 className="text-base font-bold text-slate-900 mb-2">{notesPopup.meeting.title || 'Untitled Meeting'}</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(notesPopup.meeting.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    {' · '}
                                    {new Date(notesPopup.meeting.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(notesPopup.meeting.duration_sec)}
                                </span>
                                <Badge className={notesPopup.meeting.meeting_type === 'online' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                                    {notesPopup.meeting.meeting_type === 'online' ? '🖥 Online' : '🎙 Offline'}
                                </Badge>
                                {notesPopup.meeting.platform && (
                                    <Badge className={PLATFORM_COLOR[notesPopup.meeting.platform] || PLATFORM_COLOR.other}>
                                        {PLATFORM_LABELS[notesPopup.meeting.platform] || notesPopup.meeting.platform}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* ── Summary ─────────────────────────────────────── */}
                        {notesPopup.meeting.summary && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-2 flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />Summary
                                </p>
                                <p className="text-sm text-indigo-900 leading-relaxed">{notesPopup.meeting.summary}</p>
                            </div>
                        )}

                        {/* ── Action Items ─────────────────────────────────── */}
                        {notesPopup.meeting.action_items?.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-3 flex items-center gap-1.5">
                                    <ListChecks className="h-3.5 w-3.5" />Action Items
                                    <span className="ml-1 bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">{notesPopup.meeting.action_items.length}</span>
                                </p>
                                <div className="space-y-2">
                                    {notesPopup.meeting.action_items.map((ai, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-white border border-amber-100 rounded-lg p-3">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${PRIORITY_BADGE[ai.priority] || PRIORITY_BADGE.low}`}>{ai.priority}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 leading-snug">{ai.task}</p>
                                                <p className="text-xs text-gray-400 mt-1">👤 {ai.owner || '—'} · 📅 {ai.deadline || '—'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Key Decisions ────────────────────────────────── */}
                        {notesPopup.meeting.key_decisions?.length > 0 && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-purple-600 mb-3 flex items-center gap-1.5">
                                    <BarChart2 className="h-3.5 w-3.5" />Key Decisions
                                    <span className="ml-1 bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px]">{notesPopup.meeting.key_decisions.length}</span>
                                </p>
                                <div className="space-y-2">
                                    {notesPopup.meeting.key_decisions.map((d, i) => (
                                        <div key={i} className="bg-white border-l-4 border-l-purple-400 border border-purple-100 rounded-r-lg pl-3 pr-3 py-2.5">
                                            <p className="text-sm font-semibold text-gray-900">{d.decision}</p>
                                            {d.context && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{d.context}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Follow-ups ───────────────────────────────────── */}
                        {notesPopup.meeting.follow_ups?.length > 0 && (
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-teal-600 mb-3 flex items-center gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5" />Follow-ups
                                    <span className="ml-1 bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded-full text-[10px]">{notesPopup.meeting.follow_ups.length}</span>
                                </p>
                                <div className="space-y-2">
                                    {notesPopup.meeting.follow_ups.map((f, i) => (
                                        <div key={i} className="bg-white border border-teal-100 rounded-lg p-3">
                                            <p className="text-sm font-semibold text-gray-900">{f.topic}</p>
                                            {f.notes && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Participants ─────────────────────────────────── */}
                        {notesPopup.meeting.participants?.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-green-600 mb-3 flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />Participants
                                    <span className="ml-1 bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full text-[10px]">{notesPopup.meeting.participants.length}</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {notesPopup.meeting.participants.map((p, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white border border-green-100 rounded-lg px-3 py-2">
                                            <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                {p.name[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-900 leading-none">{p.name}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{p.role || 'attendee'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Raw Transcript ───────────────────────────────── */}
                        {notesPopup.meeting.transcript && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                <details>
                                    <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors select-none list-none">
                                        <ChevronDown className="h-3.5 w-3.5" />Raw Transcript
                                    </summary>
                                    <div className="px-4 pb-4 pt-1">
                                        <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed max-h-52">{notesPopup.meeting.transcript}</pre>
                                    </div>
                                </details>
                            </div>
                        )}

                    </div>
                )}
            </Modal>

            {/* Tasks Popup */}
            <Modal open={tasksPopup.open} onClose={() => { setTasksPopup(p => ({ ...p, open: false })); setEditingTask(null) }} title={`🗂 Tasks — ${tasksPopup.meetingTitle}`} wide>
                {tasksLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading tasks...</span>
                    </div>
                ) : tasksPopup.tasks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No tasks found for this meeting</p>
                ) : (
                    <div className="space-y-3">
                        {tasksPopup.tasks.map(task => (
                            <div key={task.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                                {editingTask?.id === task.id ? (
                                    // Edit mode
                                    <div className="space-y-3">
                                        <Input value={editingTask.title} onChange={e => setEditingTask(t => t ? { ...t, title: e.target.value } : t)}
                                            className="text-sm font-semibold border-indigo-300 focus:ring-indigo-500" />
                                        <textarea value={editingTask.description || ''} onChange={e => setEditingTask(t => t ? { ...t, description: e.target.value } : t)}
                                            rows={2} className="w-full text-xs border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
                                        <div className="grid grid-cols-3 gap-2">
                                            <select value={editingTask.priority} onChange={e => setEditingTask(t => t ? { ...t, priority: e.target.value } : t)}
                                                className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
                                                <option value="high">High</option>
                                                <option value="medium">Medium</option>
                                                <option value="low">Low</option>
                                            </select>
                                            <select value={editingTask.status} onChange={e => setEditingTask(t => t ? { ...t, status: e.target.value } : t)}
                                                className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
                                                <option value="pending">Pending</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                            <Input type="date" value={editingTask.due_date || ''} onChange={e => setEditingTask(t => t ? { ...t, due_date: e.target.value } : t)}
                                                className="text-xs border-gray-300" />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" onClick={() => setEditingTask(null)} className="border-gray-300 text-xs">Cancel</Button>
                                            <Button size="sm" onClick={saveTaskEdit} disabled={taskSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                                                {taskSaving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving...</> : '✓ Save'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // View mode
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.low}`}>{task.priority}</span>
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {task.status?.replace('_', ' ') || 'pending'}
                                                </span>
                                            </div>
                                            {task.description && <p className="text-xs text-gray-500 leading-relaxed mb-1">{task.description}</p>}
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                {task.assigned_to && <span>👤 {task.assigned_to}</span>}
                                                {task.due_date && <span>📅 {task.due_date}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <button onClick={() => setEditingTask(task)}
                                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors">
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => deleteTask(task.id)}
                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* Delete Confirm Popup */}
            <Modal open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, meetingId: null, title: '' })} title="🗑 Delete Meeting">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <p className="text-sm text-gray-800">Are you sure you want to delete this meeting?</p>
                        <p className="text-sm font-semibold text-red-700 mt-1">"{deleteConfirm.title}"</p>
                        <p className="text-xs text-gray-500 mt-2">This will permanently remove the meeting, its notes, transcript, and all extracted tasks.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 border-gray-300" onClick={() => setDeleteConfirm({ open: false, meetingId: null, title: '' })}>
                            Cancel
                        </Button>
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={deleteMeeting} disabled={deleting}>
                            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : '🗑 Delete Meeting'}
                        </Button>
                    </div>
                </div>
            </Modal>

        </DashboardLayout>
    )
}
