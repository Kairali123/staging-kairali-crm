"use client"

import { memo, useMemo } from "react"

// Shared building blocks for the "Employee-wise Performance" cards (sales / calls reports).

export const EMPLOYEE_PIE_COLORS = [
  "#2563eb", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#84cc16", // Lime
  "#e11d48", // Rose
  "#0284c7", // Sky
  "#a855f7", // Violet
  "#64748b", // Slate
]

/** Gold / silver / bronze for the podium, a numbered chip after that. `index` is 0-based. */
export function RankBadge({ index }: { index: number }) {
  const podium = [
    { icon: "🥇", title: "1st Place (Gold)", cls: "from-amber-100 to-yellow-200 text-amber-800 border-amber-400" },
    { icon: "🥈", title: "2nd Place (Silver)", cls: "from-slate-100 to-slate-200 text-slate-700 border-slate-300" },
    { icon: "🥉", title: "3rd Place (Bronze)", cls: "from-amber-50 to-orange-100 text-amber-900 border-amber-600/40" },
  ][index]
  if (podium) {
    return (
      <span
        className={`w-6 h-6 rounded-full bg-gradient-to-br ${podium.cls} border flex items-center justify-center text-xs shadow-sm shrink-0 font-extrabold`}
        title={podium.title}
      >
        {podium.icon}
      </span>
    )
  }
  return (
    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
      {index + 1}
    </span>
  )
}

export type ShareItem = { name: string; value: number }

interface DonutProps {
  items: ShareItem[]
  hovered: string | null
  onHover: (name: string | null) => void
  format: (value: number) => string
  /** Small caption above the total in the middle of the ring, e.g. "Total Calls". */
  totalLabel: string
  emptyLabel?: string
}

const SIZE = 280
const CENTER = SIZE / 2
const RO = 125
const RI = 75

const point = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: CENTER + r * Math.sin(rad), y: CENTER - r * Math.cos(rad) }
}

/**
 * One donut where each employee is a slice. Scales with its container (max 280px) so it never
 * overflows a phone; hover, tap or keyboard focus highlights a slice and shows it in the centre.
 */
function EmployeeShareDonutBase({ items, hovered, onHover, format, totalLabel, emptyLabel = "No data" }: DonutProps) {
  const active = useMemo(() => items.filter(i => i.value > 0), [items])
  const total = useMemo(() => active.reduce((s, i) => s + i.value, 0), [active])

  const slices = useMemo(() => {
    let acc = 0
    return active.map((item, i) => {
      const angle = (item.value / total) * 360
      const slice = { item, start: acc, end: acc + angle, angle, color: EMPLOYEE_PIE_COLORS[i % EMPLOYEE_PIE_COLORS.length], share: (item.value / total) * 100 }
      acc += angle
      return slice
    })
  }, [active, total])

  const box = "relative mx-auto aspect-square w-full max-w-[280px]"

  if (total <= 0 || !active.length) {
    return (
      <div className={box} role="img" aria-label={emptyLabel}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <circle cx={CENTER} cy={CENTER} r={(RO + RI) / 2} fill="none" stroke="#f1f5f9" strokeWidth={RO - RI} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">{emptyLabel}</div>
      </div>
    )
  }

  const hoveredSlice = hovered ? slices.find(s => s.item.name === hovered) : undefined
  const anyHovered = Boolean(hoveredSlice)

  return (
    <div className={box} role="group" aria-label={`${totalLabel} split by employee`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full drop-shadow-sm">
        <circle cx={CENTER} cy={CENTER} r={RO + 4} fill="none" stroke="#f1f5f9" strokeWidth={1.5} />
        {slices.length === 1 ? (
          <circle cx={CENTER} cy={CENTER} r={(RO + RI) / 2} fill="none" stroke={slices[0].color} strokeWidth={RO - RI}>
            <title>{`${slices[0].item.name}: ${format(slices[0].item.value)} (100.0%)`}</title>
          </circle>
        ) : (
          slices.map(({ item, start, end, angle, color, share }) => {
            const isHovered = hovered === item.name
            const p1o = point(start, RO), p2o = point(end, RO), p2i = point(end, RI), p1i = point(start, RI)
            const large = angle > 180 ? 1 : 0
            const d = `M ${p1o.x} ${p1o.y} A ${RO} ${RO} 0 ${large} 1 ${p2o.x} ${p2o.y} L ${p2i.x} ${p2i.y} A ${RI} ${RI} 0 ${large} 0 ${p1i.x} ${p1i.y} Z`
            const label = point(start + angle / 2, (RO + RI) / 2)
            return (
              <g key={item.name}>
                <path
                  d={d}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  tabIndex={0}
                  aria-label={`${item.name}: ${format(item.value)}, ${share.toFixed(1)}%`}
                  className="cursor-pointer outline-none transition-opacity duration-200 focus-visible:stroke-slate-900"
                  opacity={anyHovered ? (isHovered ? 1 : 0.45) : 1}
                  onMouseEnter={() => onHover(item.name)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(item.name)}
                  onBlur={() => onHover(null)}
                  onClick={() => onHover(isHovered ? null : item.name)}
                >
                  <title>{`${item.name}: ${format(item.value)} (${share.toFixed(1)}%)`}</title>
                </path>
                {angle >= 18 && (
                  <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" className="pointer-events-none text-[10px] font-black tabular-nums" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 2 }}>
                    {share.toFixed(0)}%
                  </text>
                )}
              </g>
            )
          })
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
        {hoveredSlice ? (
          <>
            <span className="max-w-full truncate text-[11px] font-bold uppercase tracking-wider text-slate-500" title={hoveredSlice.item.name}>{hoveredSlice.item.name}</span>
            <span className="mt-0.5 text-base font-black tabular-nums text-slate-900 sm:text-lg">{format(hoveredSlice.item.value)}</span>
            <span className="mt-0.5 text-[11px] font-extrabold tabular-nums text-blue-600">{hoveredSlice.share.toFixed(1)}% Share</span>
          </>
        ) : (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{totalLabel}</span>
            <span className="mt-0.5 text-base font-black tabular-nums text-slate-900 sm:text-lg">{format(total)}</span>
            <span className="mt-0.5 text-[11px] font-bold tabular-nums text-slate-500">100.0%</span>
          </>
        )}
      </div>
    </div>
  )
}

export const EmployeeShareDonut = memo(EmployeeShareDonutBase)
