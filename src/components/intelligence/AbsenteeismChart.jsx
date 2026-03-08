// ============================================================
// APEX RH — AbsenteeismChart.jsx  ·  S82
// Absentéisme : taux, heatmap mensuelle SVG, répartition par type
// ============================================================
import { useAbsenteeismStats } from '../../hooks/useHRIntelligence'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'

const TYPE_COLORS = {
  'Maladie':     '#EF4444',
  'Congé':       '#3B82F6',
  'Maternité':   '#EC4899',
  'Paternité':   '#8B5CF6',
  'Accident':    '#F97316',
  'Formation':   '#10B981',
  'Autre':       '#6B7280',
}

function getTypeColor(type) {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type?.toLowerCase().includes(key.toLowerCase())) return color
  }
  return '#6B7280'
}

function HeatmapBar({ months }) {
  const maxRate = Math.max(...months.map(m => m.rate), 0.1)

  return (
    <div className="grid grid-cols-12 gap-1">
      {months.map((m, i) => {
        const intensity = maxRate ? m.rate / maxRate : 0
        const r         = Math.round(239 * intensity)
        const g         = Math.round(68  * intensity)
        const b         = Math.round(68  * intensity)
        const bg        = m.rate > 0
          ? `rgba(${r},${g},${b},${0.15 + intensity * 0.7})`
          : 'rgba(255,255,255,0.04)'
        return (
          <div key={i} title={`${m.month}: ${m.rate}% (${m.days}j)`}
            className="rounded-md text-center cursor-default transition-all hover:scale-110"
            style={{ background: bg, border: `1px solid ${m.rate > 0 ? `rgba(239,68,68,${0.1 + intensity * 0.4})` : 'rgba(255,255,255,0.05)'}` }}>
            <div className="text-xs font-semibold py-1.5" style={{ color: m.rate > 0 ? `rgba(255,${Math.round(255 - 180 * intensity)},${Math.round(255 - 180 * intensity)},1)` : 'rgba(255,255,255,0.2)' }}>
              {m.rate > 0 ? `${m.rate}%` : '—'}
            </div>
            <div className="text-xs pb-1 text-white/30">{m.month}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AbsenteeismChart({ year }) {
  const { data, isLoading } = useAbsenteeismStats(year)

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">
      Chargement de l'absentéisme…
    </div>
  )

  const { totalDays = 0, annualRate = 0, totalRequests = 0, byType = {}, byMonth = [] } = data || {}

  const maxDays   = Math.max(...byMonth.map(m => m.days), 1)
  const typeEntries = Object.entries(byType).sort((a, b) => b[1].days - a[1].days)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: AlertTriangle, label: 'Taux absentéisme annuel', value: `${annualRate}%`,      color: '#EF4444' },
          { icon: Clock,         label: 'Jours d\'absence totaux',  value: totalDays,             color: '#F97316' },
          { icon: Calendar,      label: 'Demandes approuvées',      value: totalRequests,         color: '#3B82F6' },
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

      {/* Heatmap */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <div className="text-xs text-white/50 mb-3 font-medium">Heatmap absentéisme mensuel {year}</div>
        <HeatmapBar months={byMonth}/>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Courbe jours par mois */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/50 mb-3 font-medium">Jours d'absence par mois</div>
          <svg width="100%" height="80" viewBox={`0 0 ${byMonth.length * 22} 80`} preserveAspectRatio="none">
            {byMonth.map((m, i) => {
              const x    = i * 22 + 11
              const barH = maxDays ? (m.days / maxDays) * 60 : 0
              const y    = 68 - barH
              return (
                <g key={i}>
                  <rect x={x - 7} y={y} width={14} height={barH || 1}
                    rx="3" fill={m.days > 0 ? '#F97316' : 'rgba(255,255,255,0.05)'}
                    opacity={0.75}/>
                  {m.days > 0 && barH > 12 && (
                    <text x={x} y={y + barH / 2 + 4} textAnchor="middle" fontSize="7" fill="white" fontWeight="600">{m.days}</text>
                  )}
                  <text x={x} y={78} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{m.month}</text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Répartition par type */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/50 mb-3 font-medium">Par type d'absence</div>
          {typeEntries.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">Aucune absence enregistrée</p>
          ) : (
            <div className="space-y-2">
              {typeEntries.slice(0, 6).map(([type, val]) => {
                const color = getTypeColor(type)
                const pct   = totalDays ? Math.round((val.days / totalDays) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-white/60">{type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">{val.days}j</span>
                        <span className="text-xs font-semibold text-white">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
