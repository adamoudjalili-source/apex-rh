// ============================================================
// APEX RH — PulseTrendChart.jsx
// Session 76 — Graphe SVG tendance PULSE 30j (ligne + zone)
// Utilisé dans PulseAlertCenter et vue individuelle
// ============================================================
import { useMemo } from 'react'
import { getScoreColor } from '../../lib/pulseHelpers'

const W = 600
const H = 160
const PAD = { top: 15, right: 20, bottom: 30, left: 42 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

// ─── HELPERS ─────────────────────────────────────────────────


function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// ─── COMPOSANT ───────────────────────────────────────────────

export default function PulseTrendChart({ data = [], title, color, height = 160, showArea = true }) {
  const chartH = height
  const innerH = chartH - PAD.top - PAD.bottom

  const { points, avgLine, latestScore, trend } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], avgLine: 0, latestScore: null, trend: 0 }

    const scores = data.map(d => parseFloat(d.total_score) || 0)
    const minS = 0
    const maxS = 100

    const pts = data.map((d, i) => ({
      x: PAD.left + (i / Math.max(1, data.length - 1)) * INNER_W,
      y: PAD.top + (1 - (parseFloat(d.total_score) || 0 - minS) / (maxS - minS)) * innerH,
      score: parseFloat(d.total_score) || 0,
      date: d.score_date,
    }))

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const latest = scores[scores.length - 1]
    const prev = scores.length > 7 ? scores.slice(-14, -7).reduce((a, b) => a + b, 0) / 7 : null
    const curr = scores.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, scores.length)
    const t = prev !== null ? curr - prev : 0

    return { points: pts, avgLine: avg, latestScore: latest, trend: t }
  }, [data, innerH])

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height: chartH }}>
        Données insuffisantes
      </div>
    )
  }

  const lineColor = color || getScoreColor(points[points.length - 1]?.score)
  const avgY = PAD.top + (1 - avgLine / 100) * innerH
  const yTicks = [0, 25, 50, 70, 100]

  // Ligne lissée (courbe de Catmull-Rom simple)
  const smoothPath = useMemo(() => {
    if (points.length < 2) return ''
    let d = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cp1x = prev.x + (curr.x - prev.x) / 3
      const cp2x = curr.x - (curr.x - prev.x) / 3
      d += ` C${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`
    }
    return d
  }, [points])

  const areaPath = useMemo(() => {
    if (points.length < 2) return ''
    const last = points[points.length - 1]
    const first = points[0]
    return `${smoothPath} L${last.x},${PAD.top + innerH} L${first.x},${PAD.top + innerH} Z`
  }, [smoothPath, points, innerH])

  const trendColor = trend > 5 ? '#10B981' : trend < -5 ? '#EF4444' : '#F59E0B'
  const trendIcon = trend > 5 ? '↑' : trend < -5 ? '↓' : '→'

  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">{title}</span>
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: trendColor }}>
              {trendIcon} {Math.abs(trend).toFixed(1)} pts / 7j
            </span>
            <span style={{ color: getScoreColor(latestScore) }}>
              Dernière : {latestScore?.toFixed(0)}
            </span>
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${chartH}`}
        width="100%"
        height={chartH}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`grad-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grille horizontale + labels Y */}
        {yTicks.map(tick => {
          const y = PAD.top + (1 - tick / 100) * innerH
          return (
            <g key={tick}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + INNER_W} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                strokeDasharray={tick === 70 ? '4,3' : tick === 40 ? '4,3' : ''}
              />
              <text x={PAD.left - 6} y={y + 4} fontSize="9" fill="#6B7280" textAnchor="end">
                {tick}
              </text>
            </g>
          )
        })}

        {/* Zones seuils (fond coloré) */}
        {/* Zone critique < 40 */}
        <rect
          x={PAD.left} y={PAD.top + (1 - 40 / 100) * innerH}
          width={INNER_W}
          height={(40 / 100) * innerH}
          fill="rgba(239,68,68,0.04)"
        />

        {/* Ligne moyenne */}
        <line
          x1={PAD.left} y1={avgY} x2={PAD.left + INNER_W} y2={avgY}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,4"
        />
        <text x={PAD.left + INNER_W + 4} y={avgY + 4} fontSize="9" fill="rgba(255,255,255,0.3)">
          {avgLine.toFixed(0)}
        </text>

        {/* Zone remplie */}
        {showArea && (
          <path d={areaPath} fill={`url(#grad-${lineColor.replace('#', '')})`} />
        )}

        {/* Ligne principale */}
        <path d={smoothPath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Points (seulement si peu de données) */}
        {points.length <= 14 && points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r="3.5"
            fill={getScoreColor(p.score)}
            stroke="#1a1f2e"
            strokeWidth="1.5"
          />
        ))}

        {/* Dernier point mis en valeur */}
        {points.length > 0 && (() => {
          const last = points[points.length - 1]
          return (
            <circle cx={last.x} cy={last.y} r="5" fill={lineColor} stroke="#1a1f2e" strokeWidth="2" />
          )
        })()}

        {/* Labels X (début / milieu / fin) */}
        {[0, Math.floor(points.length / 2), points.length - 1]
          .filter((v, i, a) => a.indexOf(v) === i && v >= 0 && v < points.length)
          .map(idx => {
            const p = points[idx]
            return (
              <text key={idx} x={p.x} y={PAD.top + innerH + 16} fontSize="9" fill="#6B7280" textAnchor="middle">
                {formatDateShort(data[idx]?.score_date)}
              </text>
            )
          })}
      </svg>
    </div>
  )
}
