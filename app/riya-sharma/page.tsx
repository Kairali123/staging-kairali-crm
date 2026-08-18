'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Chart, registerables } from 'chart.js'
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  PauseCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import Loader from "@/components/Loader"
import { BackButton } from "@/components/back-button"
import { useRiyaSharmaData, type DD, type RC, type KPI } from '@/hooks/riyasharma/useRiyaSharmaData'
import ComplaintViewModal, { type ComplaintRecord } from '@/components/ComplaintViewModal'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

Chart.register(...registerables)




const RESPONSIVE_CSS = `
  .ai-page { padding: 24px 28px; overflow-x: hidden; width: 100%; box-sizing: border-box; }
  .ai-page * { box-sizing: border-box; }
  .ai-page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; flex-wrap:wrap; gap:14px; }
  .ai-filter-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ai-date-inputs { display:flex; align-items:center; overflow:hidden; }
  .ai-date-from { display:flex; align-items:center; gap:8px; padding:9px 14px; border-right:1px solid #E8ECF0; }
  .ai-date-to   { display:flex; align-items:center; gap:8px; padding:9px 14px; }
  .kpi-row-1 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:14px; }
  .kpi-row-2 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .sec-banner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:14px 22px; }
  .sec-banner-left { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .sec-body { padding:20px 22px; }
  .chart-grid-2     { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap:16px; width: 100%; }
  .chart-grid-2-1   { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; }
  .kpi-detail-grid  { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap:16px; }
  .view-toggle { display:flex; background:#F1F5F9; border-radius:8px; padding:3px; gap:2px; flex-shrink:0; }
  .view-btn { padding:7px 18px; border-radius:6px; border:none; cursor:pointer; font-size:13px; font-weight:600; transition:all 0.2s; white-space:nowrap; }
  .dtable-wrap { overflow-x:auto; border-radius:8px; border:1px solid #E8ECF0; -webkit-overflow-scrolling:touch; }
  
  .chart-wrapper { width: 100%; min-height: 280px; position: relative; display: flex; align-items: center; justify-content: center; }
  .chart-wrapper canvas { max-width: 100% !important; max-height: 100% !important; display: block; }
  
  .chart-box { background: #F8FFFE; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; width: 100%; overflow: hidden; }

  @media (max-width:1024px) {
    .ai-page { padding:20px 20px; }
    .kpi-row-2 { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:768px) {
    .ai-page { padding:16px 14px; }
    .ai-page-header { flex-direction:column; align-items:stretch; }
    .ai-filter-bar { justify-content:stretch; }
    .ai-date-inputs { flex-direction:column; align-items:stretch; }
    .ai-date-from { border-right:none; border-bottom:1px solid #E8ECF0; }
    .kpi-row-1 { grid-template-columns:repeat(2,1fr); }
    .kpi-row-2 { grid-template-columns:repeat(2,1fr); }
    .sec-banner { flex-direction:column; align-items:flex-start; }
    .sec-body { padding:16px 14px; }
    .view-toggle { align-self:stretch; justify-content:center; }
    .view-btn { flex:1; text-align:center; padding:7px 10px; font-size:12px; }
    .chart-wrapper { height: 200px; }
  }
  @media (max-width:480px) {
    .ai-page { padding:12px 10px; }
    .kpi-row-1 { grid-template-columns:1fr; }
    .kpi-row-2 { grid-template-columns:1fr; }
    .sec-banner-left { gap:10px; }
    .sec-body { padding:12px 10px; }
    .view-btn { font-size:11px; padding:6px 8px; }
    .chart-grid-2 { grid-template-columns: 1fr; }
    .chart-wrapper { height: 180px; }
    .chart-box { padding: 12px; }
  }
  .filter-search-span { grid-column: span 2; }
  @media (max-width:480px) {
    .filter-search-span { grid-column: span 1; }
  }
  @keyframes fi  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp  { to{transform:rotate(360deg)} }
`

const C = {
  primary: '#3B82F6', teal: '#0D9488', tealLight: '#F0FDFA',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  purple: '#8B5CF6', cyan: '#06B6D4', navy: '#0F172A',
  thGreen: '#064E3B', thRed: '#7F1D1D', thPurple: '#3B0764',
  thBlue: '#1E3A5F', thOrange: '#7C2D12',
  bg: '#F8FAFC', cardBg: '#FFFFFF', border: '#E2E8F0', muted: '#64748B', text: '#0F172A',
}

const DUMMY: DD = {
  totalComplaints: 0, resolvedComplaints: 0, openComplaints: 0,
  overdueComplaints: 0, reopennedComplaints: 0, esalatedComplaints: 0, trfrToPreventive: 0,
  dayWiseComplaints: {},
  recentComplaints: [],
  staff: {},
  departments: {},
  categories: {},
  types: {},
  freqComplaints: {},
}

