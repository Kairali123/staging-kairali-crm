'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronDown, User, Users, Briefcase, TrendingUp, Building2, MessageSquare, Shield } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComplaintRecord {
  // Stage 1 — Core Info
  chatId: string
  uid?: string
  name: string
  room: string
  phone?: string
  email?: string
  conversationId?: string
  generateDate?: string
  chatDoneDate?: string
  summary?: string
  finalOutcome?: string
  keyEmotion?: string
  type?: string
  category?: string
  subCategory?: string
  issueType?: string
  department?: string
  urgency?: string
  priority?: string
  urgencyTAT?: number
  suggestedAction?: string
  score?: number
  resolutionTAT?: number
  finalReportLink?: string
  chatHistoryLink?: string
  // Staff assignment
  staffEmail?: string
  staffName?: string
  headName?: string
  headEmail?: string

  // Stage 2 — Department Staff Action
  s2PlannedStaff?: string
  s2ActualStaff?: string
  s2TimeDelay?: string
  s2DoerStaff?: string
  s2ActionStatus?: string
  s2ActionPoints?: string
  s2Remarks?: string
  s2ProofLink?: string
  s2ResolvedBy?: string
  s2HTStatus?: string
  s2EmailStatus?: string
  s2WhatsAppStatus?: string

  // Stage 3 — Department Head Review
  s3PlannedHead?: string
  s3ActualHead?: string
  s3TimeDelay?: string
  s3DoerHead?: string
  s3ActionStatus?: string
  s3ActionPoints?: string
  s3Remarks?: string
  s3ProofLink?: string
  s3HTStatus?: string
  s3EmailStatus?: string
  s3WhatsAppStatus?: string

  // Stage 4 — Escalation to Head
  s4HTStatus?: string
  s4HTID?: string
  s4HTSolution?: string

  // Stage 5 — GM Action
  s5PlannedGM?: string
  s5ActualGM?: string
  s5TimeDelay?: string
  s5DoerGM?: string
  s5ActionStatus?: string
  s5Remarks?: string
  s5HTStatus?: string
  s5EmailStatus?: string
  s5WhatsAppStatus?: string

  // Stage 6 — GM Escalation + Management
  s6HTStatus?: string
  s6HTID?: string
  s6HTSolution?: string
  s6PlannedMgmt?: string
  s6ActualMgmt?: string
  s6TimeDelay?: string
  s6DoerMgmt?: string
  s6MgmtStatus?: string
  s6MgmtAction?: string
  s6MgmtRemarks?: string
  s6HTMgmtStatus?: string
  s6EmailMgmtStatus?: string
  s6WhatsAppMgmtStatus?: string

  // Stage 7 — Management Escalation
  s7HSStatus?: string
  s7HSID?: string
  s7HSSolution?: string

  // Stage 8 — Notifications
  s8WhatsAppHR?: string
  s8WhatsAppStaff?: string
  s8WhatsAppHead?: string
  s8WhatsAppGM?: string
}

interface Props {
  complaint: ComplaintRecord
  onClose: () => void
}

function calcDelay(planned?: string, actual?: string): string {
  if (!planned || !actual || planned === '-' || actual === '-') return '-'
  try {
    const p = new Date(planned.replace(' ', 'T')).getTime()
    const a = new Date(actual.replace(' ', 'T')).getTime()
    if (isNaN(p) || isNaN(a)) return '-'
    const diff = a - p
    if (diff <= 0) return 'No Delay'

    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)

    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  } catch (e) {
    return '-'
  }
}

