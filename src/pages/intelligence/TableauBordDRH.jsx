// ============================================================
// APEX RH — src/pages/intelligence/TableauBordDRH.jsx
// Session 47 — Tableau de Bord DRH
// Vue consolidée stratégique : KPIs globaux, matrice divisions,
// graphiques tendances, alertes DRH, export Excel
// Accès : adminOnly (isAdmin || isDirecteur)
// Graphiques : SVG pur (cohérence avec S46)
// ============================================================
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  BarChart2, Activity, Users, Shield, Download,
  ChevronDown, ChevronRight, Zap, Eye, RefreshCw,
  CheckCircle, XCircle, Clock, Target,
} from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import {
  useDRHGlobalKPIs,
  useDivisionMatrix,
  useDRHTrends,
  useDRHAlerts,
  useDRHTopFlop,
} from '../../hooks/useDRHDashboard'
import { monthKeyToLabel } from '../../hooks/useAnalytics'
import { exportDRHDashboard } from '../../lib/exportExcel'

// ─── Animations ───────────────────────────────────────────────
const fadeUp  = { hidden:{opacity:0,y:10}, visible:{opacity:1,y:0,transition:{duration:0.28}} }
const stagger = { hidden:{}, visible:{transition:{staggerChildren:0.07}} }

// ─── Skeleton ────────────────────────────────────────────────
function Sk({ className='' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`}/>
}

// ─── Risk badge ───────────────────────────────────────────────
function RiskBadge({ level }) {
  const cfg = {
    critical: { label:'Critique',  bg:'rgba(239,68,68,0.15)',    color:'#EF4444', dot:'#EF4444' },
    high:     { label:'Élevé',     bg:'rgba(245,158,11,0.15)',   color:'#F59E0B', dot:'#F59E0B' },
    medium:   { label:'Modéré',    bg:'rgba(251,191,36,0.12)',   color:'#FBB924', dot:'#FBB924' },
    ok:       { label:'OK',        bg:'rgba(16,185,129,0.12)',   color:'#10B981', dot:'#10B981' },
  }[level] || { label:'—', bg:'rgba(107,114,128,0.1)', color:'#6B7280', dot:'#6B7280' }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background:cfg.bg, color:cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background:cfg.dot }}/>
      {cfg.label}
    </span>
  )
}

// ─── Score pill ───────────────────────────────────────────────
function ScorePill({ value, size='sm' }) {
  if (value === null || value === undefined)
    return <span className="text-white/20 text-xs">—</span>
  const color = value >= 75 ? '#10B981' : value >= 60 ? '#34D399' : value >= 50 ? '#F59E0B' : value >= 35 ? '#F97316' : '#EF4444'
  const textSz = size === 'lg' ? 'text-2xl font-bold' : 'text-sm font-semibold'
  return <span className={textSz} style={{ color }}>{value}</span>
}

// ─── Delta arrow ─────────────────────────────────────────────
function Delta({ cur, prev, compact=false }) {
  if (cur === null || prev === null || cur === undefined || prev === undefined)
    return <span className="text-white/20 text-xs">—</span>
  const d = cur - prev
  if (Math.abs(d) < 1) return <span className="text-white/30 text-xs flex items-center gap-0.5"><Minus size={10}/>{compact ? '' : 'stable'}</span>
  const color = d > 0 ? '#10B981' : '#EF4444'
  const Icon  = d > 0 ? TrendingUp : TrendingDown
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color }}>
      <Icon size={11}/>
      {d > 0 ? '+' : ''}{d} pts
    </span>
  )
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, delta, prevVal, color, isLoading }) {
  return (
    <motion.div variants={fadeUp}
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute inset-0 opacity-[0.04] rounded-2xl"
        style={{ background:`radial-gradient(circle at 80% 20%, ${color}, transparent 65%)` }}/>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background:`rgba(${hexToRgb(color)},0.12)`, border:`1px solid rgba(${hexToRgb(color)},0.2)` }}>
          <Icon size={15} style={{ color }}/>
        </div>
        {isLoading
          ? <Sk className="w-16 h-4"/>
          : <Delta cur={value} prev={prevVal}/>
        }
      </div>
      {isLoading
        ? <Sk className="w-20 h-8"/>
        : <div>
            <div className="text-3xl font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
              {value ?? '—'}
              {value !== null && value !== undefined && <span className="text-lg text-white/30 font-normal">/100</span>}
            </div>
            <div className="text-xs text-white/40 mt-1">{label}</div>
            {sub && <div className="text-xs text-white/25 mt-0.5">{sub}</div>}
          </div>
      }
    </motion.div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

// ─── Multi-line SVG Trend Chart ───────────────────────────────
const DIVISION_COLORS = [
  '#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444',
  '#EC4899','#06B6D4','#84CC16','#F97316','#A78BFA',
]

function MultiLineTrendChart({ series, monthKeys, metric='pulse', height=200, maxDivisions=6 }) {
  const [hoveredDiv, setHoveredDiv] = useState(null)
  const [hoverIdx, setHoverIdx]     = useState(null)
  const svgRef = useRef(null)

  const activeSeries = series.slice(0, maxDivisions)

  if (!activeSeries.length || !monthKeys.length) {
    return <div className="flex items-center justify-center h-32 text-white/20 text-sm">Aucune donnée disponible</div>
  }

  const W   = 100
  const H   = height
  const PAD = { top:10, right:8, bottom:30, left:32 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top  - PAD.bottom

  const allVals = activeSeries.flatMap(s => s.data.map(d => d[metric])).filter(v => v != null)
  const minV = allVals.length ? Math.floor(Math.min(...allVals) / 10) * 10 : 0
  const maxV = allVals.length ? Math.ceil( Math.max(...allVals) / 10) * 10 : 100

  const xOf = i => PAD.left + (i / Math.max(monthKeys.length - 1, 1)) * plotW
  const yOf = v => {
    if (v == null) return null
    const norm = (Math.max(minV, Math.min(maxV, v)) - minV) / (maxV - minV || 1)
    return PAD.top + plotH - norm * plotH
  }

  const buildPath = (data) => {
    const pts = data
      .map((d, i) => ({ x: xOf(i), y: yOf(d[metric]) }))
      .filter(p => p.y !== null)
    if (pts.length < 2) return null
    return pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  }

  const gridYs = [0, 25, 50, 75, 100]
    .filter(v => v >= minV && v <= maxV)
    .map(v => ({ v, y: yOf(v) }))

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible"
        style={{ height }} preserveAspectRatio="none"
        onMouseLeave={() => { setHoveredDiv(null); setHoverIdx(null) }}>
        <defs>
          {activeSeries.map((s, si) => (
            <linearGradient key={si} id={`drhgrad${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={DIVISION_COLORS[si % DIVISION_COLORS.length]} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={DIVISION_COLORS[si % DIVISION_COLORS.length]} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {gridYs.map(({ v, y }) => (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.4"/>
            <text x={PAD.left - 1.5} y={y + 1.2} textAnchor="end"
              fontSize="3.5" fill="rgba(255,255,255,0.25)">{v}</text>
          </g>
        ))}

        {/* X axis labels */}
        {monthKeys.map((mk, i) => (
          <text key={mk} x={xOf(i)} y={H - PAD.bottom + 7} textAnchor="middle"
            fontSize="3.5" fill="rgba(255,255,255,0.3)">
            {monthKeyToLabel(mk)}
          </text>
        ))}

        {/* Series lines */}
        {activeSeries.map((s, si) => {
          const color = DIVISION_COLORS[si % DIVISION_COLORS.length]
          const path  = buildPath(s.data)
          const isFaded = hoveredDiv !== null && hoveredDiv !== s.id
          if (!path) return null
          return (
            <g key={s.id} style={{ cursor:'pointer' }}
              onMouseEnter={() => setHoveredDiv(s.id)}>
              <path d={path} fill="none"
                stroke={color}
                strokeWidth={hoveredDiv === s.id ? 1.2 : 0.7}
                strokeLinecap="round"
                opacity={isFaded ? 0.2 : 1}
                style={{ transition:'opacity 0.2s, stroke-width 0.2s' }}/>
              {/* Dots */}
              {s.data.map((d, i) => {
                const y = yOf(d[metric])
                if (y === null) return null
                return (
                  <circle key={i} cx={xOf(i)} cy={y} r={hoveredDiv === s.id ? 1.2 : 0.7}
                    fill={color} opacity={isFaded ? 0.2 : 0.9}
                    onMouseEnter={() => setHoverIdx(i)}/>
                )
              })}
            </g>
          )
        })}

        {/* Tooltip vertical line */}
        {hoverIdx !== null && (
          <line x1={xOf(hoverIdx)} y1={PAD.top} x2={xOf(hoverIdx)} y2={H-PAD.bottom}
            stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" strokeDasharray="1.5,1.5"/>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {activeSeries.map((s, si) => (
          <button key={s.id}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ color: hoveredDiv === s.id ? DIVISION_COLORS[si % DIVISION_COLORS.length] : 'rgba(255,255,255,0.4)',
                     opacity: hoveredDiv !== null && hoveredDiv !== s.id ? 0.35 : 1 }}
            onMouseEnter={() => setHoveredDiv(s.id)}
            onMouseLeave={() => setHoveredDiv(null)}>
            <span className="w-3 h-0.5 rounded-full" style={{ background: DIVISION_COLORS[si % DIVISION_COLORS.length] }}/>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Bar Chart divisions ──────────────────────────────────────
function DivisionBarChart({ divisions, metric, label, height=180 }) {
  const [hovered, setHovered] = useState(null)
  const sorted = [...divisions]
    .filter(d => d[metric] !== null && d[metric] !== undefined)
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 10)

  if (!sorted.length)
    return <div className="flex items-center justify-center h-24 text-white/20 text-sm">Aucune donnée</div>

  const maxV = Math.max(...sorted.map(d => d[metric]), 1)
  const W    = 100
  const barH = Math.min(height, sorted.length * 22 + 10)
  const barWidth = (v) => (v / maxV) * 75

  return (
    <svg viewBox={`0 0 100 ${barH}`} className="w-full" style={{ height: barH }} preserveAspectRatio="none">
      {sorted.map((d, i) => {
        const y      = i * 22 + 4
        const bw     = barWidth(d[metric] || 0)
        const color  = d[metric] >= 75 ? '#10B981' : d[metric] >= 60 ? '#34D399' : d[metric] >= 50 ? '#F59E0B' : '#EF4444'
        const faded  = hovered !== null && hovered !== d.id
        return (
          <g key={d.id} style={{ cursor:'pointer' }}
            onMouseEnter={() => setHovered(d.id)}
            onMouseLeave={() => setHovered(null)}>
            {/* Bg bar */}
            <rect x={24} y={y+3} width={75} height={12} rx="3" fill="rgba(255,255,255,0.04)"/>
            {/* Value bar */}
            <rect x={24} y={y+3} width={bw} height={12} rx="3"
              fill={color} opacity={faded ? 0.25 : 0.85}
              style={{ transition:'width 0.5s ease, opacity 0.2s' }}/>
            {/* Label */}
            <text x={23} y={y+11} textAnchor="end" fontSize="3.2"
              fill={faded ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)'}
              style={{ transition:'fill 0.2s' }}>
              {d.name?.length > 14 ? d.name.slice(0, 13) + '…' : d.name}
            </text>
            {/* Score */}
            <text x={24 + bw + 1} y={y+11} fontSize="3.5" fill={color}
              opacity={faded ? 0.25 : 1}>
              {d[metric]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Ligne de la matrice divisions ───────────────────────────
function DivisionRow({ div, expanded, onToggle }) {
  return (
    <>
      <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ChevronRight size={13} className={`text-white/30 transition-transform ${expanded ? 'rotate-90' : ''}`}/>
            <span className="text-sm text-white/80 font-medium">{div.name || '—'}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-center"><ScorePill value={div.pulse_cur}/></td>
        <td className="px-4 py-3 text-center">
          <Delta cur={div.pulse_cur} prev={div.pulse_prev} compact/>
        </td>
        <td className="px-4 py-3 text-center"><ScorePill value={div.nita_cur}/></td>
        <td className="px-4 py-3 text-center">
          <Delta cur={div.nita_cur} prev={div.nita_prev} compact/>
        </td>
        <td className="px-4 py-3 text-center">
          {div.f360_rate !== null ? (
            <span className="text-sm font-semibold text-white/70">{div.f360_rate}%</span>
          ) : <span className="text-white/20 text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {div.okr_progress !== null ? (
            <span className="text-sm font-semibold text-white/70">{div.okr_progress}%</span>
          ) : <span className="text-white/20 text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-white/40">{div.nb_agents}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <RiskBadge level={div.riskLevel}/>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={9} className="px-6 pb-3 pt-2">
            <div className="rounded-xl p-4"
              style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-xs text-white/30 mb-1">Delivery PULSE</div>
                  <ScorePill value={div.delivery}/>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Qualité PULSE</div>
                  <ScorePill value={div.quality}/>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Résilience NITA</div>
                  <ScorePill value={div.avg_resilience}/>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Fiabilité NITA</div>
                  <ScorePill value={div.avg_reliability}/>
                </div>
              </div>
              {div.flags && div.flags.length > 0 && (
                <div>
                  <div className="text-xs text-white/30 mb-2">Signaux détectés</div>
                  <div className="flex flex-wrap gap-2">
                    {div.flags.map((f, i) => {
                      const colMap = { high:'rgba(239,68,68,0.15)', medium:'rgba(245,158,11,0.12)', positive:'rgba(16,185,129,0.12)' }
                      const txtMap = { high:'#EF4444', medium:'#F59E0B', positive:'#10B981' }
                      return (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: colMap[f.severity]||'rgba(107,114,128,0.1)', color: txtMap[f.severity]||'#9CA3AF' }}>
                          {f.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Alert card ───────────────────────────────────────────────
function AlertCard({ alert }) {
  const typeConf = {
    baisse:     { icon: TrendingDown, color: '#EF4444', bg: 'rgba(239,68,68,0.08)',    label: 'Déclin' },
    anomalie:   { icon: Zap,          color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',   label: 'Anomalie' },
    stagnation: { icon: Minus,        color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)',   label: 'Stagnation' },
  }[alert.type] || { icon: AlertTriangle, color: '#9CA3AF', bg: 'rgba(107,114,128,0.08)', label: alert.type }
  const Icon = typeConf.icon

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: typeConf.bg, border:`1px solid ${typeConf.color}20` }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background:`${typeConf.color}20` }}>
        <Icon size={13} style={{ color: typeConf.color }}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{alert.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background:`${typeConf.color}20`, color: typeConf.color }}>
            {typeConf.label} {alert.metric}
          </span>
        </div>
        <div className="text-xs text-white/35 mt-0.5">{alert.division} · {alert.service}</div>
        {alert.description && (
          <div className="text-xs text-white/50 mt-1">{alert.description}</div>
        )}
      </div>
    </div>
  )
}

// ─── Top/Flop mini-list ───────────────────────────────────────
function TopFlopList({ items, title, ascending=false, color }) {
  return (
    <div>
      <div className="text-xs text-white/40 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.user_id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg"
            style={{ background:'rgba(255,255,255,0.02)' }}>
            <span className="text-xs text-white/25 w-4">{i+1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/75 truncate">{item.name}</div>
              <div className="text-[10px] text-white/30 truncate">{item.service}</div>
            </div>
            <span className="text-sm font-bold" style={{ color }}>{item.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function TableauBordDRH() {
  const { can } = usePermission()
  const isAdmin = can('intelligence', 'succession', 'admin')
  const isDirecteur = can('intelligence', 'overview', 'read')
  const [trendMetric,  setTrendMetric]  = useState('pulse')
  const [trendMonths,  setTrendMonths]  = useState(6)
  const [expandedDiv,  setExpandedDiv]  = useState(null)
  const [alertsFilter, setAlertsFilter] = useState('all')
  const [exporting,    setExporting]    = useState(false)

  const { data: kpis,      isLoading: kpiLoading }     = useDRHGlobalKPIs()
  const { data: divisions, isLoading: divLoading }      = useDivisionMatrix(3)
  const { data: trends,    isLoading: trendLoading }    = useDRHTrends(trendMonths)
  const { data: alerts=[],  isLoading: alertsLoading }  = useDRHAlerts(30)
  const { data: topFlop,   isLoading: topFlopLoading }  = useDRHTopFlop()

  if (!isAdmin && !isDirecteur) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Shield size={40} className="text-white/20"/>
        <div className="text-white/40 text-center">
          <div className="text-lg font-semibold text-white/60">Accès restreint</div>
          <div className="text-sm mt-1">Le Tableau de Bord DRH est réservé aux Administrateurs et Directeurs.</div>
        </div>
      </div>
    )
  }

  const filteredAlerts = alertsFilter === 'all' ? alerts
    : alerts.filter(a => a.type === alertsFilter)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportDRHDashboard({
        kpis:      kpis || {},
        divisions: divisions || [],
        alerts,
        trends:    trends?.series || [],
        monthKeys: trends?.monthKeys || [],
        topFlop,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.3 }}
        className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
            Tableau de Bord DRH
          </h2>
          <p className="text-xs text-white/30 mt-0.5">
            Vision consolidée · toutes divisions · S47
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>S47</span>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.2)', color:'#A78BFA' }}>
            {exporting
              ? <RefreshCw size={13} className="animate-spin"/>
              : <Download size={13}/>}
            Export Excel
          </button>
        </div>
      </motion.div>

      {/* ── KPIs Bandeau ── */}
      <motion.div variants={stagger} initial="hidden" animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Activity}    label="PULSE Global"    color="#8B5CF6"
          value={kpis?.avg_pulse}     prevVal={kpis?.avg_pulse_prev}
          sub={kpis?.pulse_agents ? `${kpis.pulse_agents} agents mesurés` : null}
          isLoading={kpiLoading}/>
        <KpiCard icon={Zap}         label="NITA Global"     color="#F59E0B"
          value={kpis?.avg_nita}      prevVal={kpis?.avg_nita_prev}
          sub={kpis?.nita_agents ? `${kpis.nita_agents} agents mesurés` : null}
          isLoading={kpiLoading}/>
        <KpiCard icon={Users}       label="F360 Complétion" color="#3B82F6"
          value={kpis?.f360_rate}     prevVal={null}
          sub={kpis?.f360_total ? `${kpis.f360_completed}/${kpis.f360_total} complétés` : null}
          isLoading={kpiLoading}/>
        <KpiCard icon={Target}      label="OKR Progression" color="#10B981"
          value={kpis?.avg_okr_progress} prevVal={null}
          sub={kpis?.total_okr ? `${kpis.total_okr} objectifs actifs` : null}
          isLoading={kpiLoading}/>
        <KpiCard icon={TrendingUp}  label="Engagement"      color="#EC4899"
          value={kpis?.avg_engagement} prevVal={null}
          sub={kpis?.survey_respondents ? `${kpis.survey_respondents} répondants` : null}
          isLoading={kpiLoading}/>
      </motion.div>

      {/* ── Deux colonnes principales ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Graphiques tendances (2/3) ── */}
        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1, duration:0.3 }}
          className="lg:col-span-2 rounded-2xl p-5 space-y-5"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Évolution mensuelle par division</div>
              <div className="text-xs text-white/30">Multi-line · {trendMonths} derniers mois</div>
            </div>
            <div className="flex items-center gap-2">
              {/* Metric toggle */}
              <div className="flex rounded-xl overflow-hidden"
                style={{ border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
                {[{v:'pulse',l:'PULSE'},{v:'nita',l:'NITA'}].map(opt => (
                  <button key={opt.v} onClick={() => setTrendMetric(opt.v)}
                    className="px-3 py-1.5 text-xs font-medium transition-all"
                    style={trendMetric===opt.v
                      ? { background:'rgba(139,92,246,0.2)', color:'#A78BFA' }
                      : { color:'rgba(255,255,255,0.35)' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {/* Month range */}
              <select value={trendMonths} onChange={e => setTrendMonths(+e.target.value)}
                className="text-xs px-2 py-1.5 rounded-xl appearance-none"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }}>
                <option value={3}>3 mois</option>
                <option value={6}>6 mois</option>
                <option value={12}>12 mois</option>
              </select>
            </div>
          </div>
          {trendLoading
            ? <Sk className="w-full h-48"/>
            : <MultiLineTrendChart
                series={trends?.series || []}
                monthKeys={trends?.monthKeys || []}
                metric={trendMetric}
                height={200}/>
          }
        </motion.div>

        {/* ── Alertes DRH (1/3) ── */}
        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.15, duration:0.3 }}
          className="rounded-2xl p-5 flex flex-col"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400"/>
                Alertes DRH
              </div>
              <div className="text-xs text-white/30 mt-0.5">{alerts.length} signal{alerts.length!==1?'s':''} détecté{alerts.length!==1?'s':''}</div>
            </div>
            {alerts.length > 0 && (
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background:'rgba(239,68,68,0.2)', color:'#EF4444' }}>
                {alerts.length}
              </span>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-3">
            {[{v:'all',l:'Tous'},{v:'baisse',l:'Déclin'},{v:'anomalie',l:'Anomalie'},{v:'stagnation',l:'Stagnation'}].map(f => (
              <button key={f.v} onClick={() => setAlertsFilter(f.v)}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full transition-all"
                style={alertsFilter===f.v
                  ? { background:'rgba(245,158,11,0.2)', color:'#F59E0B' }
                  : { background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.3)' }}>
                {f.l}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight:300 }}>
            {alertsLoading
              ? [1,2,3].map(i => <Sk key={i} className="h-14"/>)
              : filteredAlerts.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-8 text-white/20">
                    <CheckCircle size={24} className="mb-2"/>
                    <div className="text-xs">Aucun signal détecté</div>
                  </div>
                )
                : filteredAlerts.map((alert, i) => <AlertCard key={i} alert={alert}/>)
            }
          </div>
        </motion.div>
      </div>

      {/* ── Matrice divisions ── */}
      <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2, duration:0.3 }}
        className="rounded-2xl overflow-hidden"
        style={{ border:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div className="text-sm font-semibold text-white">Matrice par division</div>
            <div className="text-xs text-white/30 mt-0.5">
              {divisions?.length || 0} division{(divisions?.length||0)!==1?'s':''} · cliquer pour détails
            </div>
          </div>
          <BarChart2 size={16} className="text-white/20"/>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                {['Division','PULSE','Δ PULSE','NITA','Δ NITA','F360','OKR','Effectif','Risque'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {divLoading
                ? [1,2,3,4].map(i => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><Sk className="h-5"/></td>
                    ))}
                  </tr>
                ))
                : (divisions || []).map(div => (
                  <DivisionRow
                    key={div.id}
                    div={div}
                    expanded={expandedDiv === div.id}
                    onToggle={() => setExpandedDiv(expandedDiv===div.id ? null : div.id)}/>
                ))
              }
            </tbody>
          </table>
        </div>
        {!divLoading && (!divisions || divisions.length === 0) && (
          <div className="py-10 text-center text-white/20 text-sm">
            Aucune donnée de division disponible
          </div>
        )}
      </motion.div>

      {/* ── Comparatif barres + Top/Flop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Comparatif barres */}
        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.25, duration:0.3 }}
          className="rounded-2xl p-5"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-sm font-semibold text-white mb-1">Comparatif PULSE — Divisions</div>
          <div className="text-xs text-white/30 mb-4">Classement par score moyen (mois courant)</div>
          {divLoading
            ? <Sk className="h-40"/>
            : <DivisionBarChart divisions={divisions||[]} metric="pulse_cur" label="PULSE"/>
          }
        </motion.div>

        {/* Top / Flop agents */}
        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3, duration:0.3 }}
          className="rounded-2xl p-5"
          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-sm font-semibold text-white mb-1">Top / Flop agents</div>
          <div className="text-xs text-white/30 mb-4">PULSE · mois en cours</div>
          {topFlopLoading
            ? <Sk className="h-40"/>
            : (
              <div className="grid grid-cols-2 gap-4">
                <TopFlopList
                  items={topFlop?.pulseTop5 || []}
                  title="🏆 Top 5 PULSE"
                  color="#10B981"/>
                <TopFlopList
                  items={topFlop?.pulseFlop5 || []}
                  title="⚠️ Flop 5 PULSE"
                  ascending
                  color="#EF4444"/>
              </div>
            )
          }
        </motion.div>
      </div>
    </div>
  )
}
