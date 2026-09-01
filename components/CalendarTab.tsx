'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'

interface CalendarMeeting {
  id: string; title: string
  start: string | null; end: string | null
  status: 'live' | 'soon' | 'upcoming' | 'ended'
  platform: string | null; meetingUrl: string | null; meetCode: string | null
  participants: { name: string; email: string; role: string; accepted: boolean }[]
  participantCount: number; organizer: string | null; htmlLink: string | null
}

const PLATFORM_COLOR: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  meet:  { dot: '#1ea362', bg: '#dcfce7', text: '#166534', label: 'Meet'  },
  zoom:  { dot: '#2563eb', bg: '#dbeafe', text: '#1e40af', label: 'Zoom'  },
  teams: { dot: '#7c3aed', bg: '#ede9fe', text: '#5b21b6', label: 'Teams' },
}

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay() // 0=Sun
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) { cells.push(null); continue }
    cells.push(new Date(year, month, dayNum))
  }
  return cells
}

export default function CalendarTab({ onStartRecording }: { onStartRecording: (m: CalendarMeeting) => void }) {
  const { data: session, status } = useSession()
  const accessToken = (session as any)?.accessToken
  const tokenError  = (session as any)?.error
  const isConnected = status === 'authenticated' && !!accessToken && tokenError !== 'RefreshAccessTokenError'

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [meetings,  setMeetings]  = useState<CalendarMeeting[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [selected,  setSelected]  = useState<{ date: Date; meetings: CalendarMeeting[] } | null>(null)

  const fetchCalendar = useCallback(async () => {
    if (!accessToken) return
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/calendar/meetings?token=${encodeURIComponent(accessToken)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.includes('insufficient') ? '__SCOPE__' : data.error || 'Could not load calendar')
        return
      }
      setMeetings(data.meetings || [])
    } catch { setError('Could not connect to Google Calendar. Please try again.') }
    finally { setLoading(false) }
  }, [accessToken])

  useEffect(() => {
    if (isConnected) {
      fetchCalendar()
      const t = setInterval(fetchCalendar, 5 * 60 * 1000)
      return () => clearInterval(t)
    }
  }, [isConnected, fetchCalendar])

  const currentYear = today.getFullYear()

  const prevMonth = () => {
    if (viewMonth === 0) {
      // Don't go before Jan of current year
      if (viewYear <= currentYear) return
      setViewYear(y => y - 1); setViewMonth(11)
    } else setViewMonth(m => m - 1)
    setSelected(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      // Don't go past Dec of current year
      if (viewYear >= currentYear) return
      setViewYear(y => y + 1); setViewMonth(0)
    } else setViewMonth(m => m + 1)
    setSelected(null)
  }

  const getMeetingsForDay = (date: Date) =>
    meetings.filter(m => m.start && isSameDay(new Date(m.start), date))
      .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())

  // ── NOT CONNECTED ─────────────────────────────────────────────────────────
  if (!isConnected) return (
    <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>📅</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Google Calendar</p>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>
        See all your meetings in a calendar view. Google Meet and Zoom links are auto-detected. One click to start recording.
      </p>
      {tokenError === 'RefreshAccessTokenError' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#b91c1c', marginBottom: 16 }}>
          Your Google session expired. Please reconnect.
        </div>
      )}
      <button onClick={() => { setSigningIn(true); sessionStorage.setItem('cal_return','1'); signIn('google', { redirect: true, callbackUrl: window.location.href }) }}
        disabled={signingIn}
        style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 24px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', opacity: signingIn ? 0.7 : 1 }}>
        {signingIn ? '⏳ Connecting...' : '🔑 Connect Google Account'}
      </button>
    </div>
  )

  // ── SCOPE ERROR ───────────────────────────────────────────────────────────
  if (error === '__SCOPE__') return (
    <div style={{ padding: '28px 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '20px 22px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>📅 Calendar permission needed</p>
        <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, marginBottom: 18 }}>
          Your Google account is connected but calendar access wasn't granted yet. Click below — Google will ask for permission, then your calendar loads automatically.
        </p>
        <button onClick={() => { sessionStorage.setItem('cal_return','1'); signIn('google', { redirect: true, callbackUrl: window.location.href }) }}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 20px', background:'#d97706', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          🔑 Grant Calendar Access
        </button>
      </div>
    </div>
  )

  // ── GENERIC ERROR ─────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 18px', display:'flex', gap:12 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>{error}</p>
          <button onClick={fetchCalendar} style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Try again</button>
        </div>
      </div>
    </div>
  )

  const cells = buildCalendarGrid(viewYear, viewMonth)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div style={{ fontFamily: 'inherit', userSelect: 'none' }}>
      <style>{`
        @keyframes kfade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .cal-day:hover { background: #f8fafc !important; }
        .cal-event:hover { opacity: 0.85; cursor: pointer; }
      `}</style>

      {/* ── Month navigation ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 10px', borderBottom:'1px solid #f3f4f6' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          {loading && <div style={{ width:14, height:14, border:'2px solid #e5e7eb', borderTop:'2px solid #4f46e5', borderRadius:'50%', animation:'kfade 0.8s linear infinite' }}/>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(null) }}
            style={{ fontSize:12, padding:'4px 10px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', color:'#374151', cursor:'pointer', fontWeight:500 }}>
            Today
          </button>
          <button onClick={prevMonth}
            disabled={viewMonth === 0 && viewYear <= currentYear}
            style={{ width:28, height:28, border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', color:'#374151', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', opacity: viewMonth === 0 && viewYear <= currentYear ? 0.35 : 1 }}>
            ‹
          </button>
          <button onClick={nextMonth}
            disabled={viewMonth === 11 && viewYear >= currentYear}
            style={{ width:28, height:28, border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', color:'#374151', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', opacity: viewMonth === 11 && viewYear >= currentYear ? 0.35 : 1 }}>
            ›
          </button>
          <button onClick={fetchCalendar} title="Refresh"
            style={{ width:28, height:28, border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', color:'#6b7280', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ↻
          </button>
        </div>
      </div>

      {/* ── Day headers ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #f3f4f6' }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{ padding:'6px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'#9ca3af', letterSpacing:'0.06em' }}>{d}</div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
            {week.map((date, di) => {
              const isToday       = date ? isSameDay(date, today) : false
              const isOtherMonth  = !date
              const dayMeetings   = date ? getMeetingsForDay(date) : []
              const isSelected    = date && selected && isSameDay(date, selected.date)
              const isPast        = date && date < new Date(today.getFullYear(), today.getMonth(), today.getDate())

              return (
                <div key={di} className="cal-day"
                  onClick={() => {
                    if (!date) return
                    setSelected({ date, meetings: dayMeetings })
                  }}
                  style={{
                    borderLeft: di > 0 ? '1px solid #f3f4f6' : 'none',
                    padding: '6px 6px 8px',
                    background: isSelected ? '#eff6ff' : '#fff',
                    cursor: date ? 'pointer' : 'default',
                    opacity: isOtherMonth ? 0 : 1,
                    height: 110,           // fixed height — all cells same size
                    overflow: 'hidden',    // content never pushes cell taller
                    transition: 'background 0.1s',
                  }}
                >
                  {date && (
                    <>
                      {/* Day number */}
                      <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}>
                        <span style={{
                          width: 26, height: 26,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          fontSize: 13,
                          fontWeight: isToday ? 600 : 400,
                          color: isToday ? '#fff' : isPast ? '#9ca3af' : '#111827',
                          background: isToday ? '#4f46e5' : 'transparent',
                        }}>
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Events */}
                      {dayMeetings.slice(0, 3).map((m, mi) => {
                        const pc  = m.platform ? PLATFORM_COLOR[m.platform] : null
                        const dot = pc?.dot || '#6b7280'
                        const bg  = m.status === 'live' ? '#fef2f2'
                                  : m.status === 'ended' ? '#f9fafb'
                                  : pc?.bg || '#f3f4f6'
                        const clr = m.status === 'live' ? '#dc2626'
                                  : m.status === 'ended' ? '#9ca3af'
                                  : pc?.text || '#374151'
                        return (
                          <div key={mi} className="cal-event"
                            title={`${fmtTime(m.start)} ${m.title}`}
                            onClick={e => {
                              e.stopPropagation()
                              if (m.meetingUrl && m.status !== 'ended') onStartRecording(m)
                              else if (!m.meetingUrl && m.status !== 'ended') onStartRecording({ ...m, _offlineMode: true } as any)
                              else setSelected({ date, meetings: dayMeetings })
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              background: bg, borderRadius: 4,
                              padding: '2px 5px', marginBottom: 2,
                              overflow: 'hidden', flexShrink: 0,
                            }}
                          >
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.status === 'live' ? '#ef4444' : dot, flexShrink: 0 }}/>
                            <span style={{ fontSize: 11, color: clr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {fmtTime(m.start)} {m.title.length > 14 ? m.title.slice(0, 14) + '…' : m.title}
                            </span>
                          </div>
                        )
                      })}
                      {dayMeetings.length > 3 && (
                        <div style={{ fontSize: 10, color: '#6b7280', paddingLeft: 5, marginTop: 1 }}>
                          +{dayMeetings.length - 3} more
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Day detail panel (slides in below) ── */}
      {selected && (
        <div style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc', padding: '14px 16px', animation: 'kfade 0.2s ease' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
              {selected.date.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
              {isSameDay(selected.date, today) && <span style={{ marginLeft:6, fontSize:10, background:'#4f46e5', color:'#fff', padding:'1px 7px', borderRadius:20 }}>Today</span>}
            </p>
            <button onClick={() => setSelected(null)}
              style={{ fontSize:16, color:'#9ca3af', background:'none', border:'none', cursor:'pointer', lineHeight:1 }}>✕</button>
          </div>

          {selected.meetings.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>No meetings scheduled</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.meetings.map(m => {
                const pc = m.platform ? PLATFORM_COLOR[m.platform] : null
                const canRec = m.meetingUrl && m.status !== 'ended'
                const isLive = m.status === 'live'
                const isSoon = m.status === 'soon'
                return (
                  <div key={m.id} style={{
                    background: '#fff', border: `1px solid ${isLive ? '#fca5a5' : '#e5e7eb'}`,
                    borderLeft: `3px solid ${isLive ? '#ef4444' : pc?.dot || '#d1d5db'}`,
                    borderRadius: 8, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom: 2 }}>
                        {isLive && <span style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fee2e2', padding:'1px 6px', borderRadius:20 }}>🔴 LIVE</span>}
                        {pc && <span style={{ fontSize:10, fontWeight:600, color: pc.text, background: pc.bg, padding:'1px 6px', borderRadius:20 }}>{pc.label}</span>}
                        {m.participantCount > 0 && <span style={{ fontSize:11, color:'#9ca3af' }}>👥 {m.participantCount}</span>}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '2px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                        {fmtTime(m.start)} – {fmtTime(m.end)}
                        {m.organizer && ` · ${m.organizer}`}
                      </p>
                    </div>
                    {canRec ? (
                      <button onClick={() => onStartRecording(m)}
                        style={{ padding:'7px 14px', background: isLive ? '#dc2626' : isSoon ? '#d97706' : '#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                        {isLive ? '⏺ Join & Record' : '🎙 Record'}
                      </button>
                    ) : m.status === 'ended' ? (
                      <span style={{ fontSize:11, color:'#9ca3af', flexShrink:0 }}>Ended</span>
                    ) : !m.meetingUrl ? (
                      // No video link — offer offline recording with title pre-filled
                      <button
                        onClick={() => onStartRecording({ ...m, _offlineMode: true } as any)}
                        style={{ padding:'7px 14px', background:'#6b7280', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}
                      >
                        🎙 Record Offline
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}