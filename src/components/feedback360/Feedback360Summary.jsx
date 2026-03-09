// ============================================================
// APEX RH — components/feedback360/Feedback360Summary.jsx
// Session 81 — Synthèse 360° : radar SVG + scores + verbatims
// ============================================================
import { useState } from 'react'
import { MessageSquare, TrendingUp, TrendingDown, Minus, Loader2, Users } from 'lucide-react'
import { useFeedback360Summary, useFeedback360Verbatims } from '../../hooks/useFeedback360'

const RELATIONSHIP_LABELS = {
  manager:       'Manager',
  peer:          'Pair',
  direct_report: 'Collaborateur',
  self:          'Auto-éval.',
}

const SCORE_COLOR = (v) => {
  if (v >= 4.5) return '#10B981'
  if (v >= 3.5) return '#22C55E'
  if (v >= 2.5) return '#EAB308'
  if (v >= 1.5) return '#F97316'
  return '#EF4444'
}

// ─── Radar SVG ───────────────────────────────────────────────

function RadarChart({ scores, size = 200 }) {
  if (!scores.length) return null

  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38

  const n = scores.length
  const points = scores.map((s, i) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    const ratio = (s.avg_rating ?? 0) / 5
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
      label: s.comp_key,
    }
  })

  // Grilles
  const gridLevels = [1, 2, 3, 4, 5]
  const gridPolygons = gridLevels.map(level => {
    const pts = scores.map((_, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2
      const ratio = level / 5
      return `${cx + r * ratio * Math.cos(angle)},${cy + r * ratio * Math.sin(angle)}`
    })
    return pts.join(' ')
  })

  const dataPolygon = points.map(p => `${p.x},${p.y}`).join(' ')

  // Axes
  const axes = scores.map((_, i) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    return { x1: cx, y1: cy, x2: cx + r * Math.cos(angle), y2: cy + r * Math.sin(angle) }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grilles */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={i === 4 ? 1.5 : 0.8}/>
      ))}
      {/* Axes */}
      {axes.map((ax, i) => (
        <line key={i} x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2}
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.8}/>
      ))}
      {/* Données */}
      <polygon points={dataPolygon}
        fill="rgba(129,140,248,0.15)" stroke="#818CF8" strokeWidth={2}
        strokeLinejoin="round"/>
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4}
          fill="#818CF8" stroke="rgba(255,255,255,0.2)" strokeWidth={1}/>
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly}
          textAnchor="middle" dominantBaseline="central"
          fontSize={8} fill="rgba(255,255,255,0.5)">
          {scores[i]?.comp_key?.slice(0, 8)}
        </text>
      ))}
    </svg>
  )
}

// ─── Composant principal ─────────────────────────────────────

export default function Feedback360Summary({ evaluateeId, cycleId}) {
  const { data: scores = [], isLoading } = useFeedback360Summary(evaluateeId, cycleId)
  const { data: verbatims = [] }         = useFeedback360Verbatims(evaluateeId, cycleId)
  const [showVerbatims, setShowVerbatims] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-white/30"/>
      </div>
    )
  }

  if (!scores.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Users size={32} className="text-white/10"/>
        <p className="text-sm text-white/30">Aucune donnée disponible pour ce cycle.</p>
        <p className="text-xs text-white/20">Les résultats apparaissent une fois les évaluations soumises.</p>
      </div>
    )
  }

  const avgOverall = scores.reduce((s, c) => s + (c.avg_rating ?? 0), 0) / scores.length

  return (
    <div className="flex flex-col gap-4">
      {/* Header + score global */}
      <div className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-xs text-white/40 mb-1">Score moyen global</p>
          <p className="text-3xl font-bold" style={{ color: SCORE_COLOR(avgOverall) }}>
            {avgOverall.toFixed(1)}
            <span className="text-sm text-white/30 font-normal">/5</span>
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          <RadarChart scores={scores} size={160}/>
        </div>
      </div>

      {/* Détail par compétence */}
      <div className="flex flex-col gap-2">
        {scores.map(s => {
          const trend = s.trend_vs_prev
          return (
            <div key={s.comp_key} className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white/80 truncate">{s.comp_key}</span>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {trend !== null && (
                      <span className="flex items-center gap-0.5 text-xs"
                        style={{ color: trend > 0 ? '#22C55E' : trend < 0 ? '#EF4444' : '#6B7280' }}>
                        {trend > 0 ? <TrendingUp size={11}/> : trend < 0 ? <TrendingDown size={11}/> : <Minus size={11}/>}
                        {trend > 0 ? '+' : ''}{trend?.toFixed(1)}
                      </span>
                    )}
                    <span className="text-sm font-bold" style={{ color: SCORE_COLOR(s.avg_rating) }}>
                      {(s.avg_rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${((s.avg_rating ?? 0) / 5) * 100}%`, background: SCORE_COLOR(s.avg_rating) }}/>
                </div>
                <p className="text-xs text-white/25 mt-1">{s.response_count} réponse{s.response_count > 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Verbatims */}
      {verbatims.length > 0 && (
        <div>
          <button onClick={() => setShowVerbatims(v => !v)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors mb-2">
            <MessageSquare size={13}/>
            {verbatims.length} commentaire{verbatims.length > 1 ? 's' : ''} anonyme{verbatims.length > 1 ? 's' : ''}
            <span className="text-white/30 text-xs">{showVerbatims ? '▲' : '▼'}</span>
          </button>
          {showVerbatims && (
            <div className="flex flex-col gap-2">
              {verbatims.map((v, i) => (
                <div key={i} className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs text-white/35 mb-1">
                    {RELATIONSHIP_LABELS[v.relationship] ?? v.relationship}
                  </p>
                  <p className="text-sm text-white/70 italic">"{v.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