function fd(sec: number): string {
  if (!sec || isNaN(sec) || sec <= 0) return '-'
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function fmtDate(d: Date): string { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}` }
function todayStr(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function fomStr(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const RM: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '🏅', 5: '🎖️' }

const PAL = [C.teal, '#4361EE', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899']

function Pagination({
  totalItems,
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}: {
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (r: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const [goPage, setGoPage] = useState('');

  return (
    <div
      style={{
        padding: '12px 18px',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        background: '#fff',
        borderRadius: '0 0 14px 14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted }}>
        <span>Rows</span>
        <select
          aria-label="Rows per page"
          value={rowsPerPage}
          onChange={(e) => { onRowsPerPageChange(Number(e.target.value)); onPageChange(1); }}
          style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none' }}
        >
          {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>
          Showing {totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}–
          {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: C.muted }}>
          Page {currentPage} of {totalPages}
        </span>
        <input
          aria-label="Go to page"
          type="number"
          value={goPage}
          onChange={(e) => setGoPage(e.target.value)}
          placeholder="Go"
          style={{ width: 50, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }}
          min={1}
          max={totalPages}
        />
        <button
          onClick={() => {
            const p = parseInt(goPage);
            if (p >= 1 && p <= totalPages) { onPageChange(p); setGoPage(''); }
          }}
          style={{
            background: C.teal,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Go
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            background: '#fff',
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 13,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            color: currentPage === 1 ? '#bbb' : C.teal,
            fontWeight: 600
          }}
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            background: C.teal,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 13,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.6 : 1,
            fontWeight: 700
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── ChartCanvas ── KEY CHANGE: removed dynamic import, uses top-level Chart import
function ChartCanvas({ id, labels, values, colors, type = 'bar', h }:
  { id: string; labels: string[]; values: number[]; colors?: string[]; type?: string; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const inst = useRef<any>(null)

  useEffect(() => {
    if (!ref.current || !labels.length) return
    const go = () => {
      try {
        if (inst.current) { inst.current.destroy(); inst.current = null }
        const ctx = ref.current!.getContext('2d')!
        const isPie = type === 'pie' || type === 'doughnut', isLine = type === 'line'
        const bg = colors || (isPie ? PAL.slice(0, labels.length) : C.teal)
        inst.current = new Chart(ctx, {
          type: type as any,
          data: {
            labels, datasets: [{
              label: isPie ? '' : 'Count', data: values,
              backgroundColor: isLine ? `${C.teal}20` : (colors || (labels.length > 1 ? labels.map((_, i) => PAL[i % PAL.length]) : C.teal)),
              borderColor: isLine ? C.teal : (colors || (labels.length > 1 ? labels.map((_, i) => PAL[i % PAL.length]) : C.teal)),
              borderWidth: isLine ? 2 : 0, fill: isLine, tension: isLine ? 0.35 : undefined,
              borderRadius: (!isPie && !isLine) ? 5 : undefined
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: isPie, position: 'bottom', labels: { color: C.muted, usePointStyle: true, padding: 10, font: { size: 11 } } },
              tooltip: {
                backgroundColor: 'rgba(30,41,59,0.92)',
                titleColor: '#fff',
                bodyColor: '#e2e8f0',
                callbacks: {
                  label: function (context: any) {
                    let label = context.label || '';
                    if (label) label += ': ';
                    const val = context.raw;
                    const total = context.dataset.data.reduce((acc: number, curr: number) => acc + curr, 0);
                    const percentage = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                    return `${label}${val} (${percentage})`;
                  }
                }
              },
            },
            scales: isPie ? {} : {
              y: { beginAtZero: true, ticks: { color: C.muted, font: { size: 12 } }, grid: { color: '#F0F4FF' } },
              x: { ticks: { color: C.muted, font: { size: 12 } }, grid: { display: false } },
            }
          },
        })
      } catch (e) { console.error(e) }
    }
    go()
    return () => { if (inst.current) { inst.current.destroy(); inst.current = null } }
  }, [JSON.stringify({ labels, values, type, id, colors })])

  useEffect(() => {
    // Trigger a window resize to force Chart.js to recalculate container dimensions
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    return () => clearTimeout(t);
  }, [id]);

  return (
    <div className="chart-wrapper" style={h ? { height: h, width: '100%' } : { width: '100%' }}>
      <canvas ref={ref} id={id} style={{ display: 'block', margin: '0 auto' }} />
    </div>
  )
}

function SectionCard({ icon, title, subtitle, badge, table, chart, defaultView = 'table' }:
  { icon: string; title: string; subtitle: string; badge?: string; table: React.ReactNode; chart: React.ReactNode; defaultView?: 'table' | 'chart' }) {
  const [view, setView] = useState<'table' | 'chart'>(defaultView)
  return (
    <div style={{
      background: C.cardBg, borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `1px solid ${C.border}`, marginBottom: 22
    }}>
      <div className="sec-banner" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', borderBottom: `1px solid ${C.border}` }}>
        <div className="sec-banner-left">
          <div style={{
            width: 44, height: 44, background: `linear-gradient(135deg, ${C.primary}, #1E40AF)`,
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: `0 4px 12px ${C.primary}30`, flexShrink: 0
          }}>{icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</div>
          </div>
          {badge && <span style={{
            background: `${C.teal}15`, color: C.teal,
            padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: `1px solid ${C.teal}25`, whiteSpace: 'nowrap'
          }}>{badge}</span>}
        </div>
        <div className="view-toggle">
          {(['table', 'chart'] as const).map(v => (
            <button key={v} className="view-btn" onClick={() => setView(v)} style={{
              background: view === v ? `linear-gradient(135deg,${C.teal},#0F766E)` : 'transparent',
              color: view === v ? '#fff' : C.muted,
              boxShadow: view === v ? `0 2px 8px ${C.teal}40` : 'none'
            }}>
              {v === 'table' ? '📋 Table View' : '📊 Chart View'}
            </button>
          ))}
        </div>
      </div>
      <div className="sec-body" style={{ animation: 'fi 0.2s ease' }}>
        {view === 'table' ? table : chart}
      </div>
    </div>
  )
}

function DTable({ ths, children, thC = '#1e3a5f' }: { ths: React.ReactNode[]; children: React.ReactNode; thC?: string }) {
  return (
    <div className="dtable-wrap">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 520 }}>
        <thead>
          <tr>
            {ths.map((t, idx) => (
              <th key={idx} style={{
                padding: '12px 16px',
                background: thC,
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.05em',
                textAlign: 'left',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                position: 'sticky',
                top: 0,
                zIndex: 2,
                borderRight: '1px solid rgba(255,255,255,0.1)'
              }}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function TR({ children }: { children: React.ReactNode }) {
  const [h, sH] = useState(false)
  return <tr onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
    style={{ background: h ? '#F0FDF9' : 'transparent', transition: 'background 0.15s' }}>{children}</tr>
}

function TD({ children, c, b, sub }: { children: React.ReactNode; c?: string; b?: boolean; sub?: React.ReactNode }) {
  return (
    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.bg}` }}>
      <div style={{ color: c || C.text, fontSize: 14, fontWeight: b ? 600 : 500, lineHeight: 1.2 }}>
        {children}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </td>
  )
}

function NB({ n, col }: { n: number; col: string }) {
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${col}15`, color: col }}>{n}</span>
}

function SB({ l }: { l: string }) {
  const ok = l === 'Resolved'
  return <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
    borderRadius: 20, fontSize: 11, fontWeight: 600, background: ok ? '#DCFCE7' : '#FEF3C7', color: ok ? '#065F46' : '#92400E'
  }}>
    {l}</span>
}

function PB({ l }: { l: string }) {
  const lp = l?.toLowerCase()
  const hi = lp === 'high' || lp === 'critical'
  const mh = lp === 'medium-high'
  const me = lp === 'medium'
  const lo = lp === 'low'

  let bg = '#EFF6FF', col = C.primary
  if (hi) { bg = '#FEE2E2'; col = C.danger }
  else if (mh) { bg = '#FFEDD5'; col = '#EA580C' }
  else if (me) { bg = '#FEF3C7'; col = C.warning }
  else if (lo) { bg = '#DCFCE7'; col = C.success }

  return <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
    background: bg, color: col
  }}>{l || '-'}</span>
}


