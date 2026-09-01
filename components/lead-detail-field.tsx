"use client"

export const PField = ({
  label,
  value,
  highlight = false,
}: {
  label: string
  value?: string | null
  highlight?: boolean
}) => (
  <div className="min-w-0">
    <p style={{
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: '#94a3b8',
      marginBottom: '3px',
      lineHeight: 1
    }}>
      {label}
    </p>
    <p style={{
      fontSize: '13px',
      fontWeight: highlight ? 600 : 400,
      color: highlight ? '#b45309' : (value ? '#1e293b' : '#94a3b8'),
      fontStyle: value ? 'normal' : 'italic',
      wordBreak: 'break-word',
      lineHeight: 1.5
    }}>
      {value || '—'}
    </p>
  </div>
)
