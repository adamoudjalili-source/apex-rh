// ============================================================
// APEX RH — src/components/enps/ENPSTrend.jsx
// Session 55 — Évolution mensuelle eNPS (SVG natif, sans recharts)
// ============================================================
import { useState } from 'react'
import { getEnpsZone, formatENPS, ENPS_BENCHMARK } from '../../hooks/useENPS'

function fmtMonth(key) {
  if (!key) return ''
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export default function ENPSTrend({ data = [] }) {
  const [tooltip, setTooltip] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
        <div className="text-3xl mb-2">📈</div>
        <div className="text-sm text-gray-500">Aucune donnée d'évolution disponible</div>
        <div className="text-xs text-gray-600 mt-1">Les données apparaîtront après la clôture des premiers surveys</div>
      </div>
    )
  }

  // ── Résumé tendance ──────────────────────────────────────
  const last   = data[data.length - 1]?.enps
  const penult = data[data.length - 2]?.enps
  const trend  = last != null && penult != null ? last - penult : null

  // ── Dimensions SVG ───────────────────────────────────────
  const W = 600
  const H = 200
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top  - PAD.bottom

  const scores = data.map(d => d.enps).filter(s => s != null)
  const rawMin = Math.min(...scores, -20)
  const rawMax = Math.max(...scores, 30)
  const yMin   = Math.floor(rawMin / 10) * 10 - 5
  const yMax   = Math.ceil(rawMax  / 10) * 10 + 5
  const yRange = yMax - yMin

  const xOf = i  => PAD.left + (i / (data.length - 1)) * chartW
  const yOf = v  => PAD.top  + chartH - ((v - yMin) / yRange) * chartH

  // Y gridlines
  const yTicks = []
  for (let v = Math.ceil(yMin / 20) * 20; v <= yMax; v += 20) yTicks.push(v)

  // Polyline points (skip nulls → split into segments)
  const segments = []
  let seg = []
  data.forEach((d, i) => {
    if (d.enps != null) {
      seg.push(`${xOf(i)},${yOf(d.enps)}`)
    } else {
      if (seg.length > 1) segments.push(seg)
      seg = []
    }
  })
  if (seg.length > 1) segments.push(seg)

  const benchY = yOf(ENPS_BENCHMARK.sector_avg)
  const zeroY  = yOf(0)

  return (
    <div className="space-y-4">
      {/* Résumé */}
      {data.length >= 2 && (
        <div className="flex items-center gap-4">
          <div className="text-2xl font-black" style={{ color: getEnpsZone(last)?.color || '#6B7280' }}>
            {formatENPS(last)}
          </div>
          {trend !== null && (
            <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trend))} pts vs mois précédent
            </div>
          )}
          <div className="text-xs text-gray-500 ml-auto">
            {data.filter(d => d.enps != null).length} mois de données
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 200 }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grille horizontale */}
          {yTicks.map(v => (
            <g key={v}>
              <line
                x1={PAD.left} x2={PAD.left + chartW}
                y1={yOf(v)}   y2={yOf(v)}
                stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3"
              />
              <text x={PAD.left - 4} y={yOf(v) + 4} textAnchor="end" fontSize={10} fill="#6B7280">
                {v > 0 ? `+${v}` : v}
              </text>
            </g>
          ))}

          {/* Ligne zéro */}
          {zeroY >= PAD.top && zeroY <= PAD.top + chartH && (
            <line
              x1={PAD.left} x2={PAD.left + chartW}
              y1={zeroY}    y2={zeroY}
              stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4"
            />
          )}

          {/* Benchmark */}
          {benchY >= PAD.top && benchY <= PAD.top + chartH && (
            <>
              <line
                x1={PAD.left} x2={PAD.left + chartW}
                y1={benchY}   y2={benchY}
                stroke="#6366F1" strokeDasharray="6 3" strokeOpacity={0.5}
              />
              <text x={PAD.left + chartW - 2} y={benchY - 3} textAnchor="end" fontSize={9} fill="#6366F1" opacity={0.7}>
                Benchmark
              </text>
            </>
          )}

          {/* Courbes (segments) */}
          {segments.map((pts, si) => (
            <polyline
              key={si}
              points={pts.join(' ')}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Points + zones hover */}
          {data.map((d, i) => {
            if (d.enps == null) return null
            const cx = xOf(i)
            const cy = yOf(d.enps)
            const zone = getEnpsZone(d.enps)
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={6} fill="transparent"
                  onMouseEnter={() => setTooltip({ d, cx, cy })}
                />
                <circle cx={cx} cy={cy} r={4}
                  fill={zone?.color || '#8B5CF6'}
                  stroke="#0F1117" strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}

          {/* Labels X */}
          {data.map((d, i) => {
            // N'afficher que tous les 2 si beaucoup de points
            if (data.length > 8 && i % 2 !== 0) return null
            return (
              <text
                key={i}
                x={xOf(i)} y={H - 4}
                textAnchor="middle" fontSize={10} fill="#6B7280"
              >
                {fmtMonth(d.month)}
              </text>
            )
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (() => {
          const { d, cx, cy } = tooltip
          const zone = getEnpsZone(d.enps)
          // Positionner en % par rapport au SVG
          const leftPct = (cx / W * 100)
          const topPct  = (cy / H * 100)
          return (
            <div
              className="absolute z-10 rounded-xl border border-white/10 p-3 text-xs pointer-events-none"
              style={{
                background: '#0F1117',
                left:  `${Math.min(leftPct, 70)}%`,
                top:   `${Math.max(topPct - 40, 2)}%`,
                minWidth: 150,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="text-gray-400 font-semibold mb-1.5">{fmtMonth(d.month)}</div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">eNPS</span>
                <span className="font-bold" style={{ color: zone?.color || '#6B7280' }}>{formatENPS(d.enps)}</span>
              </div>
              {d.total > 0 && (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Promoteurs</span>
                    <span className="text-green-400">{d.promoters}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Détracteurs</span>
                    <span className="text-red-400">{d.detractors}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Total</span>
                    <span className="text-white">{d.total}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-4 pt-1 border-t border-white/8 mt-1">
                <span className="text-gray-600">Benchmark</span>
                <span className="text-indigo-400">+{ENPS_BENCHMARK.sector_avg}</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: '#8B5CF6' }} />
          <span>eNPS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: '#6366F1', opacity: 0.5 }} />
          <span>Benchmark sectoriel (+{ENPS_BENCHMARK.sector_avg})</span>
        </div>
      </div>
    </div>
  )
}