function KC({
  label,
  value,
  percent,
  icon: Icon,
  color = 'blue',
}: {
  label: string
  value: number | string
  percent?: string
  icon: any
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'slate'
}) {
  const styles = {
    blue: { border: '#93c5fd', bg: '#eff6ff', text: '#1d4ed8', iconBg: '#dbeafe', iconColor: '#2563eb' },
    emerald: { border: '#6ee7b7', bg: '#ecfdf5', text: '#059669', iconBg: '#d1fae5', iconColor: '#10b981' },
    amber: { border: '#fcd34d', bg: '#fffbeb', text: '#d97706', iconBg: '#fef3c7', iconColor: '#f59e0b' },
    rose: { border: '#fca5a5', bg: '#fff1f2', text: '#e11d48', iconBg: '#ffe4e6', iconColor: '#ef4444' },
    violet: { border: '#c4b5fd', bg: '#f5f3ff', text: '#7c3aed', iconBg: '#ede9fe', iconColor: '#8b5cf6' },
    sky: { border: '#7dd3fc', bg: '#f0f9ff', text: '#0284c7', iconBg: '#e0f2fe', iconColor: '#0ea5e9' },
    slate: { border: '#cbd5e1', bg: '#f8fafc', text: '#475569', iconBg: '#f1f5f9', iconColor: '#64748b' },
  }

  const s = styles[color] || styles.blue

  return (
    <div
      style={{
        borderRadius: 12,
        background: s.bg,
        border: `2px solid ${s.border}`,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: s.text,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
              lineHeight: 1.2,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {label}
          </p>
          <h3
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {value}
          </h3>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: s.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={22} color={s.iconColor} />
        </div>
      </div>

      {percent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: `${s.iconColor}15`,
              color: s.iconColor,
            }}
          >
            {percent}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>of total</span>
        </div>
      )}
    </div>
  )
}
function Spin() {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 16, color: C.muted }}>
    <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.teal}`, borderRadius: '50%', animation: 'sp 0.8s linear infinite' }} />
    <span style={{ fontSize: 14, fontWeight: 500 }}>Loading…</span>
    <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
  </div>
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bg = type === 'success' ? C.teal : type === 'error' ? C.danger : C.primary
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return <div style={{
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px',
    background: bg, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10
  }}>
    {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} {msg}
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 16, padding: 0, marginLeft: 4 }}>×</button>
  </div>
}

function CB({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="chart-box">
    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{title}</div>
    {children}
  </div>
}

export default function AIReportAnalysisPage() {
  const { data: fetchedData, isLoading: fetchLoading, error: fetchError, fetchData } = useRiyaSharmaData()
  const [data, setData] = useState<DD>(DUMMY)
  const [loading, setLoading] = useState(false)
  const [start, setStart] = useState(fomStr())
  const [end, setEnd] = useState(todayStr())
  const [activeKPI, setKPI] = useState<KPI>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [dummy, setDummy] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    if (fetchedData) {
      setData(fetchedData)
      setDummy(false)
      setIsInitialLoading(false)
      setLoading(false)
      setLastUpdated(new Date().toLocaleString())
    }
  }, [fetchedData])

  useEffect(() => {
    if (fetchError) {
      toast2(fetchError, 'error')
      setIsInitialLoading(false)
      setLoading(false)
    }
  }, [fetchError])

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString())
  }, [])

  useEffect(() => {
    fetchData(start, end)
  }, [fetchData])

  const toast2 = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ msg, type })

  const load = useCallback(async (s?: string, e?: string) => {
    fetchData(s, e)
  }, [fetchData])

  // Pagination states for each table
  const [pgRecent, setPgRecent] = useState({ cp: 1, rpp: 5 })
  const [pgStaff, setPgStaff] = useState({ cp: 1, rpp: 5 })
  const [pgDept, setPgDept] = useState({ cp: 1, rpp: 5 })
  const [pgCat, setPgCat] = useState({ cp: 1, rpp: 5 })
  const [pgType, setPgType] = useState({ cp: 1, rpp: 5 })
  const [pgDay, setPgDay] = useState({ cp: 1, rpp: 5 })
  const [pgFreq, setPgFreq] = useState({ cp: 1, rpp: 5 })
  // ── NEW filter state ──
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [staffFilter, setStaffFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState('all')
  const [rcSort, setRcSort] = useState<{ key: keyof RC | 'rank'; dir: 'asc' | 'desc' } | null>(null)
  const [selectedComplaint, setSelectedComplaint] = useState<RC | null>(null)

  const activeFilterCount = [
    searchText,
    dateRange !== 'this_month' ? dateRange : '',
    issueTypeFilter !== 'all' ? issueTypeFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
    deptFilter !== 'all' ? deptFilter : '',
    catFilter !== 'all' ? catFilter : '',
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchText('')
    setDateRange('all')
    setCustomFrom('')
    setCustomTo('')
    setStaffFilter('all')
    setStatusFilter('all')
    setDeptFilter('all')
    setCatFilter('all')
    setIssueTypeFilter('all')
    setStart('2024-01-01')
    setEnd(todayStr())
    load('2024-01-01', todayStr())
    // toast2('Filters cleared', 'info')
  }
  const tKPI = (s: KPI) => setKPI((p: KPI) => p === s ? null : s)

  const dL = Object.keys(data.dayWiseComplaints)
  const dV = Object.values(data.dayWiseComplaints)
  const sE = Object.entries(data.staff).sort((a, b) => a[1].total - b[1].total)
  const dE = Object.entries(data.departments).sort((a, b) => a[1].total - b[1].total)
  const cE = Object.entries(data.categories).sort((a, b) => a[1].total - b[1].total)
  const tE = Object.entries(data.types).sort((a, b) => a[1].total - b[1].total)
  const fE = Object.values(data.freqComplaints).sort((a, b) => a[1] - b[1])
  const dW = Object.entries(data.dayWiseComplaints).sort((a, b) => a[1] - b[1])

  const filteredRecent = useMemo(() => {
    let items = [...data.recentComplaints]

    // Date Range local filter
    if (start || end) {
      const sT = start ? new Date(start + 'T00:00:00').getTime() : 0
      const eT = end ? new Date(end + 'T23:59:59').getTime() : Infinity
      items = items.filter(r => r.timestamp >= sT && r.timestamp <= eT)
    }

    if (searchText) {
      const low = searchText.toLowerCase()
      items = items.filter(r =>
        r.name.toLowerCase().includes(low) ||
        r.chatId.toLowerCase().includes(low) ||
        r.issueType.toLowerCase().includes(low) ||
        r.room.toLowerCase().includes(low) ||
        r.summary.toLowerCase().includes(low) ||
        r.type.toLowerCase().includes(low) ||
        (r.uid || '').toLowerCase().includes(low)
      )
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'Escalated') {
        items = items.filter(r => r.isEscalated)
      } else if (statusFilter === 'Overdue') {
        items = items.filter(r => r.isOverdue)
      } else if (statusFilter === 'Reopened') {
        items = items.filter(r => r.isReopened)
      } else {
        items = items.filter(r => r.status === statusFilter)
      }
    }
    if (deptFilter !== 'all') items = items.filter(r => r.department === deptFilter)
    if (catFilter !== 'all') items = items.filter(r => r.category === catFilter)
    if (issueTypeFilter !== 'all') items = items.filter(r => r.issueType === issueTypeFilter)
    return items
  }, [data.recentComplaints, searchText, statusFilter, deptFilter, catFilter, issueTypeFilter, start, end])

  const sortedRecent = useMemo(() => {
    let items = [...filteredRecent]
    if (rcSort) {
      items.sort((a, b) => {
        let valA: any = rcSort.key === 'rank' ? 0 : a[rcSort.key as keyof RC]
        let valB: any = rcSort.key === 'rank' ? 0 : b[rcSort.key as keyof RC]
        if (rcSort.key === 'date') { valA = a.timestamp; valB = b.timestamp }
        if (rcSort.key === 'duration') { valA = a.duration; valB = b.duration }
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return rcSort.dir === 'asc' ? -1 : 1
        if (valA > valB) return rcSort.dir === 'asc' ? 1 : -1
        return 0
      })
    } else {
      // Default sort by latest date first
      items.sort((a, b) => b.timestamp - a.timestamp)
    }
    return items
  }, [filteredRecent, rcSort])

  const stats = useMemo(() => {
    const total = filteredRecent.length
    const resolved = filteredRecent.filter(r => r.status === 'Resolved').length
    const open = filteredRecent.filter(r => r.status === 'Open' || r.status === 'Pending').length
    const escalated = filteredRecent.filter(r => r.isEscalated).length
    return { total, resolved, open, escalated }
  }, [filteredRecent])

  const catDist = useMemo(() => {
    const m: Record<string, number> = {}
    filteredRecent.forEach(r => { const c = r.category || 'Others'; m[c] = (m[c] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [filteredRecent])

  const issueDist = useMemo(() => {
    const m: Record<string, number> = {}
    filteredRecent.forEach(r => { const i = r.issueType || 'Others'; m[i] = (m[i] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [filteredRecent])

  const deptDist = useMemo(() => {
    const m: Record<string, number> = {}
    filteredRecent.forEach(r => { const d = r.department || 'Others'; m[d] = (m[d] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [filteredRecent])

  // Paginated Slices
  const pagRecent = sortedRecent.slice((pgRecent.cp - 1) * pgRecent.rpp, pgRecent.cp * pgRecent.rpp)
  const pagStaff = sE.slice((pgStaff.cp - 1) * pgStaff.rpp, pgStaff.cp * pgStaff.rpp)
  const pagDept = dE.slice((pgDept.cp - 1) * pgDept.rpp, pgDept.cp * pgDept.rpp)
  const pagCat = cE.slice((pgCat.cp - 1) * pgCat.rpp, pgCat.cp * pgCat.rpp)
  const pagType = tE.slice((pgType.cp - 1) * pgType.rpp, pgType.cp * pgType.rpp)
  const pagDay = dW.map(([d, v]) => ({ d, v })).slice((pgDay.cp - 1) * pgDay.rpp, pgDay.cp * pgDay.rpp)
  const pagFreq = fE.slice((pgFreq.cp - 1) * pgFreq.rpp, pgFreq.cp * pgFreq.rpp)

  return (
    <div className="ai-page" style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", fontSize: 14, color: C.text }}>
      <style>{RESPONSIVE_CSS}</style>


      {/* ── PAGE HEADER (Premium Style - Full Width Breakout) ── */}
      <div className="relative overflow-hidden -mt-6 sm:-mt-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-6 border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        style={{ background: 'linear-gradient(135deg, #0f1f45 0%, #162d6b 45%, #1a3080 100%)' }}>

        {/* Ambient depth layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-600/10 pointer-events-none" />
        <div className="absolute -top-10 left-1/4 w-[500px] h-32 bg-blue-400/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -top-6 right-1/4 w-64 h-20 bg-indigo-400/10 blur-2xl rounded-full pointer-events-none" />

        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-5">
          <BackButton className="mb-4" />
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-5">
              {/* ICON CONTAINER */}
              <div className="rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-300/25 shadow-[0_0_24px_rgba(147,197,253,0.2)]"
                style={{
                  width: 56, height: 56,
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.25) 100%)',
                  overflow: 'hidden'
                }}>
                <BarChart3 size={28} color="#BFDBFE" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight complainting-tight text-white drop-shadow-sm">
                  Riya Sharma AI Report Analysis
                </h1>
                <p className="text-sm lg:text-base mt-1.5 font-normal tracking-wide text-blue-200/55">
                  CAPA Complaint Analytics&nbsp;&nbsp;·&nbsp;&nbsp;Kairali Ayurvedic Healing Village&nbsp;&nbsp;·&nbsp;&nbsp;Real-time Monitoring
                </p>
              </div>
            </div>

            {/* LAST UPDATED */}
            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
              <div className="w-full sm:w-auto rounded-xl px-4 py-3 border border-blue-300/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-xs text-blue-300/50 font-semibold uppercase tracking-widest">
                  Last Updated
                </p>
                <p className="text-sm font-semibold text-white/80 mt-1">
                  {lastUpdated}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {(() => {
        const chipStyle: React.CSSProperties = {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', background: '#EFF6FF',
          border: '1px solid #BFDBFE', borderRadius: 20,
          fontSize: 12, fontWeight: 600, color: '#1D4ED8',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }
        const chipX: React.CSSProperties = {
          fontWeight: 700, fontSize: 14, color: '#6B7280', lineHeight: 1,
        }
        return (
          <div style={{
            borderRadius: 14, border: `1px solid ${C.border}`,
            background: C.cardBg, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            marginBottom: 22, overflow: 'hidden',
          }}>
            <div>

              {/* Header strip */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 12, padding: '14px 22px',
                background: 'linear-gradient(to right, #EFF6FF, #ffffff, #EEF2FF)',
                borderBottom: `1px solid ${C.border}`,
                borderRadius: '14px 14px 0 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'linear-gradient(135deg, #0f172a, #1e3a5f, #1d4ed8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, boxShadow: '0 4px 10px rgba(29,78,216,0.3)', flexShrink: 0,
                  }}>🔎</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>Filters & Search</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Search complaints · filter by date, staff, status, department & category
                    </div>
                  </div>
                </div>

                {/* Clear Filters — prominently placed, only lit when filters are active */}
                <button
                  onClick={clearAllFilters}
                  style={{
                    background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)',
                    color: '#fff', border: 'none', borderRadius: 9,
                    padding: '10px 24px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s',
                    display: 'flex', alignItems: 'center', gap: 8,
                    letterSpacing: '0.01em',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>✕</span>
                  Clear Filters
                </button>
              </div>

              {/* Filter controls grid */}
              <div style={{ padding: '18px 22px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: 14,
                }}>

                  {/* Search — spans 2 cols on wide screens, 1 on mobile */}
                  <div className="filter-search-span">
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Search
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
                      <input
                        type="text"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder="Search by name, room, ticket ID, issue type…"
                        style={{
                          height: 40, width: '100%', padding: '0 12px 0 34px',
                          border: '1px solid #D1D5DB', borderRadius: 8,
                          fontSize: 14, color: C.text, background: '#fff',
                          outline: 'none', fontFamily: 'inherit',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                        onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Date Range
                    </label>
                    <select
                      value={dateRange}
                      onChange={e => {
                        const val = e.target.value
                        setDateRange(val)
                        if (val === 'custom') return

                        let s = '', ed = todayStr()
                        const now = new Date()
                        if (val === 'all') { s = '2024-01-01'; ed = todayStr() }
                        else if (val === 'today') { s = todayStr() }
                        else if (val === 'yesterday') {
                          const d = new Date(); d.setDate(d.getDate() - 1)
                          s = ed = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        }
                        else if (val === 'this_week') {
                          const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1)
                          s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        }
                        else if (val === 'last_week') {
                          const d1 = new Date(); const day = d1.getDay() || 7; d1.setDate(d1.getDate() - day - 6)
                          const d2 = new Date(); d2.setDate(d2.getDate() - day)
                          s = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`
                          ed = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
                        }
                        else if (val === 'this_month') { s = fomStr() }
                        else if (val === 'last_month') {
                          const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1)
                          s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
                          const d2 = new Date(); d2.setDate(0)
                          ed = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
                        }
                        else if (val === 'this_year') { s = `${now.getFullYear()}-01-01` }
                        else if (val === 'last_year') { s = `${now.getFullYear() - 1}-01-01`; ed = `${now.getFullYear() - 1}-12-31` }

                        setStart(s); setEnd(ed)
                        load(s, ed)
                      }}
                      style={{
                        height: 40, width: '100%', padding: '0 32px 0 12px',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        fontSize: 14, color: C.text, background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="this_week">This Week</option>
                      <option value="last_week">Last Week</option>
                      <option value="this_month">This Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="this_year">This Year</option>
                      <option value="last_year">Last Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {/* Staff / Assigned To (Commented)
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Staff / Assigned To
                    </label>
                    <select
                      value={staffFilter}
                      onChange={e => setStaffFilter(e.target.value)}
                      style={{
                        height: 40, width: '100%', padding: '0 32px 0 12px',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        fontSize: 14, color: C.text, background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="all">All Staff</option>
                      {Object.keys(data.staff).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  */}

                  {/* Issue Type */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Issue Type
                    </label>
                    <select
                      value={issueTypeFilter}
                      onChange={e => setIssueTypeFilter(e.target.value)}
                      style={{
                        height: 40, width: '100%', padding: '0 32px 0 12px',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        fontSize: 14, color: C.text, background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="all">All Issue Types</option>
                      {Object.keys(data.types).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      style={{
                        height: 40, width: '100%', padding: '0 32px 0 12px',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        fontSize: 14, color: C.text, background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Open">Open</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Escalated">Escalated</option>
                      <option value="Reopened">Reopened</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Department
                    </label>
                    <select
                      value={deptFilter}
                      onChange={e => setDeptFilter(e.target.value)}
                      style={{
                        height: 40, width: '100%', padding: '0 32px 0 12px',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        fontSize: 14, color: C.text, background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="all">All Departments</option>
                      {Object.keys(data.departments).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                      Category
                    </label>
                    <select
                      value={catFilter}
                      onChange={e => setCatFilter(e.target.value)}
                      style={{
                        height: 40, width: '100%', padding: '0 32px 0 12px',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        fontSize: 14, color: C.text, background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' as const,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="all">All Categories</option>
                      {Object.keys(data.categories).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Custom date pickers — only shown when dateRange === 'custom' */}
                {dateRange === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                        From Date
                      </label>
                      <input
                        type="date" value={customFrom}
                        onChange={e => { setCustomFrom(e.target.value); setStart(e.target.value) }}
                        style={{
                          height: 40, width: '100%', padding: '0 12px',
                          border: '1px solid #D1D5DB', borderRadius: 8,
                          fontSize: 14, color: C.text, background: '#fff',
                          outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                        onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: 6 }}>
                        To Date
                      </label>
                      <input
                        type="date" value={customTo}
                        onChange={e => { setCustomTo(e.target.value); setEnd(e.target.value); if (customFrom) load(customFrom, e.target.value) }}
                        style={{
                          height: 40, width: '100%', padding: '0 12px',
                          border: '1px solid #D1D5DB', borderRadius: 8,
                          fontSize: 14, color: C.text, background: '#fff',
                          outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                        onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}


      <Loader isLoading={isInitialLoading} />

      {!isInitialLoading && (
        <div style={{ position: 'relative', minHeight: '400px' }}>
          <Loader isLoading={loading} contentOnly={true} />
          <div style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.4s ease-in-out', pointerEvents: loading ? 'none' : 'auto' }}>
            {/* ── KPI Cards ── */}
            <div
              style={{
                background: C.cardBg,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
                border: `1px solid ${C.border}`,
                marginBottom: 24,
                width: '100%',
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  background: 'linear-gradient(to right, #f8fafc, #eff6ff)',
                  borderBottom: `1px solid ${C.border}`,
                  padding: '18px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <BarChart3 size={22} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>Key Performance Indicators</h2>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 400 }}>Real-time summary of complaint metrics and performance</p>
                  </div>
                </div>
              </div>

              {/* KPI GRID */}
              <div style={{ padding: '24px' }}>
                <div className="kpi-detail-grid" style={{ gap: '20px' }}>
                  <KC
                    label="Total Unique complaint Received"
                    value={stats.total}
                    icon={Package}
                    color="blue"
                    percent={stats.total > 0 ? "100%" : "0%"}
                  />

                  <KC
                    label="Resolved Complaints"
                    value={stats.resolved}
                    icon={CheckCircle}
                    color="emerald"
                    percent={`${((stats.resolved / stats.total) * 100 || 0).toFixed(1)}%`}
                  />

                  <KC
                    label="Open Complaints"
                    value={stats.open}
                    icon={TrendingUp}
                    color="amber"
                    percent={`${((stats.open / stats.total) * 100 || 0).toFixed(1)}%`}
                  />

                  {/* <KC
                  label="Delay Complaints"
                  value={data.overdueComplaints}
                  icon={AlertCircle}
                  color="rose"
                  percent={`${((data.overdueComplaints / data.totalComplaints) * 100 || 0).toFixed(1)}%`}
                /> */}

                  {/* <KC
                  label="Reopened"
                  value={data.reopennedComplaints}
                  icon={RefreshCw}
                  color="violet"
                  percent={`${((data.reopennedComplaints / data.totalComplaints) * 100 || 0).toFixed(1)}%`}
                /> */}

                  <KC
                    label="Escalated"
                    value={stats.escalated}
                    icon={ArrowUp}
                    color="sky"
                    percent={`${((stats.escalated / stats.total) * 100 || 0).toFixed(1)}%`}
                  />

                  {/* <KC
                  label="Transfer to Preventive"
                  value={data.trfrToPreventive}
                  icon={PauseCircle}
                  color="slate"
                  percent={`${((data.trfrToPreventive / data.totalComplaints) * 100 || 0).toFixed(1)}%`}
                /> */}
                </div>
              </div>
            </div>

            {/* KPI DETAIL INSIDE SAME DIV */}
            {/* {activeKPI && (
            <SectionCard
              icon="📅"
              title={
                activeKPI === 'totalTickets'
                  ? 'Total CAPA Trend'
                  : activeKPI === 'resolvedTickets'
                    ? 'Resolved Trend'
                    : activeKPI === 'pendingTickets'
                      ? 'Open Trend'
                      : activeKPI === 'highPriority'
                        ? 'Delay Trend'
                        : activeKPI === 'positiveFeedback'
                          ? 'Reopened Trend'
                          : 'Escalated Trend'
              }
              subtitle="Day-wise data for selected date range"
              table={
                <DTable ths={['Rank', 'Date', 'Complaints', 'Bar']}>
                  <>
                    {Object.entries(data.dayWiseComplaints)
                      .sort((a, b) => a[1] - b[1])
                      .slice(0, 14)
                      .map(([d, v], i) => (
                        <TR key={d}>
                          <TD><span style={{ fontWeight: 700, color: C.teal }}>{i + 1}</span></TD>
                          <TD b>{d}</TD>
                          <TD>
                            <NB n={v} col={C.teal} />
                          </TD>
                          <TD>
                            <div
                              style={{
                                width: '100%',
                                maxWidth: 140,
                                height: 8,
                                background: '#E2E8F0',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: 4,
                                  background: `linear-gradient(to right,${C.teal},${C.primary})`,
                                  width: `${Math.min(100, (v / Math.max(...Object.values(data.dayWiseComplaints))) * 100)}%`,
                                }}
                              />
                            </div>
                          </TD>
                        </TR>
                      ))}
                  </>
                </DTable>
              }
              chart={
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 16,
                  }}
                >
                  <CB title="Day-wise Trend">
                    <ChartCanvas
                      id={`kl-${activeKPI}`}
                      labels={dL}
                      values={dV}
                      type={activeKPI === 'pendingTickets' ? 'bar' : 'line'}
                      h={240}
                    />
                  </CB>

                  <CB title="Resolved vs Open">
                    <ChartCanvas
                      id={`kp-${activeKPI}`}
                      labels={['Resolved', 'Open']}
                      values={[data.resolvedComplaints, data.openComplaints]}
                      colors={[C.teal, C.danger]}
                      type="pie"
                      h={240}
                    />
                  </CB>
                </div>
              }
            />
          )} */}

            {/* ── Recent Complaints ── */}
            <SectionCard icon="🧾" title="Recent Complaints Activity" subtitle="Real-time complaints based on your filters"
              badge={`${filteredRecent.length} Records`}
              table={<>
                {(() => {
                  const handleRcSort = (key: keyof RC | 'rank') => {
                    setRcSort(prev => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
                  }
                  const SortTh = ({ label, k }: { label: string, k: keyof RC | 'rank' }) => (
                    <div onClick={() => handleRcSort(k)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
                      {label}
                      <span style={{ fontSize: 10, opacity: rcSort?.key === k ? 1 : 0.3 }}>
                        {rcSort?.key === k ? (rcSort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  )
                  return (
                    <DTable ths={[
                      <SortTh key="rank" label="Rank" k="rank" />,
                      <SortTh key="date" label="Date" k="date" />,
                      <SortTh key="uid" label="UID" k="uid" />,
                      <SortTh key="chatId" label="Ticket ID" k="chatId" />,
                      <SortTh key="name" label="Guest Name" k="name" />,
                      <SortTh key="room" label="Room" k="room" />,
                      <SortTh key="issueType" label="Issue" k="issueType" />,
                      <SortTh key="type" label="Type" k="type" />,
                      <SortTh key="category" label="Category" k="category" />,
                      <SortTh key="subCategory" label="Sub-Category" k="subCategory" />,
                      'Chat History',
                      <SortTh key="summary" label="Summary" k="summary" />,
                      <SortTh key="urgency" label="Urgency" k="urgency" />,
                      <SortTh key="priority" label="Priority" k="priority" />,
                      <SortTh key="assignedTo" label="Assigned To" k="assignedTo" />,
                      <SortTh key="department" label="Department" k="department" />,
                      <SortTh key="staffName" label="Staff Name" k="staffName" />,
                      <SortTh key="status" label="Status" k="status" />,
                      <SortTh key="duration" label="Resolution Time" k="duration" />,
                      'Report',
                      'Action'
                    ]}>
                      {pagRecent.map((r, i) => {
                        const globalIdx = (pgRecent.cp - 1) * pgRecent.rpp + i
                        return <TR key={i}>
                          <TD><span style={{ fontWeight: 700, color: C.teal }}>{globalIdx + 1}</span></TD>
                          <TD b>{r.date}</TD>
                          <TD><span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{r.uid || '-'}</span></TD>
                          <TD><span style={{ background: '#EFF6FF', color: C.primary, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{r.chatId}</span></TD>
                          <TD b>{r.name}</TD><TD>{r.room}</TD><TD>{r.issueType}</TD>
                          <TD>{r.type}</TD>
                          <TD>{r.category}</TD>
                          <TD>{r.subCategory || '-'}</TD>
                          <TD>{r.chatHistoryLink ? (r.chatHistoryLink.startsWith('http') ? <a href={r.chatHistoryLink} target="_blank" rel="noreferrer" style={{ color: C.primary, textDecoration: 'underline' }}>View</a> : r.chatHistoryLink) : '-'}</TD>
                          <TD>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span style={{ fontSize: 12, color: C.muted, cursor: 'pointer' }}>
                                  {r.summary.length > 30 ? r.summary.slice(0, 30) + '...' : r.summary}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-[400px] p-3 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700">
                                <p className="leading-relaxed">{r.summary}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TD>

                          <TD><PB l={r.urgency} /></TD>
                          <TD><PB l={r.priority} /></TD>
                          <TD>{r.assignedTo || '-'}</TD>
                          <TD>{r.department}</TD>
                          <TD sub={r.staffEmail}>{r.staffName || '-'}</TD>
                          <TD><SB l={r.status} /></TD>
                          <TD c={r.status === 'Resolved' ? C.success : C.muted}>{r.resolutionTime}</TD>
                          <TD>{r.reportLink && r.reportLink !== '#' ? <a href={r.reportLink} target="_blank" rel="noreferrer" style={{ color: C.teal, fontWeight: 600, fontSize: 12 }}>View →</a> : '-'}</TD>
                          <TD>
                            <button
                              onClick={() => setSelectedComplaint(r)}
                              style={{
                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                color: '#fff',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                                transition: 'all 0.2s',
                                minWidth: '60px'
                              }}
                              onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                              onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                              View
                            </button>
                          </TD>
                        </TR>
                      })}
                    </DTable>
                  )
                })()}
                <Pagination
                  totalItems={data.recentComplaints.length}
                  currentPage={pgRecent.cp}
                  rowsPerPage={pgRecent.rpp}
                  onPageChange={(p) => setPgRecent(prev => ({ ...prev, cp: p }))}
                  onRowsPerPageChange={(r) => setPgRecent(prev => ({ ...prev, rpp: r }))}
                />
              </>}
              chart={<div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
                <div style={{ flex: '1 1 300px', maxWidth: '450px' }}>
                  <CB title="Priority Distribution">
                    <ChartCanvas id="rc-pri" labels={['High', 'Medium-High', 'Medium', 'Low']}
                      values={['high', 'medium-high', 'medium', 'low'].map(p => filteredRecent.filter(r => r.priority?.toLowerCase() === p).length)}
                      colors={[C.danger, '#fb923c', C.warning, C.success]} type="doughnut" />
                  </CB>
                </div>
                <div style={{ flex: '1 1 300px', maxWidth: '450px' }}>
                  <CB title="Status Breakdown">
                    <ChartCanvas id="rc-st" labels={['Resolved', 'Open']}
                      values={[filteredRecent.filter(r => r.status === 'Resolved').length, filteredRecent.filter(r => r.status !== 'Resolved').length]}
                      colors={[C.teal, C.danger]} type="pie" />
                  </CB>
                </div>
                <div style={{ flex: '1 1 300px', maxWidth: '450px' }}>
                  <CB title="Category Wise Distribution">
                    <ChartCanvas id="rc-cat" labels={catDist.map(x => x[0])}
                      values={catDist.map(x => x[1])} type="doughnut" h={380} />
                  </CB>
                </div>
                <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                  <CB title="Issue Wise Distribution">
                    <ChartCanvas id="rc-iss" labels={issueDist.map(x => x[0])}
                      values={issueDist.map(x => x[1])} type="bar" h={280} />
                  </CB>
                </div>
                <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                  <CB title="Department Wise Distribution">
                    <ChartCanvas id="rc-dept" labels={deptDist.map(x => x[0])}
                      values={deptDist.map(x => x[1])} type="bar" h={280} />
                  </CB>
                </div>
              </div>}
            />

            {/* <SectionCard icon="👨‍💼" title="Staff Wise Report" subtitle="Employee performance — complaints, resolved, pending & avg. TAT"
            badge={`${sE.length} Staff`}
            table={<>
              <DTable ths={['Rank', 'Employee', 'Total', 'Resolved', 'Pending', 'Esc. Rate', 'Avg. TAT']}>
                {pagStaff.map(([n, m], i) => {
                  const globalIdx = (pgStaff.cp - 1) * pgStaff.rpp + i
                  const er = m.total === 0 ? 0 : ((m.pending / m.total) * 100).toFixed(1)
                  const at = m.resolved === 0 ? 0 : m.takenTime / m.resolved
                  return <TR key={n}>
                    <TD><span style={{ fontWeight: 700, color: C.teal }}>{RM[globalIdx + 1] || ''} {globalIdx + 1}</span></TD>
                    <TD b>{n}</TD><TD><NB n={m.total} col={C.primary} /></TD>
                    <TD><NB n={m.resolved} col={C.success} /></TD>
                    <TD><NB n={m.pending} col={m.pending > 0 ? C.warning : C.muted} /></TD>
                    <TD>{er}%</TD><TD c={at <= 1800 ? C.success : C.danger}>{fd(at)}</TD>
                  </TR>
                })}
              </DTable>
              <Pagination
                totalItems={sE.length}
                currentPage={pgStaff.cp}
                rowsPerPage={pgStaff.rpp}
                onPageChange={(p) => setPgStaff(prev => ({ ...prev, cp: p }))}
                onRowsPerPageChange={(r) => setPgStaff(prev => ({ ...prev, rpp: r }))}
              />
            </>}
            chart={<div className="chart-grid-2">
              <CB title="Complaint Load per Staff">
                <ChartCanvas id="st-bar" labels={sE.map(([n]) => n)} values={sE.map(([, m]) => m.total)} colors={sE.map((_, i) => PAL[i % 8])} h={240} />
              </CB>
              <CB title="Resolved Share">
                <ChartCanvas id="st-pie" labels={sE.map(([n]) => n)} values={sE.map(([, m]) => m.resolved)} type="doughnut" h={240} />
              </CB>
            </div>}
          />

          <SectionCard icon="🏢" title="Department Wise Report" subtitle="Department performance — assigned, resolved, open & avg. TAT"
            badge={`${dE.length} Departments`}
            table={<>
              <DTable ths={['Rank', 'Department', 'Assigned', 'Resolved', 'Open', 'Esc. Rate', 'Avg. TAT']}>
                {pagDept.map(([d, m], i) => {
                  const globalIdx = (pgDept.cp - 1) * pgDept.rpp + i
                  const er = m.total === 0 ? 0 : ((m.open / m.total) * 100).toFixed(1)
                  const at = m.resolved === 0 ? 0 : m.takenTime / m.resolved
                  return <TR key={d}>
                    <TD><span style={{ fontWeight: 700, color: C.teal }}>{RM[globalIdx + 1] || ''} {globalIdx + 1}</span></TD>
                    <TD b>{d}</TD><TD><NB n={m.assigned} col={C.primary} /></TD>
                    <TD><NB n={m.resolved} col={C.success} /></TD>
                    <TD><NB n={m.open} col={m.open > 0 ? C.warning : C.muted} /></TD>
                    <TD>{er}%</TD><TD c={at <= 1800 ? C.success : C.danger}>{fd(at)}</TD>
                  </TR>
                })}
              </DTable>
              <Pagination
                totalItems={dE.length}
                currentPage={pgDept.cp}
                rowsPerPage={pgDept.rpp}
                onPageChange={(p) => setPgDept(prev => ({ ...prev, cp: p }))}
                onRowsPerPageChange={(r) => setPgDept(prev => ({ ...prev, rpp: r }))}
              />
            </>}
            chart={<div className="chart-grid-2">
              <CB title="Complaints by Department">
                <ChartCanvas id="dp-bar" labels={dE.map(([n]) => n)} values={dE.map(([, m]) => m.total)} colors={dE.map((_, i) => PAL[i % 8])} h={240} />
              </CB>
              <CB title="Department Share">
                <ChartCanvas id="dp-pie" labels={dE.map(([n]) => n)} values={dE.map(([, m]) => m.total)} type="doughnut" h={240} />
              </CB>
            </div>}
          />

          <SectionCard icon="📂" title="Category Wise Breakdown" subtitle="Complaint categories — overdue & resolution time analysis"
            badge={`${cE.length} Categories`}
            table={<>
              <DTable ths={['Rank', 'Category', 'Count', 'Open', 'Resolved', 'Overdue', 'Esc. Rate', 'Avg. TAT']}>
                {pagCat.map(([cat, m], i) => {
                  const globalIdx = (pgCat.cp - 1) * pgCat.rpp + i
                  const er = m.total === 0 ? 0 : ((m.open / m.total) * 100).toFixed(1)
                  const at = m.resolved === 0 ? 0 : m.timeTaken / m.resolved
                  return <TR key={cat}>
                    <TD><span style={{ fontWeight: 700, color: C.teal }}>{RM[globalIdx + 1] || ''} {globalIdx + 1}</span></TD>
                    <TD b>{cat}</TD><TD><NB n={m.total} col={C.primary} /></TD>
                    <TD><NB n={m.open} col={m.open > 0 ? C.warning : C.muted} /></TD>
                    <TD><NB n={m.resolved} col={C.success} /></TD>
                    <TD><NB n={m.overdue} col={m.overdue > 0 ? C.danger : C.muted} /></TD>
                    <TD>{er}%</TD><TD c={at <= 1800 ? C.success : C.danger}>{fd(at)}</TD>
                  </TR>
                })}
              </DTable>
              <Pagination
                totalItems={cE.length}
                currentPage={pgCat.cp}
                rowsPerPage={pgCat.rpp}
                onPageChange={(p) => setPgCat(prev => ({ ...prev, cp: p }))}
                onRowsPerPageChange={(r) => setPgCat(prev => ({ ...prev, rpp: r }))}
              />
            </>}
            chart={<div className="chart-grid-2">
              <CB title="Category Distribution">
                <ChartCanvas id="ct-bar" labels={cE.map(([n]) => n)} values={cE.map(([, m]) => m.total)} colors={cE.map((_, i) => PAL[i % 8])} h={240} />
              </CB>
              <CB title="Category Share">
                <ChartCanvas id="ct-pie" labels={cE.map(([n]) => n)} values={cE.map(([, m]) => m.total)} type="doughnut" h={240} />
              </CB>
            </div>}
          />

          <SectionCard icon="📊" title="Complaint Type Breakdown" subtitle="Issue types — escalation, resolution & avg. TAT"
            badge={`${tE.length} Types`}
            table={<>
              <DTable ths={['Rank', 'Type', 'Count', 'Open', 'Escalated', 'Resolved', 'Avg. TAT']}>
                {pagType.map(([tp, m], i) => {
                  const globalIdx = (pgType.cp - 1) * pgType.rpp + i
                  const at = m.resolved === 0 ? 0 : m.takenTime / m.resolved
                  return <TR key={tp}>
                    <TD><span style={{ fontWeight: 700, color: C.teal }}>{RM[globalIdx + 1] || ''} {globalIdx + 1}</span></TD>
                    <TD b>{tp}</TD><TD><NB n={m.total} col={C.primary} /></TD>
                    <TD><NB n={m.open} col={m.open > 0 ? C.warning : C.muted} /></TD>
                    <TD><NB n={m.escalated} col={m.escalated > 0 ? C.danger : C.muted} /></TD>
                    <TD><NB n={m.resolved} col={C.success} /></TD>
                    <TD c={at <= 1800 ? C.success : C.danger}>{fd(at)}</TD>
                  </TR>
                })}
              </DTable>
              <Pagination
                totalItems={tE.length}
                currentPage={pgType.cp}
                rowsPerPage={pgType.rpp}
                onPageChange={(p) => setPgType(prev => ({ ...prev, cp: p }))}
                onRowsPerPageChange={(r) => setPgType(prev => ({ ...prev, rpp: r }))}
              />
            </>}
            chart={<div className="chart-grid-2">
              <CB title="Issue Type Volume">
                <ChartCanvas id="ty-bar" labels={tE.map(([n]) => n)} values={tE.map(([, m]) => m.total)} colors={tE.map((_, i) => PAL[i % 8])} h={240} />
              </CB>
              <CB title="Type Share">
                <ChartCanvas id="ty-pie" labels={tE.map(([n]) => n)} values={tE.map(([, m]) => m.total)} type="doughnut" h={240} />
              </CB>
            </div>}
          />

          <SectionCard icon="📅" title="Day-Wise Complaint Trend" subtitle="Daily CAPA volume for the selected period"
            table={<>
              <DTable ths={['Rank', 'Date', 'Complaints', 'Volume Bar']}>
                {pagDay.map((item, i) => {
                  const globalIdx = (pgDay.cp - 1) * pgDay.rpp + i
                  return <TR key={item.d}>
                    <TD><span style={{ fontWeight: 700, color: C.teal }}>{globalIdx + 1}</span></TD><TD b>{item.d}</TD>
                    <TD><NB n={item.v} col={C.teal} /></TD>
                    <TD><div style={{ width: '100%', maxWidth: 140, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(to right,${C.teal},${C.primary})`, width: `${Math.min(100, (item.v / Math.max(...dV)) * 100)}%` }} />
                    </div></TD>
                  </TR>
                })}
              </DTable>
              <Pagination
                totalItems={dL.length}
                currentPage={pgDay.cp}
                rowsPerPage={pgDay.rpp}
                onPageChange={(p) => setPgDay(prev => ({ ...prev, cp: p }))}
                onRowsPerPageChange={(r) => setPgDay(prev => ({ ...prev, rpp: r }))}
              />
            </>}
            chart={<CB title="Day-wise Complaint Line Chart">
              <ChartCanvas id="dw-line" labels={dL} values={dV} type="line" h={280} />
            </CB>}
          />

          <SectionCard icon="🛑" title="Most Frequent Complaint Topics" subtitle="Top recurring issues — root cause & corrective actions"
            badge={`${fE.length} Issues`}
            table={<>
              <DTable ths={['Rank', 'Issue Type', 'Count', '% of Total', 'Avg. Resolution', 'Root Cause / Summary', 'Suggested Action']}>
                {pagFreq.map((item, i) => {
                  const globalIdx = (pgFreq.cp - 1) * pgFreq.rpp + i
                  const [it, count, , tt, sum, act] = item
                  const pct = data.totalComplaints ? ((count / data.totalComplaints) * 100).toFixed(1) : '-'
                  const at = count === 0 ? 0 : tt / count
                  return <TR key={i}>
                    <TD><span style={{ fontWeight: 700, color: C.teal }}>{RM[globalIdx + 1] || ''} {globalIdx + 1}</span></TD>
                    <TD b>{it}</TD>
                    <TD><NB n={count} col={C.teal} /></TD>
                    <TD>{pct}%</TD>
                    <TD c={at <= 1800 ? C.success : C.danger}>{fd(at)}</TD>
                    <TD><span style={{ fontSize: 13, color: C.muted }}>{sum.length > 65 ? sum.slice(0, 65) + '…' : sum}</span></TD>
                    <TD><span style={{ fontSize: 13 }}>{act.length > 65 ? act.slice(0, 65) + '…' : act}</span></TD>
                  </TR>
                })}
              </DTable>
              <Pagination
                totalItems={fE.length}
                currentPage={pgFreq.cp}
                rowsPerPage={pgFreq.rpp}
                onPageChange={(p) => setPgFreq(prev => ({ ...prev, cp: p }))}
                onRowsPerPageChange={(r) => setPgFreq(prev => ({ ...prev, rpp: r }))}
              />
            </>}
            chart={<div className="chart-grid-2">
              <CB title="Frequency by Issue Type">
                <ChartCanvas id="fq-bar" labels={fE.slice(0, 8).map(([t]) => t)} values={fE.slice(0, 8).map(([, c]) => c)} colors={fE.slice(0, 8).map((_, i) => PAL[i % 8])} h={240} />
              </CB>
              <CB title="Issue Share">
                <ChartCanvas id="fq-pie" labels={fE.slice(0, 8).map(([t]) => t)} values={fE.slice(0, 8).map(([, c]) => c)} type="doughnut" h={240} />
              </CB>
            </div>}
          /> */}
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {selectedComplaint && (
        <ComplaintViewModal
          complaint={{
            chatId: selectedComplaint.chatId,
            uid: selectedComplaint.uid,
            name: selectedComplaint.name,
            room: selectedComplaint.room,
            phone: selectedComplaint.phone,
            email: selectedComplaint.email,
            conversationId: selectedComplaint.conversationId,
            generateDate: selectedComplaint.generateDate,
            chatDoneDate: selectedComplaint.chatDoneDate,
            summary: selectedComplaint.summary,
            finalOutcome: selectedComplaint.finalOutcome,
            keyEmotion: selectedComplaint.keyEmotion,
            type: selectedComplaint.type,
            category: selectedComplaint.category,
            subCategory: selectedComplaint.subCategory,
            issueType: selectedComplaint.issuetypeview || selectedComplaint.issueType,
            department: selectedComplaint.department,
            urgency: selectedComplaint.urgency,
            priority: selectedComplaint.priority,
            urgencyTAT: selectedComplaint.urgencyTAT ? parseInt(selectedComplaint.urgencyTAT) : undefined,
            suggestedAction: selectedComplaint.suggestedactionview || selectedComplaint.suggestedAction,
            score: selectedComplaint.score ? parseFloat(selectedComplaint.score) : undefined,
            resolutionTAT: Math.round(selectedComplaint.duration / 60),
            finalReportLink: selectedComplaint.finalreportpdflinkview || selectedComplaint.reportLink,
            chatHistoryLink: selectedComplaint.chatHistoryLink,
            staffName: selectedComplaint.staffName,
            staffEmail: selectedComplaint.staffEmail,
            headName: selectedComplaint.headName,
            headEmail: selectedComplaint.headEmail,
            // Stage 2 — Department Staff Action
            s2PlannedStaff: selectedComplaint.plannedstaff,
            s2ActualStaff: selectedComplaint.actualstaff,
            s2TimeDelay: selectedComplaint.timedelaystaff,
            s2DoerStaff: selectedComplaint.doerstaff,
            s2ActionStatus: selectedComplaint.departmentstaffactionstatus,
            s2ActionPoints: selectedComplaint.departmentstaffactionpoints,
            s2Remarks: selectedComplaint.departmentstaffremarks,
            s2ProofLink: selectedComplaint.uploadedproofscreenshotlink,
            s2ResolvedBy: selectedComplaint.resolvedby,
            s2HTStatus: selectedComplaint.htcreatedtodepartmentstaffstatus,
            s2EmailStatus: selectedComplaint.emailalerttodepartmentstaffstatus,
            s2WhatsAppStatus: selectedComplaint.whatsappalertstatus,

            // Stage 3 — Department Head Review
            s3PlannedHead: selectedComplaint.plannedhead,
            s3ActualHead: selectedComplaint.actualhead,
            s3TimeDelay: selectedComplaint.timedelayhead,
            s3DoerHead: selectedComplaint.doerhead,
            s3ActionStatus: selectedComplaint.departmentheadactionstatus,
            s3ActionPoints: selectedComplaint.departmentheadactionpoints,
            s3Remarks: selectedComplaint.departmentheadremarks,
            s3ProofLink: selectedComplaint.uploadprofscreenshotlink || undefined,
            s3HTStatus: selectedComplaint.htcreatedbydepartmenthead,
            s3EmailStatus: selectedComplaint.emailsentstatushead,
            s3WhatsAppStatus: selectedComplaint.whatappsentstatushead,

            // Stage 4 — Escalation to Head
            s4HTStatus: selectedComplaint.htcreatedtodepartmentheadifescalatedstatus,
            s4HTID: selectedComplaint.htiddepartmenthead,
            s4HTSolution: selectedComplaint.htreplysolutiondepartmenthead,

            // Stage 5 — GM Action
            s5PlannedGM: selectedComplaint.plannedgm,
            s5ActualGM: selectedComplaint.actualgm,
            s5TimeDelay: selectedComplaint.timedalaygm,
            s5DoerGM: selectedComplaint.doergmactionstatus,
            s5ActionStatus: selectedComplaint.gmremarks, // Mapping gmremarks to action status if that's where it fits
            s5Remarks: selectedComplaint.gmremarks,
            s5HTStatus: selectedComplaint.htcreatedtogmdalaystatus,
            s5EmailStatus: selectedComplaint.emailalerttogmstatus,
            s5WhatsAppStatus: selectedComplaint.whatappalarttogmstatus,

            // Stage 6 — GM Escalation + Management
            s6HTStatus: selectedComplaint.htcreatedtogeneralmanagerifesacalatedstatus,
            s6HTID: selectedComplaint.htidgm,
            s6HTSolution: selectedComplaint.htreplysolutiongm,
            s6PlannedMgmt: selectedComplaint.plannedmanagement,
            s6ActualMgmt: selectedComplaint.actualmanagement,
            s6TimeDelay: selectedComplaint.timedelaymanagement,
            s6DoerMgmt: selectedComplaint.doermanagement,
            s6MgmtStatus: selectedComplaint.managementactionstatus,
            s6MgmtAction: selectedComplaint.managementaction,
            s6MgmtRemarks: selectedComplaint.managementremarks,
            s6HTMgmtStatus: selectedComplaint.htcreatedtomanagementiftimedelaystatus,
            s6EmailMgmtStatus: selectedComplaint.emailalerttomanagementstatus,
            s6WhatsAppMgmtStatus: selectedComplaint.whatsappalerttomanagementstatus,

            // Stage 7 — Management Escalation
            s7HSStatus: selectedComplaint.hscreatedtomanagementifescalatedstatus,
            s7HSID: selectedComplaint.hsidmanagement,
            s7HSSolution: selectedComplaint.hsreplysolutionmanagement,

            // Stage 8 — Notifications
            s8WhatsAppHR: selectedComplaint.whatsapptohr,
            s8WhatsAppStaff: selectedComplaint.whatsapptodepartmentstaff,
            s8WhatsAppHead: selectedComplaint.whatsapptodepartmenthead,
            s8WhatsAppGM: selectedComplaint.whatsapptogm,
          }}
          onClose={() => setSelectedComplaint(null)}
        />
      )}
    </div>
  )
}