const C = {
  primary: '#3B82F6',
  teal: '#0D9488',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  navy: '#1e3a5f',
  border: '#E2E8F0',
  muted: '#64748B',
  bg: '#F8FAFC',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: `${color}18`,
      color,
      border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function Field({ label, value, fullWidth }: { label: string; value?: string | number | null; fullWidth?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div style={{
      gridColumn: fullWidth ? '1 / -1' : undefined,
      background: '#fff',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '12px 16px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#0F172A', fontWeight: 500, lineHeight: 1.4, overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0 }}>
        {typeof value === 'string' && value.startsWith('http')
          ? <a href={value} target="_blank" rel="noreferrer" style={{ color: C.primary, textDecoration: 'underline' }}>View Link</a>
          : (String(value) === '05:30:00' ? '-' : String(value))}
      </div>
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 10,
    }}>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: C.teal,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8
      }}>
        <div style={{ width: 3, height: 14, background: C.teal, borderRadius: 2 }} />
        {title}
      </div>
      {children}
    </div>
  )
}

function NotifStatus({ label, value }: { label: string; value?: string }) {
  const ok = value?.toLowerCase().includes('sent') || value?.toLowerCase().includes('success') || value?.toLowerCase().includes('yes')
  const fail = value?.toLowerCase().includes('fail') || value?.toLowerCase().includes('no') || value?.toLowerCase().includes('pending')
  const color = ok ? C.success : fail ? C.danger : C.muted
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: value ? color : '#D1D5DB', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>{value || '—'}</div>
      </div>
    </div>
  )
}

// ─── Stage Content Renderers ──────────────────────────────────────────────────

function Stage1Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Complaint Generation Details">
        <FieldGrid>
          <Field label="Generate Date" value={c.generateDate} />
          <Field label="Chat Done Date" value={c.chatDoneDate} />
          <Field label="Chat ID" value={c.chatId} />
          <Field label="UID" value={c.uid} fullWidth />
          <Field label="Conversation ID" value={c.conversationId} fullWidth />
          <Field label="Chat History" value={c.chatHistoryLink} />
        </FieldGrid>
      </Section>

      <Section title="Client Details">
        <FieldGrid>
          <Field label="Guest Name" value={c.name} />
          <Field label="Room Number" value={c.room} />
          <Field label="Phone" value={c.phone} />
          <Field label="Email" value={c.email} />
        </FieldGrid>
      </Section>

      <Section title="Complaint Details">
        <FieldGrid>
          <Field label="Type" value={c.type} />
          <Field label="Category" value={c.category} />
          <Field label="Sub Category" value={c.subCategory} />
          <Field label="Issue Type" value={c.issueType} />
          <Field label="Department" value={c.department} />
          <Field label="Urgency" value={c.urgency} />
          <Field label="Priority" value={c.priority} />
          <Field label="Urgency TAT (Mins)" value={c.urgencyTAT} />
          <Field label="Score" value={c.score} />
          <Field label="Resolution TAT (Mins)" value={c.resolutionTAT} />
          <Field label="Key Emotion" value={c.keyEmotion} />
          <Field label="Final Outcome" value={c.finalOutcome} />
          <Field label="Summary" value={c.summary} fullWidth />
          <Field label="Suggested Action" value={c.suggestedAction} fullWidth />
          <Field label="Final Report" value={c.finalReportLink} />
        </FieldGrid>
      </Section>

      <Section title="Assigned To">
        <FieldGrid>
          <Field label="Staff Name" value={c.staffName} />
          <Field label="Staff Email" value={c.staffEmail} />
          <Field label="Head Name" value={c.headName} />
          <Field label="Head Email" value={c.headEmail} />
        </FieldGrid>
      </Section>
    </div>
  )
}

