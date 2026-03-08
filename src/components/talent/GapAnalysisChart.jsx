// ============================================================
// APEX RH — src/components/talent/GapAnalysisChart.jsx  ·  S83
// Radar SVG compétences : requis vs actuel + histogramme des gaps
// Props : aucune (lit useTalentGapAnalysis directement)
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, TrendingDown, CheckCircle, Target } from 'lucide-react'
import { useTalentGapAnalysis, PRIORITY_CONFIG } from '../../hooks/useSuccessionVivier'

// ─── Helpers ─────────────────────────────────────────────────
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function polygonPoints(cx, cy, values, maxVal, radii, angles) {
  return values.map((v, i) => {
    const r = (v / maxVal) * radii
    const p = polarToCartesian(cx, cy, r, angles[i])
    return `${p.x},${p.y}`
  }).join(' ')
}

// ─── Radar SVG ───────────────────────────────────────────────
function RadarChart({ skills }) {
  if (!skills || skills.length === 0) return null

  const W = 300, H = 300
  const CX = W / 2, CY = H / 2
  const R  = 110
  const MAX = 5
  const N   = skills.length
  const angles = skills.map((_, i) => (360 / N) * i)

  // Grilles concentriques
  const grids = [1, 2, 3, 4, 5]

  const requiredPts = polygonPoints(CX, CY, skills.map(s => Math.min(s.avg_required, MAX)), MAX, R, angles)
  const currentPts  = polygonPoints(CX, CY, skills.map(s => Math.min(s.avg_current, MAX)), MAX, R, angles)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 280 }}>
      <defs>
        <radialGradient id="radarGradReq" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.05" />
        </radialGradient>
        <radialGradient id="radarGradCur" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* Grilles */}
      {grids.map(g => {
        const pts = angles.map(a => {
          const p = polarToCartesian(CX, CY, (g / MAX) * R, a)
          return `${p.x},${p.y}`
        }).join(' ')
        return (
          <polygon
            key={g}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        )
      })}

      {/* Axes */}
      {angles.map((a, i) => {
        const outer = polarToCartesian(CX, CY, R + 6, a)
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={outer.x} y2={outer.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        )
      })}

      {/* Zone requise */}
      <polygon
        points={requiredPts}
        fill="url(#radarGradReq)"
        stroke="#7C3AED"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />

      {/* Zone actuelle */}
      <polygon
        points={currentPts}
        fill="url(#radarGradCur)"
        stroke="#10B981"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />

      {/* Points requis */}
      {skills.map((s, i) => {
        const p = polarToCartesian(CX, CY, (Math.min(s.avg_required, MAX) / MAX) * R, angles[i])
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#7C3AED" />
      })}

      {/* Points actuels */}
      {skills.map((s, i) => {
        const p = polarToCartesian(CX, CY, (Math.min(s.avg_current, MAX) / MAX) * R, angles[i])
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#10B981" />
      })}

      {/* Labels */}
      {skills.map((s, i) => {
        const labelR = R + 24
        const p      = polarToCartesian(CX, CY, labelR, angles[i])
        const anchor = p.x < CX - 5 ? 'end' : p.x > CX + 5 ? 'start' : 'middle'
        const label  = s.skill.length > 14 ? s.skill.slice(0, 14) + '…' : s.skill
        return (
          <text
            key={i}
            x={p.x} y={p.y + 4}
            textAnchor={anchor}
            fontSize="9"
            fill="rgba(255,255,255,0.45)"
          >
            {label}
          </text>
        )
      })}

      {/* Centre */}
      <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.15)" />
    </svg>
  )
}

// ─── Barre de gap ────────────────────────────────────────────
function GapBar({ skill, avg_required, avg_current, avg_gap, affected_count, priority, isSelected, onClick }) {
  const cfg      = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low
  const pct      = Math.min(100, (avg_current / avg_required) * 100)
  const gapPct   = Math.min(100, (avg_gap / avg_required) * 100)

  return (
    <motion.div
      layout
      onClick={onClick}
      className="p-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: isSelected ? `${cfg.color}10` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? `${cfg.color}30` : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white/80 truncate flex-1">{skill}</span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span className="text-xs text-white/30">{affected_count} pers.</span>
        </div>
      </div>

      {/* Barre composite */}
      <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Niveau actuel */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: '#10B981', opacity: 0.8 }}
        />
        {/* Gap (zone rouge) */}
        <div
          className="absolute top-0 h-full rounded-r-full"
          style={{
            left:    `${pct}%`,
            width:   `${gapPct}%`,
            background: cfg.color,
            opacity: 0.5,
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-emerald-400/70">{avg_current.toFixed(1)} actuel</span>
        <span className="text-xs" style={{ color: cfg.color }}>
          Écart : {avg_gap.toFixed(1)}
        </span>
        <span className="text-xs text-white/30">{avg_required.toFixed(1)} requis</span>
      </div>
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function GapAnalysisChart() {
  const { data: gaps = [], isLoading } = useTalentGapAnalysis()
  const [selected, setSelected]        = useState(null)
  const [filter, setFilter]            = useState('all')

  const priorities = ['critical', 'high', 'medium', 'low']

  const filtered = filter === 'all'
    ? gaps
    : gaps.filter(g => g.priority === filter)

  // Stats globales
  const criticalCount = gaps.filter(g => g.priority === 'critical').length
  const highCount     = gaps.filter(g => g.priority === 'high').length
  const avgGap        = gaps.length
    ? (gaps.reduce((s, g) => s + Number(g.avg_gap), 0) / gaps.length).toFixed(1)
    : '0'

  // Radar : top 8 compétences avec le plus grand gap
  const radarSkills = [...gaps].sort((a, b) => b.avg_gap - a.avg_gap).slice(0, 8)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    )
  }

  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle size={40} className="text-emerald-500/30 mb-3" />
        <p className="text-sm text-white/40 font-medium">Aucun écart de compétences détecté</p>
        <p className="text-xs text-white/25 mt-1">Ajoutez des talents au vivier pour visualiser les gaps</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Écarts critiques', value: criticalCount, color: '#EF4444', icon: AlertTriangle },
          { label: 'Écarts élevés',    value: highCount,     color: '#F59E0B', icon: TrendingDown },
          { label: 'Gap moyen',        value: `${avgGap}/5`, color: '#8B5CF6', icon: Target },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="p-3 rounded-xl text-center"
              style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20` }}
            >
              <Icon size={16} className="mx-auto mb-1" style={{ color: kpi.color }} />
              <p className="text-lg font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-white/35 mt-0.5">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Radar + liste */}
      <div className="flex gap-5 items-start">
        {/* Radar */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <RadarChart skills={radarSkills} />
          <div className="flex items-center gap-4 mt-2">
            {[
              { color: '#7C3AED', label: 'Requis' },
              { color: '#10B981', label: 'Actuel' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                <span className="text-xs text-white/40">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Liste filtrée */}
        <div className="flex-1 min-w-0">
          {/* Filtres */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {['all', ...priorities].map(p => {
              const cfg    = p === 'all' ? { label: 'Tous', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' } : PRIORITY_CONFIG[p]
              const active = filter === p
              return (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={active
                    ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }
                    : { color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map(g => (
              <GapBar
                key={g.skill}
                {...g}
                isSelected={selected === g.skill}
                onClick={() => setSelected(s => s === g.skill ? null : g.skill)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
