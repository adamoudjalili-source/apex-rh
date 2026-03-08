// ============================================================
// APEX RH — src/pages/intelligence/DashboardDirection.jsx
// Session 48 — Dashboard Direction Générale & Actionnaires
// Scorecard RAG · Tendances 12 mois · OKR Strat. · ROI RH
// Accès : isAdmin || isDirecteur || isDirection
// Graphiques : SVG pur
// ============================================================
// ============================================================
// APEX RH — src/pages/intelligence/DashboardDirection.jsx
// Session 48 — Dashboard Direction Générale & Actionnaires
// Session 49 — QW6 : Drill-down divisions sur clic KPI card
// Scorecard RAG · Tendances 12 mois · OKR Strat. · ROI RH
// Accès : isAdmin || isDirecteur || isDirection
// Graphiques : SVG pur
// ============================================================
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, Target, Zap, Activity,
  Users, CheckCircle, BarChart2, Shield, RefreshCw, Calendar,
  ChevronRight, Award, X, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useDirectionScorecard,
  useDirectionTrend12m,
  useDirectionOKR,
  useDirectionROI,
  ragStatus, RAG_COLORS, KPI_THRESHOLDS,
} from '../../hooks/useDashboardDirection'
import { useDivisionMatrix } from '../../hooks/useDRHDashboard'
import { monthKeyToLabel } from '../../hooks/useAnalytics'

// ─── Helpers ────────────────────────────────────────────────
const fadeUp  = { hidden:{opacity:0,y:10}, visible:{opacity:1,y:0,transition:{duration:0.3}} }
const stagger = { hidden:{}, visible:{transition:{staggerChildren:0.08}} }