function Stage2Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Department Staff Action">
        <FieldGrid>
          <Field label="Planned" value={c.s2PlannedStaff} />
          <Field label="Actual" value={c.s2ActualStaff} />
          <Field label="Time Delay" value={calcDelay(c.s2PlannedStaff, c.s2ActualStaff)} />
          <Field label="Doer (Staff)" value={c.s2DoerStaff} />
          <Field label="Action Status" value={c.s2ActionStatus} />
          <Field label="Resolved By" value={c.s2ResolvedBy} />
          <Field label="Action Points" value={c.s2ActionPoints} fullWidth />
          <Field label="Remarks" value={c.s2Remarks} fullWidth />
          <Field label="Proof Screenshot" value={c.s2ProofLink} />
        </FieldGrid>
      </Section>

      <Section title="Notifications">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <NotifStatus label="HT Created" value={c.s2HTStatus} />
          <NotifStatus label="Email Alert" value={c.s2EmailStatus} />
          <NotifStatus label="WhatsApp Alert" value={c.s2WhatsAppStatus} />
        </div>
      </Section>
    </div>
  )
}

function Stage3Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Department Head Review">
        <FieldGrid>
          <Field label="Planned" value={c.s3PlannedHead} />
          <Field label="Actual" value={c.s3ActualHead} />
          <Field label="Time Delay" value={calcDelay(c.s3PlannedHead, c.s3ActualHead)} />
          <Field label="Doer (Head)" value={c.s3DoerHead} />
          <Field label="Action Status" value={c.s3ActionStatus} />
          <Field label="Action Points" value={c.s3ActionPoints} fullWidth />
          <Field label="Remarks" value={c.s3Remarks} fullWidth />
          <Field label="Proof Screenshot" value={c.s3ProofLink} />
        </FieldGrid>
      </Section>

      <Section title="Notifications">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <NotifStatus label="HT Created" value={c.s3HTStatus} />
          <NotifStatus label="Email Alert" value={c.s3EmailStatus} />
          <NotifStatus label="WhatsApp Alert" value={c.s3WhatsAppStatus} />
        </div>
      </Section>
    </div>
  )
}

function Stage4Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Escalation to Department Head">
        <FieldGrid>
          <Field label="HT Created Status" value={c.s4HTStatus} />
          <Field label="HT ID" value={c.s4HTID} />
          <Field label="HT Reply / Solution" value={c.s4HTSolution} fullWidth />
        </FieldGrid>
      </Section>
    </div>
  )
}

function Stage5Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="General Manager Action">
        <FieldGrid>
          <Field label="Planned" value={c.s5PlannedGM} />
          <Field label="Actual" value={c.s5ActualGM} />
          <Field label="Time Delay" value={calcDelay(c.s5PlannedGM, c.s5ActualGM)} />
          <Field label="Doer (GM)" value={c.s5DoerGM} />
          <Field label="Action Status" value={c.s5ActionStatus} />
          <Field label="Remarks" value={c.s5Remarks} fullWidth />
        </FieldGrid>
      </Section>

      <Section title="Notifications">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <NotifStatus label="HT Created" value={c.s5HTStatus} />
          <NotifStatus label="Email Alert" value={c.s5EmailStatus} />
          <NotifStatus label="WhatsApp Alert" value={c.s5WhatsAppStatus} />
        </div>
      </Section>
    </div>
  )
}

function Stage6Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="GM Escalation (HT)">
        <FieldGrid>
          <Field label="HT Created Status" value={c.s6HTStatus} />
          <Field label="HT ID" value={c.s6HTID} />
          <Field label="HT Reply / Solution" value={c.s6HTSolution} fullWidth />
        </FieldGrid>
      </Section>

      <Section title="Management Action">
        <FieldGrid>
          <Field label="Planned" value={c.s6PlannedMgmt} />
          <Field label="Actual" value={c.s6ActualMgmt} />
          <Field label="Time Delay" value={calcDelay(c.s6PlannedMgmt, c.s6ActualMgmt)} />
          <Field label="Doer (Management)" value={c.s6DoerMgmt} />
          <Field label="Action Status" value={c.s6MgmtStatus} />
          <Field label="Action" value={c.s6MgmtAction} fullWidth />
          <Field label="Remarks" value={c.s6MgmtRemarks} fullWidth />
        </FieldGrid>
      </Section>

      <Section title="Notifications">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <NotifStatus label="HT (Management)" value={c.s6HTMgmtStatus} />
          <NotifStatus label="Email Alert" value={c.s6EmailMgmtStatus} />
          <NotifStatus label="WhatsApp Alert" value={c.s6WhatsAppMgmtStatus} />
        </div>
      </Section>
    </div>
  )
}

