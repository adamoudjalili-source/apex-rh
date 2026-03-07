// ============================================================
// APEX RH — components/compensation/SalaryBenchmarkPanel.jsx
// Session 58 — Benchmark marché (SVG natif, pas recharts)
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, TrendingUp, TrendingDown, Minus, Loader2, Search } from 'lucide-react'
import {
  useBenchmarks, useMyCompensationStats,
  formatSalary, formatSalaryShort,
  computeMarketGap, getMarketGapColor,
} from '../../hooks/useCompensation'

// ── Box-plot SVG (P25-P50-P75-P90) ───────────────────────────
function BenchmarkBoxPlot({ benchmark, myValue = null }) {
  const W = 320, H = 72
  const PADDING = 40

  const min = Math.min(benchmark.p25, myValue ?? benchmark.p25) * 0.9
  const max = Math.max(benchmark.p90, myValue ?? benchmark.p90) * 1.05
  const range = max - min

  const toX = (v) => PADDING + ((v - min) / range) * (W - 2 * PADDING)

  const x25 = toX(benchmark.p25)
  const x50 = toX(benchmark.p50)
  const x75 = toX(benchmark.p75)
  const x90 = toX(benchmark.p90)
  const xMy = myValue ? toX(myValue) : null

  const midY = H / 2

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="block">
        {/* IQR box (P25→P75) */}
        <rect x={x25} y={midY - 12} width={x75 - x25} height={24}
          fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" rx="3"/>

        {/* Whisker P25→min approximatif */}
        <line x1={PADDING + 4} y1={midY} x2={x25} y2={midY} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
        {/* Whisker P75→P90 */}
        <line x1={x75} y1={midY} x2={x90} y2={midY} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>

        {/* End caps */}
        <line x1={PADDING + 4} y1={midY - 6} x2={PADDING + 4} y2={midY + 6} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
        <line x1={x90} y1={midY - 6} x2={x90} y2={midY + 6} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>

        {/* Médiane (P50) */}
        <line x1={x50} y1={midY - 13} x2={x50} y2={midY + 13} stroke="rgba(201,162,39,0.9)" strokeWidth="2"/>

        {/* Mon salaire */}
        {xMy != null && (
          <g>
            <circle cx={xMy} cy={midY} r={7} fill={getMarketGapColor(computeMarketGap(myValue, benchmark))} opacity={0.9}/>
            <circle cx={xMy} cy={midY} r={7} fill="none" stroke="white" strokeWidth="1.5" opacity={0.8}/>
          </g>
        )}

        {/* Labels */}
        {[
          { x: x25, label: 'P25' },
          { x: x50, label: 'P50', color: '#C9A227' },
          { x: x75, label: 'P75' },
          { x: x90, label: 'P90' },
        ].map(({ x, label, color }) => (
          <text key={label} x={x} y={H - 6} textAnchor="middle"
            style={{ fontSize: 9, fill: color || 'rgba(255,255,255,0.3)', fontFamily: 'inherit' }}>
            {label}
          </text>
        ))}

        {xMy != null && (
          <text x={xMy} y={10} textAnchor="middle"
            style={{ fontSize: 9, fill: 'white', fontFamily: 'inherit', fontWeight: 600 }}>
            Moi
          </text>
        )}
      </svg>
    </div>
  )
}

// ── Carte benchmark ───────────────────────────────────────────
function BenchmarkCard({ benchmark, myValue }) {
  const gap = myValue ? computeMarketGap(myValue, benchmark) : null
  const gapColor = getMarketGapColor(gap)

  const GapIcon = gap == null ? Minus
    : gap < -5 ? TrendingDown
    : gap > 5  ? TrendingUp
    : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white/80">{benchmark.job_title || benchmark.job_family}</h3>
          <p className="text-[11px] text-white/35 mt-0.5">{benchmark.job_family} · Niveau {benchmark.level} · {benchmark.region}</p>
        </div>
        {gap != null && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: `${gapColor}20`, border: `1px solid ${gapColor}40` }}>
            <GapIcon size={11} style={{ color: gapColor }}/>
            <span className="text-[11px] font-semibold" style={{ color: gapColor }}>
              {gap >= 0 ? '+' : ''}{gap.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <BenchmarkBoxPlot benchmark={benchmark} myValue={myValue}/>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          { label: 'P25', value: benchmark.p25, color: 'rgba(239,68,68,0.7)' },
          { label: 'P50', value: benchmark.p50, color: '#C9A227' },
          { label: 'P75', value: benchmark.p75, color: 'rgba(99,102,241,0.7)' },
          { label: 'P90', value: benchmark.p90, color: 'rgba(139,92,246,0.7)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[10px]" style={{ color }}>{label}</p>
            <p className="text-[11px] font-semibold text-white/70">{formatSalaryShort(value)}</p>
          </div>
        ))}
      </div>

      {benchmark.source && (
        <p className="text-[10px] text-white/20 mt-3">Source : {benchmark.source} · {benchmark.reference_year}</p>
      )}
    </motion.div>
  )
}

// ── Panel principal ───────────────────────────────────────────
export default function SalaryBenchmarkPanel() {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')

  const { data: benchmarks = [], isLoading } = useBenchmarks()
  const { data: myStats }                    = useMyCompensationStats()

  const myValue = myStats?.base_salary ? Number(myStats.base_salary) : null

  const filtered = benchmarks.filter(b => {
    const matchSearch = !search || (b.job_family + ' ' + (b.job_title || '')).toLowerCase().includes(search.toLowerCase())
    const matchLevel  = levelFilter === 'all' || b.level === levelFilter
    return matchSearch && matchLevel
  })

  const families = [...new Set(benchmarks.map(b => b.job_family))]

  return (
    <div className="space-y-4">

      {/* Info panel */}
      <div className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Target size={16} style={{ color: '#6366F1' }} className="mt-0.5 flex-shrink-0"/>
        <div>
          <p className="text-sm font-medium text-white/80">Benchmark salarial</p>
          <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
            Comparez votre rémunération aux données du marché. Le point coloré représente votre salaire actuel.
            P50 = médiane marché (ligne dorée). P25-P75 = fourchette centrale de 50% du marché.
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un métier…"
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white/70 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white/70 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <option value="all">Tous niveaux</option>
          <option value="junior">Junior</option>
          <option value="confirme">Confirmé</option>
          <option value="senior">Senior</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={18} className="animate-spin text-white/30"/>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-10">
          <Target size={28} className="mx-auto text-white/15 mb-2"/>
          <p className="text-white/30 text-sm">Aucun benchmark trouvé</p>
        </div>
      )}

      {/* Résultats groupés par famille */}
      {!isLoading && families.filter(f => filtered.some(b => b.job_family === f)).map(family => (
        <div key={family} className="space-y-3">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1">{family}</h2>
          {filtered.filter(b => b.job_family === family).map(bm => (
            <BenchmarkCard key={bm.id} benchmark={bm} myValue={myValue}/>
          ))}
        </div>
      ))}
    </div>
  )
}
