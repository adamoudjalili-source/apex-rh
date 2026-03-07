// ============================================================
// APEX RH — components/entretiens/AnnualReviewEnrichedDashboard.jsx
// Session 62 — Tableau de bord entretiens enrichi
// • KPIs N vs N-1 · Tendances multi-années (SVG) · Heatmap divisions
// • Comparateur de campagnes · Distribution ratings enrichie
// ============================================================
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, BarChart3,
  Users, CheckCircle, Star, Calendar,
  ChevronDown, ArrowUpRight, ArrowDownRight,
  Info, Loader2, RefreshCw, Award,
} from 'lucide-react'
import { useAuth }           from '../../contexts/AuthContext'
import { useAllCampaigns }   from '../../hooks/useAnnualReviews'
import {
  useMultiYearTrends,
  useDivisionHeatmap,
  useAllCampaignsStats,
  useCampaignComparison,
  useYearOverYearKPIs,
  scoreToHeatmapColor,
  scoreToTextColor,
  scoreToLabel,
  computeTrend,
  computeWeightedAvgFromRow,
  computeTopPerformerPct,
  formatScore,
  getRecentYears,
  buildLinePoints,
  RATING_ORDER,
  TREND_COLORS,
} from '../../hooks/useAnnualReviewsDashboard'
import {
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  SALARY_RECOMMENDATION_LABELS,
  SALARY_RECOMMENDATION_COLORS,
} from '../../hooks/useAnnualReviews'

// ─── Sous-composants utilitaires ─────────────────────────────

