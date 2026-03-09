// ============================================================
// APEX RH — src/pages/intelligence/AnalyticsPredictifs.jsx
// Session 46 — Analytics Prédictifs Avancés
// 3 sections : Corrélations | Tendances | Patterns détectés
// Graphiques SVG inline (pas de dépendance recharts)
// ============================================================
import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, Zap, AlertTriangle,
  Info, GitBranch, BarChart2, Activity, Users, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useCorrelationData, useTrendData, useTeamTrendData, useDailyPatterns,
  pearsonCorrelation, correlationLabel, NITA_DIMS, PULSE_DIMS,
} from '../../hooks/usePredictiveAnalytics'
import { monthKeyToLabel } from '../../hooks/useAnalytics'
import { ROLES } from '../../utils/constants'

// ─── Animations ───────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }

// ─── Skeleton ─────────────────────────────────────────────────
function Sk({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
}

// ─── Axes & helpers SVG ───────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ─── COMPOSANT : Multi-line Trend Chart ──────────────────────
function TrendChart({ seriesData, monthKeys, lines, title, height = 180 }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const svgRef = useRef(null)
  const W = 100   // viewBox units (%)
  const H = height

  if (!seriesData?.length || !monthKeys?.length) {
    return (
      <div className="flex items-center justify-center h-32 text-white/20 text-sm">
        Aucune donnée disponible
      </div>
    )
  }

  const PAD = { top: 10, right: 8, bottom: 28, left: 30 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  // Valeurs globales min/max pour normalisation
  const allVals = lines.flatMap(l =>
    seriesData.map(d => d[l.key]).filter(v => v != null)
  )
  const minV = allVals.length ? Math.floor(Math.min(...allVals) / 10) * 10 : 0
  const maxV = allVals.length ? Math.ceil(Math.max(...allVals) / 10) * 10 : 100

  const xOf = i => PAD.left + (i / Math.max(seriesData.length - 1, 1)) * plotW
  const yOf = v => {
    if (v == null) return null
    return PAD.top + plotH - ((clamp(v, minV, maxV) - minV) / (maxV - minV)) * plotH
  }

  const buildPath = key => {
    const pts = seriesData
      .map((d, i) => ({ x: xOf(i), y: yOf(d[key]) }))
      .filter(p => p.y !== null)
    if (pts.length < 2) return null
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  }

  const buildArea = key => {
    const pts = seriesData
      .map((d, i) => ({ x: xOf(i), y: yOf(d[key]) }))
      .filter(p => p.y !== null)
    if (pts.length < 2) return null
    const base = PAD.top + plotH
    return [
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
      `L${pts[pts.length - 1].x.toFixed(2)},${base}`,
      `L${pts[0].x.toFixed(2)},${base}`,
      'Z',
    ].join(' ')
  }

  const gridYs = [0, 25, 50, 75, 100]
    .filter(v => v >= minV && v <= maxV)
    .map(v => ({ v, y: yOf(v) }))

  return (
    <div className="relative w-full">
      {title && (
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">{title}</p>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={e => {
          const rect = svgRef.current?.getBoundingClientRect()
          if (!rect) return
          const relX = (e.clientX - rect.left) / rect.width * W
          const step = plotW / Math.max(seriesData.length - 1, 1)
          const idx = Math.round((relX - PAD.left) / step)
          setHoverIdx(clamp(idx, 0, seriesData.length - 1))
        }}
      >
        <defs>
          {lines.map(l => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={l.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid Y */}
        {gridYs.map(({ v, y }) => (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <text x={PAD.left - 2} y={y} textAnchor="end" dominantBaseline="middle"
              style={{ fontSize: 3, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
              {v}
            </text>
          </g>
        ))}

        {/* X labels */}
        {monthKeys.map((m, i) => (
          <text key={m} x={xOf(i)} y={PAD.top + plotH + 8}
            textAnchor="middle"
            style={{ fontSize: 3.2, fill: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif' }}>
            {monthKeyToLabel(m)}
          </text>
        ))}

        {/* Areas */}
        {lines.map(l => {
          const area = buildArea(l.key)
          return area ? (
            <path key={`area-${l.key}`} d={area} fill={`url(#grad-${l.key})`} />
          ) : null
        })}

        {/* Lines */}
        {lines.map(l => {
          const d = buildPath(l.key)
          return d ? (
            <path key={`line-${l.key}`} d={d}
              fill="none" stroke={l.color} strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 2px ${l.color}55)` }} />
          ) : null
        })}

        {/* Dots */}
        {lines.map(l =>
          seriesData.map((d, i) => {
            const y = yOf(d[l.key])
            if (y === null) return null
            return (
              <circle key={`dot-${l.key}-${i}`}
                cx={xOf(i)} cy={y} r="1.5"
                fill={hoverIdx === i ? l.color : 'transparent'}
                stroke={l.color} strokeWidth="0.8"
                style={{ transition: 'r 0.1s' }} />
            )
          })
        )}

        {/* Hover line */}
        {hoverIdx !== null && (
          <line
            x1={xOf(hoverIdx)} y1={PAD.top}
            x2={xOf(hoverIdx)} y2={PAD.top + plotH}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="2,2" />
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverIdx !== null && seriesData[hoverIdx] && (
        <div className="absolute top-0 right-0 rounded-xl px-3 py-2 text-[10px] space-y-1 pointer-events-none"
          style={{ background: 'rgba(10,10,20,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="font-semibold text-white/60 mb-1">{monthKeyToLabel(monthKeys[hoverIdx])}</p>
          {lines.map(l => {
            const val = seriesData[hoverIdx][l.key]
            return (
              <div key={l.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: l.color }} />
                <span style={{ color: l.color }}>{l.label}</span>
                <span className="text-white font-bold ml-1">
                  {val != null ? `${val}/100` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-3 mt-3">
        {lines.map(l => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded" style={{ background: l.color }} />
            <span className="text-[10px]" style={{ color: l.color }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── COMPOSANT : Scatter Plot Corrélation ────────────────────
function ScatterPlot({ points, xKey, yKey, xLabel, yLabel, xColor, yColor }) {
  const [hovered, setHovered] = useState(null)

  const validPts = points.filter(p => p[xKey] != null && p[yKey] != null)
  if (!validPts.length) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20 text-sm">
        Données insuffisantes pour ce graphique
      </div>
    )
  }

  const W = 200, H = 160
  const PAD = { top: 10, right: 10, bottom: 24, left: 28 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const xs = validPts.map(p => p[xKey])
  const ys = validPts.map(p => p[yKey])
  const minX = Math.floor(Math.min(...xs) / 10) * 10
  const maxX = Math.ceil(Math.max(...xs)  / 10) * 10
  const minY = Math.floor(Math.min(...ys) / 10) * 10
  const maxY = Math.ceil(Math.max(...ys)  / 10) * 10

  const px = v => PAD.left + ((v - minX) / (maxX - minX || 1)) * plotW
  const py = v => PAD.top  + plotH - ((v - minY) / (maxY - minY || 1)) * plotH

  // Ligne de régression
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  const slope = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) /
    (xs.reduce((s, x) => s + (x - meanX) ** 2, 0) || 1)
  const intercept = meanY - slope * meanX
  const rx1 = minX, ry1 = slope * rx1 + intercept
  const rx2 = maxX, ry2 = slope * rx2 + intercept
  const r = pearsonCorrelation(xs, ys)
  const cl = correlationLabel(r)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: H * 1.8 }}>
        <defs>
          <linearGradient id="reg-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={xColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={yColor} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[minX + (maxX - minX) * 0.25, minX + (maxX - minX) * 0.5, minX + (maxX - minX) * 0.75].map(v => (
          <g key={`gx-${v}`}>
            <line x1={px(v)} y1={PAD.top} x2={px(v)} y2={PAD.top + plotH}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={px(v)} y={PAD.top + plotH + 8} textAnchor="middle"
              style={{ fontSize: 3, fill: 'rgba(255,255,255,0.2)' }}>{Math.round(v)}</text>
          </g>
        ))}
        {[minY + (maxY - minY) * 0.25, minY + (maxY - minY) * 0.5, minY + (maxY - minY) * 0.75].map(v => (
          <g key={`gy-${v}`}>
            <line x1={PAD.left} y1={py(v)} x2={PAD.left + plotW} y2={py(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={PAD.left - 2} y={py(v)} textAnchor="end" dominantBaseline="middle"
              style={{ fontSize: 3, fill: 'rgba(255,255,255,0.2)' }}>{Math.round(v)}</text>
          </g>
        ))}

        {/* Axes labels */}
        <text x={PAD.left + plotW / 2} y={H - 1} textAnchor="middle"
          style={{ fontSize: 3.5, fill: xColor, fontWeight: 'bold' }}>{xLabel}</text>
        <text x={4} y={PAD.top + plotH / 2}
          transform={`rotate(-90, 4, ${PAD.top + plotH / 2})`}
          textAnchor="middle" style={{ fontSize: 3.5, fill: yColor, fontWeight: 'bold' }}>{yLabel}</text>

        {/* Regression line */}
        <line x1={px(rx1)} y1={py(ry1)} x2={px(rx2)} y2={py(ry2)}
          stroke="url(#reg-grad)" strokeWidth="0.8" strokeDasharray="2,1.5" opacity="0.6" />

        {/* Points */}
        {validPts.map((p, i) => (
          <g key={i}>
            <circle cx={px(p[xKey])} cy={py(p[yKey])} r="2.5"
              fill={`${xColor}55`} stroke={xColor} strokeWidth="0.6"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              style={{ filter: hovered?.userId === p.userId ? `drop-shadow(0 0 3px ${xColor})` : 'none' }}
            />
          </g>
        ))}
      </svg>

      {/* Correlation badge */}
      <div className="absolute top-1 right-1 flex items-center gap-1.5 rounded-lg px-2 py-1"
        style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${cl.color}40` }}>
        <span className="text-[10px] font-bold" style={{ color: cl.color }}>r = {r?.toFixed(2) ?? '—'}</span>
        <span className="text-[10px]" style={{ color: cl.color }}>{cl.label}</span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-xl px-3 py-2 text-[10px] z-10 pointer-events-none"
          style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 120 }}>
          <p className="font-bold text-white">{hovered.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>{hovered.service}</p>
          <div className="flex gap-3 mt-1.5">
            <div>
              <span style={{ color: xColor }}>{xLabel}</span>
              <span className="text-white font-bold ml-1">{hovered[xKey]}</span>
            </div>
            <div>
              <span style={{ color: yColor }}>{yLabel}</span>
              <span className="text-white font-bold ml-1">{hovered[yKey]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMPOSANT : Matrice de corrélation ──────────────────────
function CorrelationMatrix({ correlations }) {
  const cells = [
    { key: 'nitaVsPulse',  xLabel: 'NITA',      yLabel: 'PULSE',   color: '#4F46E5' },
    { key: 'nitaVsF360',   xLabel: 'NITA',      yLabel: 'F360',    color: '#8B5CF6' },
    { key: 'pulseVsF360',  xLabel: 'PULSE',     yLabel: 'F360',    color: '#3B82F6' },
    { key: 'resVsPulse',   xLabel: 'Résilience', yLabel: 'PULSE',   color: '#F59E0B' },
    { key: 'relVsPulse',   xLabel: 'Fiabilité',  yLabel: 'PULSE',   color: '#10B981' },
    { key: 'endVsPulse',   xLabel: 'Endurance',  yLabel: 'PULSE',   color: '#3B82F6' },
    { key: 'resVsF360',    xLabel: 'Résilience', yLabel: 'F360',    color: '#F59E0B' },
    { key: 'relVsF360',    xLabel: 'Fiabilité',  yLabel: 'F360',    color: '#10B981' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cells.map(cell => {
        const data = correlations?.[cell.key]
        const r  = data?.r ?? null
        const n  = data?.n ?? 0
        const cl = correlationLabel(r)
        return (
          <motion.div key={cell.key} variants={fadeUp}
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${cl.color}30` }}>
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${cell.color}20`, color: cell.color }}>
                {cell.xLabel}
              </span>
              <span className="text-[9px] text-white/30">↔</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                {cell.yLabel}
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums" style={{ color: cl.color }}>
              {r != null ? r.toFixed(2) : '—'}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: cl.color }}>{cl.label}</p>
            <p className="text-[8px] text-white/20 mt-1">{n} paires</p>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── COMPOSANT : Badge Pattern ────────────────────────────────
function PatternBadge({ pattern }) {
  const severityStyle = {
    high:     { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)' },
    medium:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
    positive: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
    info:     { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)' },
    warning:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  }

  const IconMap = {
    trending_down: TrendingDown,
    trending_up:   TrendingUp,
    alert:         AlertTriangle,
    minus:         Minus,
    zap:           Zap,
  }
  const Icon = IconMap[pattern.icon] || Activity
  const s = severityStyle[pattern.severity] || severityStyle.info

  return (
    <motion.div variants={fadeUp}
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${pattern.color}20` }}>
        <Icon size={14} style={{ color: pattern.color }} />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{pattern.label}</p>
        <p className="text-[11px] text-white/40 mt-0.5">{pattern.detail}</p>
      </div>
      <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: `${pattern.color}20`, color: pattern.color, border: `1px solid ${pattern.color}30` }}>
        {pattern.type === 'decline'    ? 'BAISSE'
          : pattern.type === 'progress' ? 'PROGRESSION'
          : pattern.type === 'anomaly'  ? 'ANOMALIE'
          : pattern.type === 'stagnation' ? 'STAGNATION'
          : 'PIC'}
      </span>
    </motion.div>
  )
}

// ─── COMPOSANT : Sélecteur de période ────────────────────────
function PeriodSelector({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl overflow-hidden flex-shrink-0"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className="px-3 py-1.5 text-xs font-medium transition-all"
          style={value === o.value
            ? { background: 'rgba(79,70,229,0.2)', color: '#818CF8' }
            : { background: 'transparent', color: 'rgba(255,255,255,0.35)' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────

const SECTIONS = [
  { id: 'correlations', label: 'Corrélations',   icon: GitBranch },
  { id: 'tendances',    label: 'Tendances',       icon: BarChart2 },
  { id: 'patterns',     label: 'Patterns',        icon: Activity  },
]

export default function AnalyticsPredictifs() {
  const { profile } = useAuth()
  const isManager = [ROLES.CHEF_SERVICE,ROLES.CHEF_DIVISION,ROLES.DIRECTEUR,ROLES.ADMINISTRATEUR]
    .includes(profile?.role)

  const [section, setSection] = useState('correlations')
  const [corrMonths, setCorrMonths]   = useState(6)
  const [trendMonths, setTrendMonths] = useState(6)
  const [trendView, setTrendView]     = useState('personal')
  const [activeLines, setActiveLines] = useState({
    resilience: true, reliability: true, endurance: true, pulse: true,
  })

  const { data: corrData, isLoading: corrLoading } = useCorrelationData(corrMonths)
  const { data: trendData,     isLoading: trendLoading }     = useTrendData(trendMonths)
  const { data: teamTrendData, isLoading: teamTrendLoading } = useTeamTrendData(trendMonths)
  const { data: dailyPatterns = [], isLoading: patternsLoading } = useDailyPatterns(30)

  // Combiner les patterns : quotidiens + tendances mensuelles
  const allPatterns = useMemo(() => {
    const tp = trendData?.patterns || []
    const combined = [...dailyPatterns, ...tp]
    // Dédupliquer par type+label
    const seen = new Set()
    return combined.filter(p => {
      const key = `${p.type}__${p.label}`
      if (seen.has(key)) return false
      seen.add(key); return true
    })
  }, [dailyPatterns, trendData])

  const LINES_CONFIG = [
    { key: 'resilience',  label: 'Résilience NITA',  color: '#F59E0B' },
    { key: 'reliability', label: 'Fiabilité NITA',   color: '#10B981' },
    { key: 'endurance',   label: 'Endurance NITA',   color: '#3B82F6' },
    { key: 'pulse',       label: 'PULSE Total',       color: '#8B5CF6' },
  ]

  const visibleLines = LINES_CONFIG.filter(l => activeLines[l.key])

  const currentTrend = trendView === 'personal' ? trendData : teamTrendData
  const currentLoading = trendView === 'personal' ? trendLoading : teamTrendLoading

  const correlationPoints = corrData?.points || []
  const correlations      = corrData?.correlations || {}

  return (
    <motion.div className="p-6 space-y-6 max-w-5xl mx-auto"
      variants={stagger} initial="hidden" animate="visible">

      {/* En-tête */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
            Analytics Prédictifs
          </h2>
          <p className="text-xs text-white/30 mt-0.5">
            Corrélations NITA ↔ PULSE ↔ F360 · Tendances · Détection de patterns
          </p>
        </div>
        {/* Badge S46 */}
        <span className="text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(79,70,229,0.15)', color: '#818CF8', border: '1px solid rgba(79,70,229,0.3)' }}>
          S46 NOUVEAU
        </span>
      </motion.div>

      {/* Onglets sections */}
      <motion.div variants={fadeUp} className="flex gap-1 rounded-2xl p-1"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {SECTIONS.map(s => {
          const Icon = s.icon
          const active = section === s.id
          // Compteur patterns
          const badge = s.id === 'patterns' && allPatterns.length > 0
            ? allPatterns.length : null
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all relative"
              style={active
                ? { background: 'rgba(79,70,229,0.15)', color: '#818CF8', border: '1px solid rgba(79,70,229,0.2)' }
                : { color: 'rgba(255,255,255,0.3)' }}>
              <Icon size={13} />
              <span className="hidden sm:inline">{s.label}</span>
              {badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-bold"
                  style={{ background: '#EF4444', color: 'white' }}>{badge}</span>
              )}
            </button>
          )
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── SECTION CORRÉLATIONS ──────────────────────────── */}
        {section === 'correlations' && (
          <motion.div key="correlations" variants={stagger} initial="hidden" animate="visible"
            exit={{ opacity: 0 }} className="space-y-6">

            {/* Contrôles */}
            <motion.div variants={fadeUp} className="flex items-center justify-between">
              <p className="text-xs text-white/40 uppercase tracking-wider">Matrice de corrélation</p>
              <PeriodSelector
                value={corrMonths}
                onChange={setCorrMonths}
                options={[{ value: 3, label: '3 mois' }, { value: 6, label: '6 mois' }, { value: 12, label: '12 mois' }]}
              />
            </motion.div>

            {/* Matrice */}
            {corrLoading ? (
              <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-24" />)}
              </motion.div>
            ) : (
              <CorrelationMatrix correlations={correlations} />
            )}

            {/* Explication */}
            <motion.div variants={fadeUp}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Info size={12} style={{ color: '#8B5CF6' }} />
                <p className="text-xs font-semibold text-white/40">Comment lire les corrélations</p>
              </div>
              <p className="text-[11px] text-white/25 leading-relaxed">
                Le coefficient r (Pearson) mesure la relation linéaire entre deux dimensions.
                <span className="text-emerald-400/60 font-semibold"> r &gt; 0.7 = forte corrélation positive</span> (les deux progressent ensemble),
                <span className="text-red-400/60 font-semibold"> r &lt; -0.4 = corrélation inverse</span> (l'un monte quand l'autre baisse),
                <span className="text-gray-400/60"> |r| &lt; 0.2 = pas de relation significative.</span>
                Calculé sur {corrData?.points?.length ?? 0} paires observateur/mois.
              </p>
            </motion.div>

            {/* Scatter plots principaux */}
            {correlationPoints.length > 0 && (
              <>
                <motion.div variants={fadeUp}>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Nuages de points</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-semibold text-white/60 mb-3">NITA ↔ PULSE</p>
                      <ScatterPlot
                        points={correlationPoints}
                        xKey="nitaAvg" yKey="pulseTotal"
                        xLabel="NITA" yLabel="PULSE"
                        xColor="#F59E0B" yColor="#4F46E5"
                      />
                    </div>
                    <div className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-semibold text-white/60 mb-3">NITA ↔ F360</p>
                      <ScatterPlot
                        points={correlationPoints}
                        xKey="nitaAvg" yKey="f360avg"
                        xLabel="NITA" yLabel="F360"
                        xColor="#F59E0B" yColor="#06B6D4"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { xKey: 'nitaRes', yKey: 'pulseTotal',    xLabel: 'Résilience', yLabel: 'PULSE', xColor: '#F59E0B', yColor: '#4F46E5', title: 'Résilience ↔ PULSE' },
                      { xKey: 'nitaRel', yKey: 'pulseTotal',    xLabel: 'Fiabilité',  yLabel: 'PULSE', xColor: '#10B981', yColor: '#4F46E5', title: 'Fiabilité ↔ PULSE' },
                      { xKey: 'nitaEnd', yKey: 'pulseDelivery', xLabel: 'Endurance',  yLabel: 'Delivery', xColor: '#3B82F6', yColor: '#8B5CF6', title: 'Endurance ↔ Delivery' },
                    ].map(p => (
                      <div key={p.title} className="rounded-2xl p-4"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-xs font-semibold text-white/60 mb-3">{p.title}</p>
                        <ScatterPlot points={correlationPoints} {...p} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}

            {!corrLoading && !correlationPoints.length && (
              <motion.div variants={fadeUp}
                className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <GitBranch size={28} className="mx-auto mb-3 opacity-20" style={{ color: '#8B5CF6' }} />
                <p className="text-sm text-white/30">Données insuffisantes pour les graphiques de corrélation</p>
                <p className="text-xs text-white/20 mt-1">Les scores NITA, PULSE et F360 doivent être alimentés sur plusieurs mois</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── SECTION TENDANCES ─────────────────────────────── */}
        {section === 'tendances' && (
          <motion.div key="tendances" variants={stagger} initial="hidden" animate="visible"
            exit={{ opacity: 0 }} className="space-y-6">

            {/* Contrôles */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isManager && (
                  <div className="flex rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {[{ id: 'personal', label: 'Personnel', icon: Activity }, { id: 'team', label: 'Équipe', icon: Users }]
                      .map(v => (
                        <button key={v.id} onClick={() => setTrendView(v.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                          style={trendView === v.id
                            ? { background: 'rgba(79,70,229,0.2)', color: '#818CF8' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.35)' }}>
                          <v.icon size={11} /> {v.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <PeriodSelector
                value={trendMonths}
                onChange={setTrendMonths}
                options={[{ value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '12M' }]}
              />
            </motion.div>

            {/* Toggle dimensions */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
              {LINES_CONFIG.map(l => (
                <button key={l.key}
                  onClick={() => setActiveLines(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={activeLines[l.key]
                    ? { background: `${l.color}18`, color: l.color, border: `1px solid ${l.color}40` }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: activeLines[l.key] ? l.color : 'rgba(255,255,255,0.2)' }} />
                  {l.label}
                </button>
              ))}
            </motion.div>

            {/* Chart principal */}
            <motion.div variants={fadeUp}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {currentLoading ? (
                <Sk className="h-44 w-full" />
              ) : (
                <TrendChart
                  seriesData={currentTrend?.seriesData || []}
                  monthKeys={currentTrend?.monthKeys || []}
                  lines={visibleLines}
                  title={`Évolution ${trendView === 'personal' ? 'personnelle' : 'équipe'} — ${trendMonths} derniers mois`}
                  height={180}
                />
              )}
            </motion.div>

            {/* Comparaison NITA vs PULSE (dual chart) */}
            {!currentLoading && (currentTrend?.seriesData?.length ?? 0) > 1 && (
              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <TrendChart
                    seriesData={currentTrend?.seriesData || []}
                    monthKeys={currentTrend?.monthKeys || []}
                    lines={[
                      { key: 'resilience',  label: 'Résilience',  color: '#F59E0B' },
                      { key: 'reliability', label: 'Fiabilité',   color: '#10B981' },
                      { key: 'endurance',   label: 'Endurance',   color: '#3B82F6' },
                    ]}
                    title="Scores NITA"
                    height={130}
                  />
                </div>
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <TrendChart
                    seriesData={currentTrend?.seriesData || []}
                    monthKeys={currentTrend?.monthKeys || []}
                    lines={[
                      { key: 'pulse',    label: 'PULSE Total', color: '#8B5CF6' },
                      { key: 'delivery', label: 'Delivery',    color: '#4F46E5' },
                      { key: 'quality',  label: 'Qualité',     color: '#EC4899' },
                    ]}
                    title="Scores PULSE"
                    height={130}
                  />
                </div>
              </motion.div>
            )}

            {!currentLoading && !currentTrend?.seriesData?.length && (
              <motion.div variants={fadeUp}
                className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <BarChart2 size={28} className="mx-auto mb-3 opacity-20" style={{ color: '#8B5CF6' }} />
                <p className="text-sm text-white/30">Aucune donnée de tendance disponible</p>
                <p className="text-xs text-white/20 mt-1">Les scores NITA et PULSE se cumulent au fil des mois</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── SECTION PATTERNS ──────────────────────────────── */}
        {section === 'patterns' && (
          <motion.div key="patterns" variants={stagger} initial="hidden" animate="visible"
            exit={{ opacity: 0 }} className="space-y-6">

            {/* KPI patterns */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Baisses détectées',    count: allPatterns.filter(p => p.type === 'decline').length,    color: '#EF4444' },
                { label: 'Progressions',          count: allPatterns.filter(p => p.type === 'progress').length,   color: '#10B981' },
                { label: 'Anomalies',             count: allPatterns.filter(p => p.type === 'anomaly').length,    color: '#8B5CF6' },
                { label: 'Stagnations / Pics',    count: allPatterns.filter(p => ['stagnation','spike'].includes(p.type)).length, color: '#6B7280' },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-3 text-center"
                  style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
                  <p className="text-2xl font-bold" style={{ color: k.color }}>{k.count}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{k.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Liste patterns */}
            {patternsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-16" />)}
              </div>
            ) : allPatterns.length > 0 ? (
              <motion.div variants={stagger} className="space-y-3">
                {/* Priorité : high → positive → medium → info → warning */}
                {[...allPatterns]
                  .sort((a, b) => {
                    const order = { high: 0, positive: 1, medium: 2, warning: 3, info: 4 }
                    return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
                  })
                  .map((p, i) => <PatternBadge key={i} pattern={p} />)
                }
              </motion.div>
            ) : (
              <motion.div variants={fadeUp}
                className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Activity size={28} className="mx-auto mb-3 opacity-20" style={{ color: '#10B981' }} />
                <p className="text-sm font-semibold text-white/40">Aucun pattern détecté</p>
                <p className="text-xs text-white/20 mt-1">
                  La détection nécessite au moins 4 périodes de données NITA et PULSE
                </p>
              </motion.div>
            )}

            {/* Légende algorithme */}
            <motion.div variants={fadeUp}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Info size={12} style={{ color: '#8B5CF6' }} />
                <p className="text-xs font-semibold text-white/40">Algorithme de détection</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-white/25 leading-relaxed">
                <div>
                  <span className="text-red-400/70 font-semibold">Baisse progressive : </span>
                  4 périodes consécutives à la baisse, amplitude ≥ 8 pts.
                </div>
                <div>
                  <span className="text-emerald-400/70 font-semibold">Progression : </span>
                  4 périodes consécutives en hausse, amplitude ≥ 8 pts.
                </div>
                <div>
                  <span className="text-purple-400/70 font-semibold">Anomalie : </span>
                  Score à plus de 1,8 écart-types de la moyenne (Z-score).
                </div>
                <div>
                  <span className="text-gray-400/70 font-semibold">Stagnation : </span>
                  Écart-type &lt; 3 pts, score moyen &lt; 55 sur ≥ 5 périodes.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
