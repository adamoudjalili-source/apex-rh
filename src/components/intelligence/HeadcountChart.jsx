// ============================================================
// APEX RH — HeadcountChart.jsx  ·  S82
// Effectifs : courbe mensuelle + répartition par rôle (SVG natif)
// ============================================================
import { useState } from 'react'
import { Users, TrendingUp, UserCheck } from 'lucide-react'
import { useHeadcountStats } from '../../hooks/useHRIntelligence'

const ROLE_LABELS = {
  collaborateur:  { label: 'Collaborateurs', color: '#6366F1' },
  chef_service:   { label: 'Chefs de service', color: '#3B82F6' },
  chef_division:  { label: 'Chefs de division', color: '#8B5CF6' },
  administrateur: { label: 'Administrateurs', color: '#EC4899' },
  directeur:      { label: 'Direction', color: '#F59E0B' },
}

function SparkLine({ data, color = '#6366F1', width = 260, height = 60 }) {
  if (!data?.length) return null
  const vals   = data.map(d => d.headcount)
  const min    = Math.min(...vals)
  const max    = Math.max(...vals)
  const range  = max - min || 1
  const padX   = 4
  const padY   = 4
  const W      = width  - padX * 2
  const H      = height - padY * 2

  const points = vals.map((v, i) => {
    const x = padX + (i / (vals.length - 1)) * W
    const y = padY + H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')

  const areaPoints = [
    `${padX},${padY + H}`,
    ...vals.map((v, i) => {
      const x = padX + (i / (vals.length - 1)) * W
      const y = padY + H - ((v - min) / range) * H
      return `${x},${y}`
    }),
    `${padX + W},${padY + H}`
  ].join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="hc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#hc-grad)"/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* last dot */}
      {vals.length > 0 && (() => {
        const i = vals.length - 1
        const x = padX + (i / (vals.length - 1)) * W
        const y = padY + H - ((vals[i] - min) / range) * H
        return <circle cx={x} cy={y} r="3" fill={color}/>
      })()}
    </svg>
  )
}

function DonutChart({ data, size = 120 }) {
  const total   = Object.values(data).reduce((s, v) => s + v, 0)
  if (!total) return null
  const cx      = size / 2
  const cy      = size / 2
  const r       = size / 2 - 14
  const inner   = r * 0.6
  let   cumul   = -Math.PI / 2

  const segments = Object.entries(data).map(([role, count]) => {
    const angle = (count / total) * 2 * Math.PI
    const x1    = cx + r * Math.cos(cumul)
    const y1    = cy + r * Math.sin(cumul)
    cumul      += angle
    const x2    = cx + r * Math.cos(cumul)
    const y2    = cy + r * Math.sin(cumul)
    const large = angle > Math.PI ? 1 : 0
    const ix1   = cx + inner * Math.cos(cumul - angle)
    const iy1   = cy + inner * Math.sin(cumul - angle)
    const ix2   = cx + inner * Math.cos(cumul)
    const iy2   = cy + inner * Math.sin(cumul)
    const color = ROLE_LABELS[role]?.color || '#888'
    const d     = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`
    return { d, color, role, count }
  })

  return (
    <svg width={size} height={size}>
      {segments.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">effectifs</text>
    </svg>
  )
}

export default function HeadcountChart({ year }) {
  const { data, isLoading } = useHeadcountStats(year)
  const [hoveredMonth, setHoveredMonth] = useState(null)

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">
      Chargement des effectifs…
    </div>
  )

  const { total = 0, byRole = {}, months = [] } = data || {}
  const maxHC  = Math.max(...(months.map(m => m.headcount) || [1]), 1)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users,      label: 'Effectif total',      value: total,                                       color: '#6366F1' },
          { icon: UserCheck,  label: 'Collaborateurs',      value: byRole.collaborateur || 0,                  color: '#3B82F6' },
          { icon: TrendingUp, label: 'Encadrement',         value: (byRole.chef_service || 0) + (byRole.chef_division || 0), color: '#8B5CF6' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.color }}/>
              <span className="text-xs text-white/40">{k.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Courbe mensuelle */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="text-xs text-white/50 mb-3 font-medium">Évolution des effectifs {year}</div>
          <div className="relative" style={{ height: 80 }}>
            <svg width="100%" height="80" viewBox={`0 0 ${months.length * 24} 80`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="hc-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366F1" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {months.map((m, i) => {
                const x = i * 24 + 12
                const barH = maxHC ? (m.headcount / maxHC) * 60 : 0
                const y = 70 - barH
                return (
                  <g key={i}>
                    <rect x={x - 8} y={y} width={16} height={barH}
                      rx="3" fill="rgba(99,102,241,0.3)"
                      onMouseEnter={() => setHoveredMonth(i)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    />
                    {hoveredMonth === i && (
                      <>
                        <rect x={x - 16} y={y - 22} width={32} height={18} rx="4" fill="#6366F1"/>
                        <text x={x} y={y - 9} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{m.headcount}</text>
                      </>
                    )}
                    {i % 2 === 0 && (
                      <text x={x} y={78} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{m.month}</text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Répartition par rôle */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/50 mb-3 font-medium">Répartition par rôle</div>
          <div className="flex items-center gap-4">
            <DonutChart data={byRole}/>
            <div className="flex-1 space-y-1.5">
              {Object.entries(byRole).map(([role, count]) => {
                const cfg   = ROLE_LABELS[role] || { label: role, color: '#888' }
                const pct   = total ? Math.round((count / total) * 100) : 0
                return (
                  <div key={role} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }}/>
                    <span className="text-xs text-white/60 flex-1 truncate">{cfg.label}</span>
                    <span className="text-xs font-semibold text-white">{count}</span>
                    <span className="text-xs text-white/30 w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