function Sk({ className='' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`}/>
}

function Delta({ cur, prev, inverted=false }) {
  if (cur == null || prev == null) return <span className="text-white/20 text-xs">—</span>
  const d = cur - prev
  if (Math.abs(d) < 1) return (
    <span className="flex items-center gap-0.5 text-xs text-white/30"><Minus size={10}/> stable</span>
  )
  const positive = inverted ? d < 0 : d > 0
  const color = positive ? '#10B981' : '#EF4444'
  const Icon  = d > 0 ? TrendingUp : TrendingDown
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color }}>
      <Icon size={11}/>
      {d > 0 ? '+' : ''}{d} pts
    </span>
  )
}

// ─── RAG Badge ───────────────────────────────────────────────
function RagBadge({ status }) {
  const c = RAG_COLORS[status] || RAG_COLORS.grey
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }}/>
      {c.label}
    </span>
  )
}

// ─── Scorecard KPI Card ──────────────────────────────────────
function ScorecardCard({ icon: Icon, label, value, unit='', prev, thresholdKey, description, isLoading, large=false, onClick }) {
  const rag = ragStatus(value, KPI_THRESHOLDS[thresholdKey] || { green:70, amber:50 })
  const c   = RAG_COLORS[rag]

  return (
    <motion.div variants={fadeUp}
      onClick={onClick}
      className={`rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ${onClick ? 'cursor-pointer hover:brightness-110 active:scale-[0.98]' : ''}`}
      style={{ background:'rgba(255,255,255,0.025)', border:`1px solid ${c.border}`, transition:'filter 0.15s, transform 0.1s' }}>
      {/* Glow */}
      <div className="absolute inset-0 rounded-2xl opacity-[0.06] pointer-events-none"
        style={{ background:`radial-gradient(circle at 80% 10%, ${c.text}, transparent 60%)` }}/>

      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background:`${c.bg}`, border:`1px solid ${c.border}` }}>
          <Icon size={15} style={{ color: c.text }}/>
        </div>
        <div className="flex items-center gap-1.5">
          <RagBadge status={rag}/>
          {onClick && <ChevronDown size={12} className="text-white/25"/>}
        </div>
      </div>

      {isLoading
        ? <Sk className="w-24 h-10"/>
        : (
          <div>
            <div className={`font-bold text-white ${large ? 'text-4xl' : 'text-3xl'}`}
              style={{ fontFamily:"'Syne',sans-serif" }}>
              {value ?? '—'}
              {value != null && <span className="text-lg font-normal text-white/25">{unit}</span>}
            </div>
            <div className="text-xs font-medium text-white/60 mt-1">{label}</div>
            {description && <div className="text-[10px] text-white/30 mt-0.5">{description}</div>}
            {prev != null && value != null && (
              <div className="mt-2"><Delta cur={value} prev={prev}/></div>
            )}
          </div>
        )
      }
    </motion.div>
  )
}

// ─── Drill-down Panel — Détail par division ───────────────────
const KPI_DRILL_LABELS = {
  pulse:         { label: 'PULSE par division',  field: 'pulse_cur',  unit: '/100' },
  nita:          { label: 'NITA par division',   field: 'nita_cur',   unit: '/100' },
  okr_progress:  { label: 'OKR par division',    field: 'okr_avg',    unit: '%'   },
  taux_activite: { label: 'Activité par division',field: 'agents_pct', unit: '%'   },
}

function DrilldownPanel({ kpiKey, onClose }) {
  const { data: divisions, isLoading } = useDivisionMatrix(1)
  const conf = KPI_DRILL_LABELS[kpiKey] || {}

  const rows = (divisions || [])
    .filter(d => d[conf.field] != null)
    .sort((a, b) => (b[conf.field] ?? 0) - (a[conf.field] ?? 0))

  const max = rows.length ? Math.max(...rows.map(d => d[conf.field] ?? 0), 1) : 100

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity:0, x: 24 }}
        animate={{ opacity:1, x: 0 }}
        exit={{ opacity:0, x: 24 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl p-5"
        style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)' }}>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white/80">{conf.label}</div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <X size={13}/>
          </button>
        </div>

        {isLoading
          ? [1,2,3].map(i => <Sk key={i} className="h-10 mb-2"/>)
          : rows.length === 0
            ? <div className="text-xs text-white/20 py-4 text-center">Aucune donnée de division disponible</div>
            : (
              <div className="space-y-3">
                {rows.map(d => {
                  const val = d[conf.field] ?? 0
                  const rag = ragStatus(val, KPI_THRESHOLDS[kpiKey] || { green:70, amber:50 })
                  const c   = RAG_COLORS[rag]
                  const pct = Math.round((val / max) * 100)
                  return (
                    <div key={d.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/60 truncate flex-1 mr-2">{d.name}</span>
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: c.text }}>
                          {val}{conf.unit}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden"
                        style={{ background:'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width:`${pct}%`, background: c.text, boxShadow:`0 0 4px ${c.text}50` }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
        }

        <div className="mt-4 pt-3 border-t border-white/[0.05] text-[10px] text-white/20">
          Données division — mois en cours · Cliquer hors du panneau pour fermer
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Gauge SVG (santé organisationnelle) ─────────────────────
function OrgHealthGauge({ score, isLoading }) {
  if (isLoading) return <Sk className="w-48 h-24 mx-auto"/>

  const val    = score ?? 0
  const pct    = Math.max(0, Math.min(100, val))
  // Demi-cercle : -180° à 0° → 0% à 100%
  const angle  = -180 + (pct / 100) * 180
  const toRad  = a => a * Math.PI / 180
  const cx = 80, cy = 80, r = 60
  const x  = cx + r * Math.cos(toRad(angle))
  const y  = cy + r * Math.sin(toRad(angle))
  const color = pct >= 70 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 90" className="w-48 overflow-visible">
        {/* Arc fond */}
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"/>
        {/* Arc valeur */}
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${x},${y}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 6px ${color}60)` }}/>
        {/* Needle */}
        <line x1={cx} y1={cy} x2={x} y2={y}
          stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
        <circle cx={cx} cy={cy} r="4" fill={color} opacity="0.9"/>
        {/* Labels */}
        <text x={cx-r-2} y={cy+14} fontSize="7" fill="rgba(255,255,255,0.25)" textAnchor="middle">0</text>
        <text x={cx+r+2} y={cy+14} fontSize="7" fill="rgba(255,255,255,0.25)" textAnchor="middle">100</text>
        {/* Score */}
        <text x={cx} y={cy-8} fontSize="22" fontWeight="700" fill="white" textAnchor="middle"
          style={{ fontFamily:"'Syne',sans-serif" }}>{pct}</text>
        <text x={cx} y={cy+2} fontSize="7" fill="rgba(255,255,255,0.35)" textAnchor="middle">/100</text>
      </svg>
      <div className="text-xs text-white/40 mt-1">Indice Santé Organisationnelle</div>
    </div>
  )
}

// ─── Trend Chart 12 mois (SVG pur) ───────────────────────────
const TREND_LINES = [
  { key:'avg_pulse', label:'PULSE',      color:'#8B5CF6' },
  { key:'avg_nita',  label:'NITA',       color:'#F59E0B' },
  { key:'avg_okr',   label:'OKR Strat.', color:'#10B981' },
]