function TrendBadge({ trend, unit = '' }) {
  if (!trend) return null
  if (trend.direction === 'stable') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-white/30">
        <Minus size={10}/> Stable
      </span>
    )
  }
  const up   = trend.direction === 'up'
  const sign = up ? '+' : ''
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium`}
      style={{ color: up ? '#10B981' : '#EF4444' }}>
      {up ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
      {sign}{typeof trend.delta === 'number' ? trend.delta.toFixed(1) : ''}{unit}
    </span>
  )
}

function KPICard({ label, value, previous, trend, unit = '', icon: Icon, color = '#818CF8', format }) {
  const display = format ? format(value) : (value !== null && value !== undefined ? `${value}${unit}` : '—')
  const prevDisplay = format ? format(previous) : (previous !== null && previous !== undefined ? `${previous}${unit}` : null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40 font-medium">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}18` }}>
            <Icon size={13} style={{ color }}/>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{display}</p>
      <div className="flex items-center gap-2">
        <TrendBadge trend={trend} unit={unit}/>
        {prevDisplay && (
          <span className="text-xs text-white/25">N-1 : {prevDisplay}</span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Ligne SVG des tendances ──────────────────────────────────

function MultiYearLineChart({ data, keys, labels, width = 340, height = 140 }) {
  const [hovered, setHovered] = useState(null)
  if (!data?.length) return (
    <div className="flex items-center justify-center py-8">
      <p className="text-xs text-white/25">Aucune donnée multi-années</p>
    </div>
  )

  const padding = 32
  const xStep   = (width - padding * 2) / Math.max(data.length - 1, 1)

  // Pour chaque key, normalisation 0→100% visuelle
  const ranges = {}
  keys.forEach(key => {
    const vals = data.map(d => d[key]).filter(v => v != null)
    ranges[key] = { min: Math.min(...vals, 0), max: Math.max(...vals, 0.01) }
  })

  const toY = (val, key) => {
    const { min, max } = ranges[key]
    const range = max - min || 1
    return padding + (height - padding * 2) - ((val - min) / range) * (height - padding * 2)
  }

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grille horizontale */}
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct}
            x1={padding} y1={padding + (height - padding * 2) * (1 - pct)}
            x2={width - padding} y2={padding + (height - padding * 2) * (1 - pct)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}

        {/* Lignes pour chaque indicateur */}
        {keys.map((key, ki) => {
          const color  = TREND_COLORS[key] ?? '#818CF8'
          const points = data
            .map((d, i) => {
              const val = d[key]
              if (val == null) return null
              const x = padding + i * xStep
              const y = toY(val, key)
              return { x, y, val, year: d.year }
            })
            .filter(Boolean)

          if (points.length < 2) return null

          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

          return (
            <g key={key}>
              <path d={pathD} stroke={color} strokeWidth="2" fill="none"
                strokeLinecap="round" strokeLinejoin="round"/>
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5"
                  fill={color} stroke="rgba(15,15,25,1)" strokeWidth="1.5"
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered({ key, ...p, label: labels[ki] })}
                  onMouseLeave={() => setHovered(null)}/>
              ))}
            </g>
          )
        })}

        {/* Labels années */}
        {data.map((d, i) => (
          <text key={i}
            x={padding + i * xStep} y={height - 4}
            textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">
            {d.year}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-10 rounded-lg px-2.5 py-1.5 text-xs"
            style={{
              background: 'rgba(20,20,35,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              top: Math.max(8, hovered.y - 36),
              left: Math.min(width - 100, Math.max(0, hovered.x - 40)),
            }}>
            <p className="text-white/50">{hovered.year} · {hovered.label}</p>
            <p className="font-bold text-white">{formatScore(hovered.val)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Heatmap divisions ────────────────────────────────────────

function DivisionHeatmapGrid({ divisions, years, matrix }) {
  const [hovered, setHovered] = useState(null)

  if (!divisions?.length || !years?.length) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs text-white/25">Aucune donnée de division disponible</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
        <thead>
          <tr>
            <th className="text-left text-white/30 font-normal pb-2 pr-3" style={{ minWidth: 120 }}>Division</th>
            {years.map(year => (
              <th key={year} className="text-center text-white/30 font-normal pb-2" style={{ minWidth: 64 }}>
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {divisions.map(div => (
            <tr key={div.id}>
              <td className="text-white/60 font-medium pr-3 py-0.5" style={{ whiteSpace: 'nowrap' }}>
                {div.name ?? '—'}
              </td>
              {years.map(year => {
                const cell = matrix[div.id]?.[year] ?? null
                const score = cell?.avg_rating_score
                const bg   = scoreToHeatmapColor(score)
                const tc   = scoreToTextColor(score)
                const key  = `${div.id}-${year}`
                return (
                  <td key={year} className="py-0.5">
                    <div
                      className="rounded-md flex flex-col items-center justify-center cursor-default transition-all"
                      style={{
                        background: hovered === key ? (score ? `${tc}35` : 'rgba(255,255,255,0.07)') : bg,
                        border: `1px solid ${hovered === key ? tc : 'transparent'}`,
                        minWidth: 60,
                        height: 42,
                      }}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}>
                      {score != null ? (
                        <>
                          <span className="font-bold" style={{ color: tc }}>{formatScore(score)}</span>
                          <span className="text-white/30" style={{ fontSize: 9 }}>
                            {cell?.completion_rate != null ? `${cell.completion_rate}%` : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-white/15">—</span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Légende */}
      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs text-white/30">Score moyen :</span>
        {[
          { score: 4.8, label: 'Excellent' },
          { score: 3.8, label: 'Bien' },
          { score: 2.8, label: 'Satisfaisant' },
          { score: 1.8, label: 'À améliorer' },
          { score: 1.0, label: 'Insuffisant' },
        ].map(({ score, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ background: scoreToHeatmapColor(score) }}/>
            <span className="text-xs text-white/30">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Distribution ratings (bar chart SVG) ────────────────────

function RatingDistributionBar({ data, year, showCount = true }) {
  if (!data) return null

  const total = RATING_ORDER.reduce((s, k) => s + (data[`rating_${k}`] || 0), 0)
  if (!total) return <p className="text-xs text-white/25">Aucune donnée</p>

  return (
    <div className="space-y-1.5">
      {RATING_ORDER.map(key => {
        const count = data[`rating_${key}`] || 0
        const pct   = total ? Math.round((count / total) * 100) : 0
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-white/40 w-20 text-right flex-shrink-0">
              {OVERALL_RATING_LABELS[key]}
            </span>
            <div className="flex-1 h-3 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: OVERALL_RATING_COLORS[key] }}/>
            </div>
            <span className="text-xs text-white/50 w-8 flex-shrink-0">
              {pct}%
            </span>
            {showCount && (
              <span className="text-xs text-white/25 w-6 flex-shrink-0">({count})</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Comparateur campagnes ────────────────────────────────────

function CampaignComparator({ campaigns }) {
  const [selA, setSelA] = useState(campaigns[campaigns.length - 2]?.id ?? '')
  const [selB, setSelB] = useState(campaigns[campaigns.length - 1]?.id ?? '')
  const { data: cmp, isLoading } = useCampaignComparison(selA, selB)

  const metrics = [
    { key: 'completion_rate', label: 'Taux complétion', format: v => `${v ?? '—'}%`, delta_key: 'completion_rate' },
    { key: 'signed_count',    label: 'Entretiens signés', format: v => v ?? '—', delta_key: 'signature_rate' },
    { key: 'total_reviews',   label: 'Total entretiens',  format: v => v ?? '—', delta_key: 'total_reviews' },
    { key: '__avg_rating',    label: 'Score moyen',       format: v => formatScore(v),  delta_key: 'avg_rating' },
    { key: '__top_pct',       label: 'Top performers',    format: v => `${v ?? '—'}%`,  delta_key: null },
  ]

  function getValue(row, key) {
    if (key === '__avg_rating')  return computeWeightedAvgFromRow(row)
    if (key === '__top_pct')     return computeTopPerformerPct(row)
    return row?.[key] ?? null
  }

  const SelectBox = ({ value, onChange }) => (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm text-white/80 pr-8 appearance-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}>
        {campaigns.map(c => (
          <option key={c.id} value={c.id} style={{ background: '#1e1e2e' }}>
            {c.year} — {c.title}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"/>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-white/30 mb-1.5">Campagne A (référence)</p>
          <SelectBox value={selA} onChange={setSelA}/>
        </div>
        <div>
          <p className="text-xs text-white/30 mb-1.5">Campagne B (comparaison)</p>
          <SelectBox value={selB} onChange={setSelB}/>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-white/25"/>
        </div>
      ) : cmp?.a && cmp?.b ? (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Header */}
          <div className="grid grid-cols-5 text-xs text-white/30 px-4 py-2"
            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="col-span-2">Indicateur</span>
            <span className="text-center">{cmp.a.year ?? 'A'}</span>
            <span className="text-center">{cmp.b.year ?? 'B'}</span>
            <span className="text-center">Évolution</span>
          </div>

          {metrics.map((m, i) => {
            const va    = getValue(cmp.a, m.key)
            const vb    = getValue(cmp.b, m.key)
            const delta = m.delta_key && cmp.deltas ? cmp.deltas[m.delta_key] : null
            const trend = delta !== null ? computeTrend(vb, va) : null

            return (
              <div key={m.key}
                className="grid grid-cols-5 items-center px-4 py-2.5 text-sm"
                style={{
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  borderBottom: i < metrics.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                <span className="col-span-2 text-xs text-white/50">{m.label}</span>
                <span className="text-center font-medium text-white/70">{m.format(va)}</span>
                <span className="text-center font-semibold text-white">{m.format(vb)}</span>
                <div className="flex justify-center">
                  <TrendBadge trend={trend}/>
                </div>
              </div>
            )
          })}

          {/* Distribution comparative */}
          <div className="grid grid-cols-2 gap-4 px-4 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="text-xs text-white/30 mb-2">Distribution A</p>
              <RatingDistributionBar data={cmp.a} showCount={false}/>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-2">Distribution B</p>
              <RatingDistributionBar data={cmp.b} showCount={false}/>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-6">
          <p className="text-xs text-white/25">Sélectionnez deux campagnes à comparer</p>
        </div>
      )}
    </div>
  )
}

// ─── Section selector (sous-onglets internes) ─────────────────

const SECTIONS = [
  { id: 'overview',   label: 'Vue d'ensemble',  icon: BarChart3 },
  { id: 'heatmap',    label: 'Heatmap divisions', icon: Users },
  { id: 'tendances',  label: 'Tendances',         icon: TrendingUp },
  { id: 'comparaison',label: 'Comparaison',        icon: Star },
]

// ─── Main Component ───────────────────────────────────────────

export default function AnnualReviewEnrichedDashboard() {
  const [section, setSection] = useState('overview')
  const currentYear = new Date().getFullYear()

  const { data: trends      = [], isLoading: loadTrends } = useMultiYearTrends()
  const { data: heatmapData,       isLoading: loadHeatmap } = useDivisionHeatmap()
  const { data: allStats    = [], isLoading: loadStats  } = useAllCampaignsStats()
  const { data: campaigns   = [] } = useAllCampaigns()
  const { kpis, isLoading: loadKPIs } = useYearOverYearKPIs(currentYear)

  const recentTrends  = useMemo(() => getRecentYears(trends, 5), [trends])
  const currentStats  = useMemo(
    () => allStats.find(s => s.year === currentYear) ?? allStats[allStats.length - 1] ?? null,
    [allStats, currentYear]
  )
  const loading = loadTrends || loadKPIs

  return (
    <div className="space-y-5">

      {/* Sous-navigation */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {SECTIONS.map(s => {
          const Icon   = s.icon
          const active = section === s.id
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="flex items-center gap-1.5 flex-shrink-0 rounded-lg px-3 py-1.5 text-sm transition-all"
              style={{
                background: active ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.03)',
                color:      active ? '#818CF8' : '#ffffff50',
                border:     `1px solid ${active ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.05)'}`,
              }}>
              <Icon size={13}/>
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>

          {/* ── Vue d'ensemble ─────────────────────────────── */}
          {section === 'overview' && (
            <div className="space-y-4">

              {/* Année courante */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/30 font-medium uppercase tracking-wider">
                  Indicateurs {currentYear} vs {currentYear - 1}
                </p>
                {loading && <Loader2 size={12} className="animate-spin text-white/20"/>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <KPICard
                  label="Taux complétion"
                  value={kpis.completion.current !== null ? `${kpis.completion.current}%` : null}
                  previous={kpis.completion.previous !== null ? `${kpis.completion.previous}%` : null}
                  trend={kpis.completion.trend}
                  icon={CheckCircle}
                  color="#818CF8"/>
                <KPICard
                  label="Taux signature"
                  value={kpis.signature.current !== null ? `${kpis.signature.current}%` : null}
                  previous={kpis.signature.previous !== null ? `${kpis.signature.previous}%` : null}
                  trend={kpis.signature.trend}
                  icon={Award}
                  color="#10B981"/>
                <KPICard
                  label="Score moyen"
                  value={kpis.avgRating.current}
                  previous={kpis.avgRating.previous}
                  trend={kpis.avgRating.trend}
                  format={v => v !== null && v !== undefined ? formatScore(v) + '/5' : '—'}
                  icon={Star}
                  color="#F59E0B"/>
                <KPICard
                  label="Top performers"
                  value={kpis.topPerformers.current !== null ? `${kpis.topPerformers.current}%` : null}
                  previous={kpis.topPerformers.previous !== null ? `${kpis.topPerformers.previous}%` : null}
                  trend={kpis.topPerformers.trend}
                  icon={TrendingUp}
                  color="#3B82F6"/>
              </div>

              {/* Distribution ratings — campagne la plus récente */}
              {currentStats && (
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white">
                      Distribution des évaluations {currentStats.year}
                    </p>
                    <span className="text-xs text-white/30">
                      {currentStats.total_reviews ?? 0} entretiens
                    </span>
                  </div>
                  <RatingDistributionBar data={currentStats} showCount/>
                </div>
              )}

              {/* Recommandations salariales */}
              {currentStats && (
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-semibold text-white mb-3">Recommandations salariales {currentStats.year}</p>
                  <div className="space-y-1.5">
                    {[
                      { key: 'aug_merite_count',      label: 'Augmentation mérite',      color: '#3B82F6' },
                      { key: 'aug_promotion_count',   label: 'Augmentation promotion',   color: '#10B981' },
                      { key: 'aug_exceptional_count', label: 'Révision exceptionnelle',  color: '#C9A227' },
                      { key: 'maintien_count',        label: 'Maintien',                 color: '#6B7280' },
                      { key: 'gel_count',             label: 'Gel',                      color: '#EF4444' },
                    ].map(item => {
                      const count = currentStats[item.key] || 0
                      const total = (currentStats.aug_merite_count || 0) +
                                    (currentStats.aug_promotion_count || 0) +
                                    (currentStats.aug_exceptional_count || 0) +
                                    (currentStats.maintien_count || 0) +
                                    (currentStats.gel_count || 0)
                      const pct = total ? Math.round((count / total) * 100) : 0
                      return (
                        <div key={item.key} className="flex items-center gap-2">
                          <span className="text-xs text-white/40 w-36 text-right flex-shrink-0">{item.label}</span>
                          <div className="flex-1 h-2.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
                              className="h-full rounded-full"
                              style={{ background: item.color }}/>
                          </div>
                          <span className="text-xs text-white/50 w-8 flex-shrink-0">{pct}%</span>
                          <span className="text-xs text-white/25 w-6 flex-shrink-0">({count})</span>
                        </div>
                      )
                    })}
                  </div>
                  {currentStats.avg_increase_pct && (
                    <p className="text-xs text-white/30 mt-3">
                      Augmentation moyenne : <span className="text-indigo-400 font-semibold">+{currentStats.avg_increase_pct}%</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Heatmap divisions ──────────────────────────── */}
          {section === 'heatmap' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/30 font-medium uppercase tracking-wider">
                  Score moyen & complétion par division × année
                </p>
                {loadHeatmap && <Loader2 size={12} className="animate-spin text-white/20"/>}
              </div>

              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {heatmapData ? (
                  <DivisionHeatmapGrid
                    divisions={heatmapData.divisions}
                    years={heatmapData.years}
                    matrix={heatmapData.matrix}/>
                ) : loadHeatmap ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-white/20"/>
                  </div>
                ) : (
                  <p className="text-xs text-white/25 text-center py-6">
                    Aucune donnée de division disponible
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <Info size={13} className="text-indigo-400 mt-0.5 flex-shrink-0"/>
                <p className="text-xs text-white/40 leading-relaxed">
                  Chaque cellule affiche le score moyen des évaluations (1–5) et le taux de complétion de la campagne.
                  Les cellules vides indiquent qu'aucun entretien n'a été complété pour cette division cette année-là.
                </p>
              </div>
            </div>
          )}

          {/* ── Tendances multi-années ──────────────────────── */}
          {section === 'tendances' && (
            <div className="space-y-4">
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider">
                Évolution sur {recentTrends.length} ans
              </p>

              {/* Score moyen */}
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm font-semibold text-white mb-1">Score moyen global</p>
                <p className="text-xs text-white/30 mb-3">Évolution du score d'évaluation moyen (1–5)</p>
                <MultiYearLineChart
                  data={recentTrends}
                  keys={['avg_rating_score']}
                  labels={['Score moyen']}
                  height={120}/>
              </div>

              {/* Taux complétion + signature */}
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-4 mb-3">
                  <p className="text-sm font-semibold text-white">Taux de complétion & signature</p>
                  <div className="flex items-center gap-3">
                    {[
                      { color: TREND_COLORS.completion, label: 'Complétion' },
                      { color: TREND_COLORS.signature,  label: 'Signature' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className="w-3 h-1.5 rounded-full" style={{ background: color }}/>
                        <span className="text-xs text-white/30">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <MultiYearLineChart
                  data={recentTrends}
                  keys={['completion_rate', 'signature_rate']}
                  labels={['Complétion (%)', 'Signature (%)']}
                  height={130}/>
              </div>

              {/* Distribution ratings multi-années (empilé) */}
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm font-semibold text-white mb-3">Répartition des évaluations par année</p>
                <div className="space-y-2">
                  {recentTrends.map(t => {
                    const total = (t.rating_excellent || 0) + (t.rating_bien || 0) +
                                  (t.rating_satisfaisant || 0) + (t.rating_a_ameliorer || 0) +
                                  (t.rating_insuffisant || 0)
                    if (!total) return null
                    return (
                      <div key={t.year} className="flex items-center gap-3">
                        <span className="text-xs text-white/40 w-10 flex-shrink-0">{t.year}</span>
                        <div className="flex-1 h-5 rounded-md overflow-hidden flex">
                          {[
                            { key: 'rating_excellent',    color: '#10B981' },
                            { key: 'rating_bien',         color: '#3B82F6' },
                            { key: 'rating_satisfaisant', color: '#F59E0B' },
                            { key: 'rating_a_ameliorer',  color: '#F97316' },
                            { key: 'rating_insuffisant',  color: '#EF4444' },
                          ].map(({ key, color }) => {
                            const pct = total ? (t[key] || 0) / total * 100 : 0
                            if (!pct) return null
                            return (
                              <div key={key} title={`${OVERALL_RATING_LABELS[key.replace('rating_', '')]}: ${Math.round(pct)}%`}
                                style={{ width: `${pct}%`, background: color }}/>
                            )
                          })}
                        </div>
                        <span className="text-xs text-white/30 w-10 flex-shrink-0 text-right">{total}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Légende */}
                <div className="flex flex-wrap gap-3 mt-3 pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { label: 'Excellent',    color: '#10B981' },
                    { label: 'Bien',         color: '#3B82F6' },
                    { label: 'Satisfaisant', color: '#F59E0B' },
                    { label: 'À améliorer',  color: '#F97316' },
                    { label: 'Insuffisant',  color: '#EF4444' },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm" style={{ background: color }}/>
                      <span className="text-xs text-white/35">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tableau récapitulatif */}
              {recentTrends.length > 0 && (
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="grid grid-cols-5 text-xs text-white/30 px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>Année</span>
                    <span className="text-center">Entretiens</span>
                    <span className="text-center">Complétion</span>
                    <span className="text-center">Score moy.</span>
                    <span className="text-center">Top perf.</span>
                  </div>
                  {recentTrends.map((t, i) => (
                    <div key={t.year}
                      className="grid grid-cols-5 items-center px-4 py-2.5 text-sm"
                      style={{
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        borderBottom: i < recentTrends.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                      <span className="font-semibold text-white">{t.year}</span>
                      <span className="text-center text-white/60">{t.total_reviews ?? '—'}</span>
                      <span className="text-center" style={{ color: (t.completion_rate ?? 0) >= 80 ? '#10B981' : '#F59E0B' }}>
                        {t.completion_rate != null ? `${t.completion_rate}%` : '—'}
                      </span>
                      <span className="text-center font-medium"
                        style={{ color: scoreToTextColor(t.avg_rating_score) }}>
                        {formatScore(t.avg_rating_score)}
                      </span>
                      <span className="text-center text-white/60">
                        {computeTopPerformerPct(t) != null ? `${computeTopPerformerPct(t)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Comparaison inter-campagnes ────────────────── */}
          {section === 'comparaison' && (
            <div className="space-y-4">
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider">
                Comparer deux campagnes
              </p>
              {campaigns.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Calendar size={32} className="text-white/10"/>
                  <p className="text-sm text-white/30">Au moins deux campagnes sont nécessaires</p>
                </div>
              ) : (
                <CampaignComparator campaigns={campaigns}/>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