function Stage7Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Management Escalation (HS)">
        <FieldGrid>
          <Field label="HS Created Status" value={c.s7HSStatus} />
          <Field label="HS ID" value={c.s7HSID} />
          <Field label="HS Reply / Solution" value={c.s7HSSolution} fullWidth />
        </FieldGrid>
      </Section>
    </div>
  )
}

function Stage8Content({ c }: { c: ComplaintRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="WhatsApp Notification Broadcast">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <NotifStatus label="WhatsApp → HR" value={c.s8WhatsAppHR} />
          <NotifStatus label="WhatsApp → Department Staff" value={c.s8WhatsAppStaff} />
          <NotifStatus label="WhatsApp → Department Head" value={c.s8WhatsAppHead} />
          <NotifStatus label="WhatsApp → GM" value={c.s8WhatsAppGM} />
        </div>
      </Section>
    </div>
  )
}

// ─── Stage Config ─────────────────────────────────────────────────────────────

const STAGES = [
  { id: 1, label: 'Basic Details', subtitle: 'Complaint Intake & Overview', icon: MessageSquare, color: C.primary },
  { id: 2, label: 'Staff Action', subtitle: 'Department Staff Response', icon: User, color: C.teal },
  { id: 3, label: 'Head Review', subtitle: 'Department Head Review', icon: Users, color: '#8B5CF6' },
  // { id: 4, label: 'Head Escalation', subtitle: 'Escalated to Head via HT', icon: TrendingUp, color: C.warning },
  { id: 5, label: 'GM Action', subtitle: 'General Manager Response', icon: Briefcase, color: '#F97316' },
  /* { id: 6, label: 'GM Escalation', subtitle: 'Management Involvement', icon: Building2, color: C.danger },
  { id: 7, label: 'Mgmt Escalation', subtitle: 'HS Ticket to Management', icon: Shield, color: '#EC4899' },
  { id: 8, label: 'Notifications', subtitle: 'WhatsApp Broadcast Summary', icon: MessageSquare, color: '#06B6D4' }, */
]

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ComplaintViewModal({ complaint: c, onClose }: Props) {
  const [activeStage, setActiveStage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const stage = STAGES.find(s => s.id === activeStage)!

  const renderContent = () => {
    switch (activeStage) {
      case 1: return <Stage1Content c={c} />
      case 2: return <Stage2Content c={c} />
      case 3: return <Stage3Content c={c} />
      case 4: return <Stage4Content c={c} />
      case 5: return <Stage5Content c={c} />
      case 6: return <Stage6Content c={c} />
      case 7: return <Stage7Content c={c} />
      case 8: return <Stage8Content c={c} />
      default: return null
    }
  }

  const handleStageSelect = (id: number) => {
    setActiveStage(id)
    setSidebarOpen(false)
  }

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }

        /* ── Sidebar overlay (mobile only) ── */
        .cvm-sidebar-overlay {
          display: none;
        }

        /* ── Sidebar itself ── */
        .cvm-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: #F8FAFC;
          border-right: 1px solid ${C.border};
          overflow-y: auto;
          padding: 12px 8px;
        }

        /* ── Mobile breakpoint ── */
        @media (max-width: 640px) {
          /* Modal fills the full screen */
          .cvm-modal-shell {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
          }

          /* Sidebar hidden by default, slides in as a drawer */
          .cvm-sidebar {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 10;
            width: 260px;
            box-shadow: 4px 0 20px rgba(0,0,0,0.18);
            transform: translateX(-100%);
            transition: transform 0.22s ease;
            border-right: none;
          }
          .cvm-sidebar.open {
            transform: translateX(0);
          }

          /* Dim overlay behind open drawer */
          .cvm-sidebar-overlay {
            display: block;
            position: absolute;
            inset: 0;
            background: rgba(15,23,42,0.4);
            z-index: 9;
          }

          /* Header tweaks */
          .cvm-header-meta {
            display: none !important;
          }
          .cvm-header-name {
            font-size: 15px !important;
          }
          .cvm-header-icon {
            width: 36px !important;
            height: 36px !important;
            font-size: 16px !important;
          }
          .cvm-header-inner {
            gap: 10px !important;
          }

          /* Stage header bar — tappable, shows active stage + hamburger */
          .cvm-stage-topbar {
            display: flex !important;
          }

          /* Content padding reduced on mobile */
          .cvm-content-area {
            padding: 14px 14px !important;
          }

          /* Footer simplify */
          .cvm-footer-dept {
            display: none !important;
          }

          /* FieldGrid single column on very small screens */
          .cvm-field-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* Tablet: sidebar visible, slightly narrower */
        @media (min-width: 641px) and (max-width: 900px) {
          .cvm-sidebar {
            width: 180px;
          }
          .cvm-stage-topbar {
            display: none !important;
          }
        }

        @media (min-width: 901px) {
          .cvm-stage-topbar {
            display: none !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          zIndex: 9998, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        pointerEvents: 'none',
      }}>
        <div
          className="cvm-modal-shell"
          style={{
            width: '100%', maxWidth: 980, height: '90vh', maxHeight: 720,
            background: '#fff', borderRadius: 16,
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', pointerEvents: 'auto',
            animation: 'modalIn 0.2s ease',
            position: 'relative',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0f1f45 0%, #162d6b 50%, #1a3080 100%)',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, gap: 8,
          }}>
            <div className="cvm-header-inner" style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
              <div
                className="cvm-header-icon"
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(59,130,246,0.3)',
                  border: '1px solid rgba(147,197,253,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}
              >📋</div>
              <div style={{ minWidth: 0 }}>
                <div
                  className="cvm-header-name"
                  style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {c.name}
                </div>
                <div
                  className="cvm-header-meta"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}
                >
                  <span style={{ background: 'rgba(255,255,255,0.12)', color: '#93C5FD', fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    {c.chatId}
                  </span>
                  {c.room && <span style={{ color: '#94a3b8', fontSize: 12 }}>Room {c.room}</span>}
                  {c.priority && <Badge label={c.priority} color={c.priority === 'HIGH' ? C.danger : c.priority === 'MEDIUM' ? C.warning : C.success} />}
                  {c.issueType && <Badge label={c.issueType} color={C.primary} />}
                  {c.score !== undefined && (
                    <span style={{ 
                      background: 'rgba(16,185,129,0.15)', 
                      color: '#10B981', 
                      fontSize: 11, 
                      padding: '2px 10px', 
                      borderRadius: 20, 
                      fontWeight: 700, 
                      border: '1px solid rgba(16,185,129,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ⭐ Score: {c.score}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <X size={16} />
            </button>
          </div>

          {/* ── Mobile Stage Topbar (hamburger + active stage label) ── */}
          <div
            className="cvm-stage-topbar"
            style={{
              display: 'none', // overridden by CSS on mobile
              alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: `linear-gradient(135deg, #F8FAFC, #EFF6FF)`,
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{ width: 16, height: 2, background: '#0F172A', borderRadius: 1 }} />
              <div style={{ width: 16, height: 2, background: '#0F172A', borderRadius: 1 }} />
              <div style={{ width: 16, height: 2, background: '#0F172A', borderRadius: 1 }} />
            </button>

            {/* Active stage pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${stage.color}, ${stage.color}aa)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <stage.icon size={14} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stage.id === 1 ? stage.label : `Stage ${stage.id === 5 ? 3 : stage.id - 1} — ${stage.label}`}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{stage.subtitle}</div>
              </div>
            </div>

            {/* Next/prev arrows */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => {
                  const idx = STAGES.findIndex(s => s.id === activeStage)
                  if (idx > 0) setActiveStage(STAGES[idx - 1].id)
                }}
                disabled={activeStage === STAGES[0].id}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                  background: '#fff', cursor: activeStage === STAGES[0].id ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: activeStage === STAGES[0].id ? 0.4 : 1,
                }}
              >
                <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} />
              </button>
              <button
                onClick={() => {
                  const idx = STAGES.findIndex(s => s.id === activeStage)
                  if (idx < STAGES.length - 1) setActiveStage(STAGES[idx + 1].id)
                }}
                disabled={activeStage === STAGES[STAGES.length - 1].id}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                  background: '#fff', cursor: activeStage === STAGES[STAGES.length - 1].id ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: activeStage === STAGES[STAGES.length - 1].id ? 0.4 : 1,
                }}
              >
                <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

            {/* Mobile drawer overlay */}
            {sidebarOpen && (
              <div className="cvm-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Left Sidebar — Stage List */}
            <div className={`cvm-sidebar${sidebarOpen ? ' open' : ''}`}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px 8px' }}>
                Workflow Stages
              </div>
              {STAGES.map((s) => {
                const Icon = s.icon
                const isActive = activeStage === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStageSelect(s.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: isActive ? `${s.color}12` : 'transparent',
                      marginBottom: 2, textAlign: 'left',
                      outline: isActive ? `1.5px solid ${s.color}30` : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isActive ? s.color : '#E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      <Icon size={14} color={isActive ? '#fff' : C.muted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: isActive ? s.color : '#0F172A',
                        lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {s.id === 1 ? s.label : `Stage ${s.id === 5 ? 3 : s.id - 1}`}
                      </div>
                      <div style={{
                        fontSize: 11, color: isActive ? s.color : C.muted,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        opacity: isActive ? 0.8 : 1,
                      }}>
                        {s.label}
                      </div>
                    </div>
                    {isActive && <ChevronRight size={14} color={s.color} />}
                  </button>
                )
              })}
            </div>

            {/* Right Content Panel */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

              {/* Stage Header (desktop/tablet only — hidden on mobile via .cvm-stage-topbar) */}
              <div style={{
                padding: '14px 24px',
                background: `linear-gradient(135deg, #F8FAFC, #EFF6FF)`,
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
              }}
                // hide on mobile via inline class trick — handled purely by CSS (cvm-stage-topbar shows instead)
                className="cvm-desktop-stage-header"
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${stage.color}, ${stage.color}aa)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 12px ${stage.color}30`,
                }}>
                  <stage.icon size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                    {stage.id === 1 ? stage.label : `Stage ${stage.id === 5 ? 3 : stage.id - 1} — ${stage.label}`}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {stage.subtitle}
                  </div>
                </div>
              </div>

              {/* Stage Content */}
              <div className="cvm-content-area" style={{ padding: '20px 24px', flex: 1 }}>
                {renderContent()}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '10px 16px',
            borderTop: `1px solid ${C.border}`,
            background: '#F8FAFC',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0, gap: 8,
          }}>
            <div className="cvm-footer-dept" style={{ fontSize: 12, color: C.muted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.department && <span>Dept: <strong>{c.department}</strong></span>}
              {c.staffName && <span style={{ marginLeft: 16 }}>Assigned: <strong>{c.staffName}</strong></span>}
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: '#fff', fontSize: 13, fontWeight: 600, color: '#0F172A',
                cursor: 'pointer', marginLeft: 'auto',
              }}
            >
              Close
            </button>
          </div>

          {/* hide desktop stage header on mobile */}
          <style>{`
            @media (max-width: 640px) {
              .cvm-desktop-stage-header { display: none !important; }
            }
          `}</style>
        </div>
      </div>
    </>
  )
}