function TrendChart12m({ data, isLoading }) {
  const [hovered, setHovered]   = useState(null)
  const [activeLines, setActive] = useState({ avg_pulse:true, avg_nita:true, avg_okr:true })

  if (isLoading) return <Sk className="w-full h-52"/>
  if (!data?.length) return (
    <div className="flex items-center justify-center h-40 text-white/20 text-sm">Aucune donnée disponible</div>
  )

  const W   = 100, H = 180
  const PAD = { top:10, right:8, bottom:30, left:30 }
  const pW  = W - PAD.left - PAD.right
  const pH  = H - PAD.top  - PAD.bottom

  const allVals = TREND_LINES
    .filter(l => activeLines[l.key])
    .flatMap(l => data.map(d => d[l.key]))
    .filter(v => v != null)
  const minV = allVals.length ? Math.floor(Math.min(...allVals) / 10) * 10 : 0
  const maxV = allVals.length ? Math.ceil(Math.max(...allVals) / 10) * 10 || 100 : 100

  const xOf = i => PAD.left + (i / Math.max(data.length - 1, 1)) * pW
  const yOf = v => {
    if (v == null) return null
    return PAD.top + pH - ((Math.max(minV, Math.min(maxV, v)) - minV) / (maxV - minV || 1)) * pH
  }

  const buildPath = key =>
    data.map((d, i) => ({ x: xOf(i), y: yOf(d[key]) }))
      .filter(p => p.y !== null)
      .map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ')

  const gridYs = [0, 25, 50, 75, 100].filter(v => v >= minV && v <= maxV)
    .map(v => ({ v, y: yOf(v) }))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: H }}
        preserveAspectRatio="none">
        {gridYs.map(({ v, y }) => (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.4"/>
            <text x={PAD.left-1.5} y={y+1.2} textAnchor="end" fontSize="3.5"
              fill="rgba(255,255,255,0.25)">{v}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.month_key} x={xOf(i)} y={H-PAD.bottom+7} textAnchor="middle"
            fontSize="3.5" fill="rgba(255,255,255,0.3)">
            {monthKeyToLabel(d.month_key)}
          </text>
        ))}
        {TREND_LINES.filter(l => activeLines[l.key]).map(l => {
          const path = buildPath(l.key)
          if (!path) return null
          const faded = hovered !== null && hovered !== l.key
          return (
            <g key={l.key} onMouseEnter={() => setHovered(l.key)} onMouseLeave={() => setHovered(null)}>
              <path d={path} fill="none" stroke={l.color}
                strokeWidth={hovered === l.key ? 1.2 : 0.7}
                strokeLinecap="round"
                opacity={faded ? 0.2 : 0.9}
                style={{ transition:'opacity 0.2s, stroke-width 0.2s' }}/>
              {data.map((d, i) => {
                const y = yOf(d[l.key])
                if (y == null) return null
                return (
                  <circle key={i} cx={xOf(i)} cy={y} r={hovered===l.key?1.2:0.7}
                    fill={l.color} opacity={faded?0.2:0.85}/>
                )
              })}
            </g>
          )
        })}
      </svg>
      <div className="flex gap-4 mt-3 flex-wrap">
        {TREND_LINES.map(l => (
          <button key={l.key}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ color: activeLines[l.key] ? l.color : 'rgba(255,255,255,0.2)' }}
            onClick={() => setActive(p => ({ ...p, [l.key]: !p[l.key] }))}>
            <span className="w-3 h-0.5 rounded-full" style={{ background: l.color, opacity: activeLines[l.key] ? 1 : 0.3 }}/>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── OKR Stratégique Card ────────────────────────────────────
function OKRCard({ okr }) {
  const pct = okr.progress_score ?? 0
  const healthConf = {
    on_track: { color:'#10B981', label:'En bonne voie', bg:'rgba(16,185,129,0.1)' },
    at_risk:  { color:'#F59E0B', label:'À risque',      bg:'rgba(245,158,11,0.1)' },
    behind:   { color:'#EF4444', label:'En retard',     bg:'rgba(239,68,68,0.1)'  },
  }[okr.health] || { color:'#9CA3AF', label:'—', bg:'rgba(107,114,128,0.1)' }

  return (
    <div className="p-4 rounded-xl"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/80 line-clamp-2">{okr.title}</div>
          {okr.owner_name && (
            <div className="text-xs text-white/30 mt-0.5">{okr.owner_name} · {okr.direction_name || '—'}</div>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: healthConf.bg, color: healthConf.color }}>
          {healthConf.label}
        </span>
      </div>
      {/* Barre de progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background:'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width:`${pct}%`, background: healthConf.color,
              boxShadow:`0 0 6px ${healthConf.color}60` }}/>
        </div>
        <span className="text-sm font-bold flex-shrink-0" style={{ color: healthConf.color, minWidth:32 }}>
          {pct}%
        </span>
      </div>
      {okr.kr_count > 0 && (
        <div className="text-[10px] text-white/25 mt-2">{okr.kr_count} résultat{okr.kr_count>1?'s':''} clé{okr.kr_count>1?'s':''}</div>
      )}
    </div>
  )
}

// ─── ROI Indicator ───────────────────────────────────────────
function ROICard({ label, value, unit='%', icon: Icon, color, description }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
        <Icon size={14} style={{ color }}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/40">{label}</div>
        {description && <div className="text-[10px] text-white/20">{description}</div>}
      </div>
      <div className="text-xl font-bold flex-shrink-0" style={{ color, fontFamily:"'Syne',sans-serif" }}>
        {value ?? '—'}{value != null ? unit : ''}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function DashboardDirection() {
  const { isAdmin, isDirecteur } = useAuth()  // isDirection supprimé B-1
  const [drillKPI, setDrillKPI] = useState(null) // QW6 — drill-down KPI actif

  const { data: scorecard, isLoading: scLoading } = useDirectionScorecard()
  const { data: trend12m,  isLoading: trendLoad }  = useDirectionTrend12m()
  const { data: okrList,   isLoading: okrLoading }  = useDirectionOKR()
  const { data: roi,       isLoading: roiLoading }  = useDirectionROI()

  if (!isAdmin && !isDirecteur) {  // isDirection supprimé B-1
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Shield size={40} className="text-white/20"/>
        <div className="text-center">
          <div className="text-lg font-semibold text-white/60">Accès restreint</div>
          <div className="text-sm text-white/30 mt-1">Réservé à la Direction Générale.</div>
        </div>
      </div>
    )
  }

  // Calcul indice santé composite (moyenne pondérée des KPIs)
  const healthScore = (() => {
    const vals = [
      scorecard?.pulse_cur ? scorecard.pulse_cur * 0.30 : null,
      scorecard?.nita_cur  ? scorecard.nita_cur  * 0.25 : null,
      scorecard?.okr_progress ? scorecard.okr_progress * 0.25 : null,
      scorecard?.taux_activite ? scorecard.taux_activite * 0.20 : null,
    ].filter(v => v !== null)
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0)) : null
  })()

  const now = new Date().toLocaleDateString('fr-FR', { month:'long', year:'numeric' })

  const toggleDrill = (key) => setDrillKPI(prev => prev === key ? null : key)

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} transition={{duration:0.3}}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
            Dashboard Direction Générale
          </h2>
          <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1.5">
            <Calendar size={11}/>
            Vision stratégique · {now}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>S49</span>
          {scorecard?.reference_month && (
            <span className="text-xs px-3 py-1.5 rounded-xl text-white/40"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              Réf. {monthKeyToLabel(scorecard.reference_month)}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Scorecard RAG + Gauge ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Gauge santé orga */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.05,duration:0.3}}
          className="rounded-2xl p-5 flex flex-col items-center justify-center"
          style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <OrgHealthGauge score={healthScore} isLoading={scLoading}/>
          <div className="mt-3 text-center">
            <RagBadge status={ragStatus(healthScore, { green:70, amber:50 })}/>
          </div>
        </motion.div>

        {/* KPI Cards — cliquables pour drill-down */}
        <motion.div variants={stagger} initial="hidden" animate="visible"
          className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScorecardCard
            icon={Activity} label="PULSE Global" thresholdKey="pulse"
            value={scorecard?.pulse_cur} prev={scorecard?.pulse_prev}
            unit="/100"
            description={scorecard?.agents_actifs ? `${scorecard.agents_actifs} agents mesurés` : null}
            isLoading={scLoading}
            onClick={() => toggleDrill('pulse')}/>
          <ScorecardCard
            icon={Zap} label="NITA Global" thresholdKey="nita"
            value={scorecard?.nita_cur} prev={scorecard?.nita_prev}
            unit="/100"
            isLoading={scLoading}
            onClick={() => toggleDrill('nita')}/>
          <ScorecardCard
            icon={Target} label="OKR Strat. Avancement" thresholdKey="okr_progress"
            value={scorecard?.okr_progress} prev={null}
            unit="%"
            description={scorecard?.okr_total ? `${scorecard.okr_on_track}/${scorecard.okr_total} en bonne voie` : null}
            isLoading={scLoading}
            onClick={() => toggleDrill('okr_progress')}/>
          <ScorecardCard
            icon={Users} label="Taux d'Activité" thresholdKey="taux_activite"
            value={scorecard?.taux_activite} prev={null}
            unit="%"
            description={scorecard?.total_agents ? `${scorecard.total_agents} collaborateurs actifs` : null}
            isLoading={scLoading}
            onClick={() => toggleDrill('taux_activite')}/>
        </motion.div>
      </div>

      {/* ── Drill-down divisions (QW6) ── */}
      <AnimatePresence>
        {drillKPI && (
          <motion.div
            key={drillKPI}
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            transition={{ duration:0.25 }}>
            <DrilldownPanel kpiKey={drillKPI} onClose={() => setDrillKPI(null)}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tendances 12 mois + ROI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tendances 12 mois */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.1,duration:0.3}}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="mb-4">
            <div className="text-sm font-semibold text-white">Évolution sur 12 mois</div>
            <div className="text-xs text-white/30 mt-0.5">
              PULSE · NITA · OKR Stratégiques — cliquer sur la légende pour afficher/masquer
            </div>
          </div>
          <TrendChart12m data={trend12m || []} isLoading={trendLoad}/>
        </motion.div>

        {/* ROI RH */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.15,duration:0.3}}
          className="rounded-2xl p-5 space-y-3"
          style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div className="text-sm font-semibold text-white">ROI RH</div>
            <div className="text-xs text-white/30 mt-0.5">Indicateurs d'efficacité organisationnelle</div>
          </div>
          {roiLoading
            ? [1,2,3,4].map(i => <Sk key={i} className="h-14"/>)
            : (
              <>
                <ROICard
                  label="Couverture PULSE"
                  description="Agents avec score ce mois"
                  value={roi?.tauxCouverturePulse} unit="%"
                  icon={Activity} color="#8B5CF6"/>
                <ROICard
                  label="OKR Complétion globale"
                  description="Objectifs validés"
                  value={roi?.okrCompletionRate} unit="%"
                  icon={Target} color="#10B981"/>
                <ROICard
                  label="Feedback 360° Complétés"
                  description={roi?.f360Total ? `${roi.f360Total} demandes` : null}
                  value={roi?.f360Rate} unit="%"
                  icon={Users} color="#3B82F6"/>
                <ROICard
                  label="Plan Développement"
                  description={roi?.pdiTotal ? `${roi.pdiDone}/${roi.pdiTotal} actions` : null}
                  value={roi?.pdiRate} unit="%"
                  icon={Award} color="#F59E0B"/>
              </>
            )
          }
        </motion.div>
      </div>

      {/* ── OKR Stratégiques ── */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.2,duration:0.3}}
        className="rounded-2xl p-5"
        style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Target size={14} style={{ color:'#10B981' }}/>
              OKR Stratégiques
            </div>
            <div className="text-xs text-white/30 mt-0.5">
              {okrList?.length ?? 0} objectif{(okrList?.length??0)!==1?'s':''} de niveau stratégique actifs
            </div>
          </div>
          {/* Summary pills */}
          {!okrLoading && okrList?.length > 0 && (() => {
            const onTrack = okrList.filter(o => o.health === 'on_track').length
            const atRisk  = okrList.filter(o => o.health === 'at_risk').length
            const behind  = okrList.filter(o => o.health === 'behind').length
            return (
              <div className="flex gap-2">
                {onTrack > 0 && <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(16,185,129,0.1)', color:'#10B981' }}>
                  {onTrack} en bonne voie
                </span>}
                {atRisk > 0 && <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>
                  {atRisk} à risque
                </span>}
                {behind > 0 && <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444' }}>
                  {behind} en retard
                </span>}
              </div>
            )
          })()}
        </div>

        {okrLoading
          ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3].map(i => <Sk key={i} className="h-24"/>)}
            </div>
          : okrList?.length === 0
            ? (
              <div className="py-10 text-center text-white/20">
                <Target size={28} className="mx-auto mb-2 opacity-40"/>
                <div className="text-sm">Aucun OKR stratégique actif</div>
                <div className="text-xs mt-1">Créer des objectifs de niveau "Stratégique" dans le module OKR</div>
              </div>
            )
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {okrList.map(okr => <OKRCard key={okr.id} okr={okr}/>)}
              </div>
            )
        }
      </motion.div>

      {/* ── Note accès ── */}
      <div className="text-[10px] text-white/15 text-center pb-2">
        Dashboard Direction Générale · APEX RH S49 · Données temps réel Supabase
      </div>
    </div>
  )
}
