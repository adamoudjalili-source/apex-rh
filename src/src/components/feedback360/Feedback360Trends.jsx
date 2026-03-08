// ============================================================
// APEX RH — components/feedback360/Feedback360Trends.jsx
// Session 81 — Tendances 360° : courbes SVG dans le temps
// ============================================================
import { useState } from 'react'
import { TrendingUp, Loader2, BarChart2 } from 'lucide-react'
import { useFeedback360Trends } from '../../hooks/useFeedback360'

const PALETTE = ['#818CF8', '#34D399', '#F59E0B', '#EC4899', '#60A5FA', '#A78BFA', '#FB923C']

// ─── Courbe SVG ──────────────────────────────────────────────

function LineChart({ series, cycles, width = 500, height = 160 }) {
  const pad = { top: 16, right: 16, bottom: 36, left: 32 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  if (!cycles.length || !series.length) return null

  const xStep = innerW / Math.max(cycles.length - 1, 1)
  const yScale = (v) => innerH - ((v / 5) * innerH)

  // Grilles horizontales
  const yLines = [1, 2, 3, 4, 5]

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Grilles */}
        {yLines.map(v => (
          <g key={v}>
            <line x1={0} y1={yScale(v)} x2={innerW} y2={yScale(v)}
              stroke="rgba(255,255,255,0.05)" strokeWidth={0.8}/>
            <text x={-4} y={yScale(v)} textAnchor="end" dominantBaseline="central"
              fontSize={8} fill="rgba(255,255,255,0.25)">{v}</text>
          </g>
        ))}

        {/* Labels X */}
        {cycles.map((c, i) => (
          <text key={i}
            x={i * xStep} y={innerH + 16}
            textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.3)">
            {c.slice(0, 12)}
          </text>
        ))}

        {/* Courbes */}
        {series.map((s, si) => {
          const pts = cycles.map((c, i) => {
            const v = s.data[c] ?? null
            if (v === null) return null
            return { x: i * xStep, y: yScale(v), v }
          })
          const validPts = pts.filter(Boolean)
          if (validPts.length < 1) return null

          const pathD = validPts.map((p, i) =>
            i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          ).join(' ')

          return (
            <g key={s.key}>
              <path d={pathD} fill="none" stroke={PALETTE[si % PALETTE.length]}
                strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
              {validPts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5}
                  fill={PALETTE[si % PALETTE.length]}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
              ))}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ─── Composant principal ─────────────────────────────────────

export default function Feedback360Trends({ userId }) {
  const { data: rawTrends = [], isLoading } = useFeedback360Trends(userId)
  const [selectedKeys, setSelectedKeys] = useState([])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-white/30"/>
      </div>
    )
  }

  if (!rawTrends.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <BarChart2 size={32} className="text-white/10"/>
        <p className="text-sm text-white/30">Pas encore de tendances disponibles.</p>
        <p className="text-xs text-white/20">Les tendances apparaissent après plusieurs cycles.</p>
      </div>
    )
  }

  // Organiser les données : comp_key → {cycle_title: avg_rating}
  const allCompKeys = [...new Set(rawTrends.map(t => t.comp_key))]
  const allCycles   = [...new Set(rawTrends.map(t => t.cycle_title))].sort(
    (a, b) => {
      const ad = rawTrends.find(t => t.cycle_title === a)?.cycle_end_date ?? ''
      const bd = rawTrends.find(t => t.cycle_title === b)?.cycle_end_date ?? ''
      return ad < bd ? -1 : 1
    }
  )

  const dataByComp = {}
  rawTrends.forEach(t => {
    if (!dataByComp[t.comp_key]) dataByComp[t.comp_key] = {}
    dataByComp[t.comp_key][t.cycle_title] = parseFloat(t.avg_rating)
  })

  const activeKeys = selectedKeys.length ? selectedKeys : allCompKeys.slice(0, 4)

  const series = activeKeys.map(k => ({ key: k, data: dataByComp[k] ?? {} }))

  // Dernière évolution globale
  const lastCycle = allCycles[allCycles.length - 1]
  const prevCycle = allCycles[allCycles.length - 2]
  const lastAvg = lastCycle
    ? allCompKeys.reduce((s, k) => s + (dataByComp[k]?.[lastCycle] ?? 0), 0) / allCompKeys.length
    : null
  const prevAvg = prevCycle
    ? allCompKeys.reduce((s, k) => s + (dataByComp[k]?.[prevCycle] ?? 0), 0) / allCompKeys.length
    : null
  const delta = lastAvg && prevAvg ? lastAvg - prevAvg : null

  return (
    <div className="flex flex-col gap-4">
      {/* Header stats */}
      {lastAvg !== null && (
        <div className="flex items-center gap-4">
          <div className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-white/40">Dernier cycle moyen</p>
            <p className="text-2xl font-bold text-white">{lastAvg.toFixed(1)}<span className="text-sm text-white/30">/5</span></p>
          </div>
          {delta !== null && (
            <div className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/40">Évolution</p>
              <p className="text-2xl font-bold flex items-center gap-1"
                style={{ color: delta >= 0 ? '#22C55E' : '#EF4444' }}>
                <TrendingUp size={18}/>
                {delta > 0 ? '+' : ''}{delta.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Légende / sélection compétences */}
      <div className="flex flex-wrap gap-1.5">
        {allCompKeys.map((k, i) => {
          const isActive = activeKeys.includes(k)
          return (
            <button key={k}
              onClick={() => {
                setSelectedKeys(prev =>
                  prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
                )
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
              style={{
                background: isActive ? `${PALETTE[i % PALETTE.length]}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? PALETTE[i % PALETTE.length] : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? PALETTE[i % PALETTE.length] : 'rgba(255,255,255,0.35)',
              }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: PALETTE[i % PALETTE.length], opacity: isActive ? 1 : 0.3 }}/>
              {k}
            </button>
          )
        })}
      </div>

      {/* Graphique */}
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <LineChart series={series} cycles={allCycles}/>
      </div>

      {/* Tableau récapitulatif */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid text-xs text-white/40 px-4 py-2"
          style={{ gridTemplateColumns: `1fr repeat(${allCycles.length}, 1fr)`, background: 'rgba(255,255,255,0.03)' }}>
          <span>Compétence</span>
          {allCycles.map(c => <span key={c} className="text-center">{c.slice(0, 10)}</span>)}
        </div>
        {allCompKeys.map((k, i) => (
          <div key={k} className="grid text-xs px-4 py-2 items-center"
            style={{
              gridTemplateColumns: `1fr repeat(${allCycles.length}, 1fr)`,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            }}>
            <span className="text-white/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }}/>
              {k}
            </span>
            {allCycles.map(c => {
              const v = dataByComp[k]?.[c]
              return (
                <span key={c} className="text-center font-mono"
                  style={{ color: v ? (v >= 4 ? '#22C55E' : v >= 3 ? '#EAB308' : '#EF4444') : 'rgba(255,255,255,0.15)' }}>
                  {v ? v.toFixed(1) : '—'}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
