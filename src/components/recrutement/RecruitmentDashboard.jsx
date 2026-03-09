// ============================================================
// APEX RH — components/recrutement/RecruitmentDashboard.jsx
// Session 72 — Dashboard recrutement enrichi
// Time-to-hire · Taux conversion · Sources · Délais
// SVG natif — pas de recharts
// ============================================================
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Clock, Users, CheckCircle2, Target, Briefcase,
  BarChart2, PieChart, ArrowRight, Star, Zap, RefreshCw,
} from 'lucide-react'
import {
  useRecruitmentDashboard, useJobApplicationsEnriched,
  useRecruitmentGlobalStats, useRefreshRecruitmentMVs,
  PIPELINE_STAGES, APPLICATION_SOURCE_LABELS, APPLICATION_SOURCE_COLORS,
  getScoreInfo, SCORE_LABELS,
} from '../../hooks/useRecruitment'
import { usePermission } from '../../hooks/usePermission'
import StatCard from '../ui/StatCard'

// ─── Stat Card ────────────────────────────────────────────────

// ─── Funnel de conversion (SVG) ───────────────────────────────
function ConversionFunnel({ applications }) {
  const STAGES = [
    { status: 'nouveau',   label: 'Candidature',   color: '#6B7280' },
    { status: 'en_revue',  label: 'Pré-sélection', color: '#3B82F6' },
    { status: 'entretien', label: 'Entretien',      color: '#F59E0B' },
    { status: 'offre',     label: 'Offre',          color: '#10B981' },
    { status: 'accepte',   label: 'Embauché',       color: '#059669' },
  ]

  const counts = useMemo(() => {
    const map = {}
    STAGES.forEach(s => { map[s.status] = 0 })
    // Pour le funnel, compter les candidats ayant atteint chaque étape (minimum)
    // En pratique, nouveau >= en_revue >= entretien...
    // On compte ceux qui sont à cet étage OU ont dépassé
    const stagesOrder = STAGES.map(s => s.status)
    applications.forEach(app => {
      const idx = stagesOrder.indexOf(app.status)
      if (idx >= 0) {
        // Compte pour toutes les étapes précédentes (inclusif)
        for (let i = 0; i <= idx; i++) map[stagesOrder[i]]++
      }
    })
    return map
  }, [applications])

  const maxCount = Math.max(...STAGES.map(s => counts[s.status] || 0), 1)
  const W = 280, H = 180
  const barH = 22, gap = 10
  const totalH = STAGES.length * (barH + gap)

  return (
    <div>
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Entonnoir de conversion</p>
      <svg width={W} height={totalH} viewBox={`0 0 ${W} ${totalH}`}>
        {STAGES.map((stage, i) => {
          const count = counts[stage.status] || 0
          const barW = Math.max(4, (count / maxCount) * (W - 80))
          const y = i * (barH + gap)
          const rate = i > 0 ? (count / (counts[STAGES[i-1].status] || 1) * 100) : 100

          return (
            <g key={stage.status}>
              {/* Barre fond */}
              <rect x={0} y={y} width={W - 80} height={barH} rx={6}
                fill="rgba(255,255,255,0.04)"/>
              {/* Barre valeur */}
              <rect x={0} y={y} width={barW} height={barH} rx={6}
                fill={stage.color} fillOpacity={0.75}/>
              {/* Label gauche */}
              <text x={6} y={y + barH/2 + 4} fontSize={10} fill="rgba(255,255,255,0.7)" fontWeight="500">
                {stage.label}
              </text>
              {/* Valeur */}
              <text x={W - 78} y={y + barH/2 + 4} fontSize={11} fill="white" fontWeight="700">
                {count}
              </text>
              {/* Taux conversion */}
              {i > 0 && (
                <text x={W - 38} y={y + barH/2 + 4} fontSize={10} fill={rate < 30 ? '#EF4444' : '#6B7280'}>
                  {Math.round(rate)}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Répartition par source (SVG donut) ──────────────────────
function SourceBreakdown({ applications }) {
  const data = useMemo(() => {
    const counts = {}
    applications.forEach(a => {
      const src = a.source || 'autre'
      counts[src] = (counts[src] || 0) + 1
    })
    return Object.entries(counts)
      .map(([src, count]) => ({
        src,
        count,
        label: APPLICATION_SOURCE_LABELS[src] || src,
        color: APPLICATION_SOURCE_COLORS[src] || '#6B7280',
        pct: Math.round((count / applications.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [applications])

  if (data.length === 0) return null

  // Donut SVG
  const R = 50, CX = 60, CY = 60, STROKE = 14
  const total = data.reduce((s, d) => s + d.count, 0)
  let cumul = -90  // départ en haut

  const arcs = data.map(d => {
    const deg = (d.count / total) * 360
    const startRad = (cumul * Math.PI) / 180
    const endRad   = ((cumul + deg) * Math.PI) / 180
    const laf = deg > 180 ? 1 : 0
    const x1 = CX + R * Math.cos(startRad)
    const y1 = CY + R * Math.sin(startRad)
    const x2 = CX + R * Math.cos(endRad)
    const y2 = CY + R * Math.sin(endRad)
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${laf} 1 ${x2} ${y2}`
    cumul += deg
    return { ...d, path, deg }
  })

  return (
    <div>
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Sources</p>
      <div className="flex items-center gap-4">
        <svg width={120} height={120} viewBox={`0 0 120 120`}>
          {arcs.map((arc, i) => (
            <path key={i} d={arc.path}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              opacity={0.8}
            />
          ))}
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central"
            fontSize={13} fontWeight="800" fill="white">
            {total}
          </text>
          <text x={CX} y={CY + 13} textAnchor="middle" dominantBaseline="central"
            fontSize={8} fill="rgba(255,255,255,0.35)">
            total
          </text>
        </svg>
        <div className="space-y-1.5 flex-1">
          {data.slice(0, 5).map(d => (
            <div key={d.src} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }}/>
              <span className="text-[11px] text-white/50 flex-1 truncate">{d.label}</span>
              <span className="text-[11px] font-bold text-white">{d.count}</span>
              <span className="text-[10px] text-white/25 w-8 text-right">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Distribution des scores (SVG) ───────────────────────────
function ScoreDistribution({ applications }) {
  const levels = ['excellent', 'fort', 'moyen', 'faible']
  const counts = useMemo(() => {
    const map = { excellent: 0, fort: 0, moyen: 0, faible: 0, null: 0 }
    applications.forEach(a => {
      if (a.match_score == null) { map.null++; return }
      if (a.match_score >= 80)      map.excellent++
      else if (a.match_score >= 65) map.fort++
      else if (a.match_score >= 45) map.moyen++
      else                          map.faible++
    })
    return map
  }, [applications])

  const total = applications.length || 1
  const W = 240, barH = 18, gap = 8

  return (
    <div>
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Distribution des scores</p>
      <svg width={W} height={levels.length * (barH + gap)} viewBox={`0 0 ${W} ${levels.length * (barH + gap)}`}>
        {levels.map((lvl, i) => {
          const info = SCORE_LABELS[lvl]
          const count = counts[lvl] || 0
          const pct = (count / total) * 100
          const barW = Math.max(2, (pct / 100) * (W - 80))
          const y = i * (barH + gap)
          return (
            <g key={lvl}>
              <rect x={0} y={y} width={W - 80} height={barH} rx={4}
                fill="rgba(255,255,255,0.03)"/>
              <rect x={0} y={y} width={barW} height={barH} rx={4}
                fill={info.color} fillOpacity={0.65}/>
              <text x={6} y={y + barH/2 + 4} fontSize={10} fill="rgba(255,255,255,0.65)">
                {info.label}
              </text>
              <text x={W - 72} y={y + barH/2 + 4} fontSize={11} fill="white" fontWeight="700">
                {count}
              </text>
              <text x={W - 30} y={y + barH/2 + 4} fontSize={10} fill="rgba(255,255,255,0.3)">
                {Math.round(pct)}%
              </text>
            </g>
          )
        })}
      </svg>
      {counts.null > 0 && (
        <p className="text-[10px] text-white/20 mt-1">{counts.null} candidature{counts.null > 1 ? 's' : ''} sans score</p>
      )}
    </div>
  )
}

// ─── Top offres ───────────────────────────────────────────────
function TopPostings({ dashboard }) {
  const top = useMemo(() =>
    [...dashboard].sort((a, b) => b.total_applicants - a.total_applicants).slice(0, 6)
  , [dashboard])

  if (!top.length) return null

  const maxTotal = Math.max(...top.map(j => j.total_applicants), 1)

  return (
    <div>
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Top postes — candidatures</p>
      <div className="space-y-2">
        {top.map(job => {
          const rate = job.total_applicants > 0
            ? Math.round((job.hired_count / job.total_applicants) * 100)
            : 0
          return (
            <div key={job.job_id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60 truncate max-w-[180px]">{job.job_title}</span>
                <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                  <span className="text-white font-semibold">{job.total_applicants}</span>
                  {job.hired_count > 0 && (
                    <span className="text-emerald-400">{job.hired_count} recruté{job.hired_count > 1 ? 's' : ''}</span>
                  )}
                  {job.avg_time_to_hire_days != null && (
                    <span className="text-white/25">{Math.round(job.avg_time_to_hire_days)}j</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${(job.total_applicants / maxTotal) * 100}%`,
                    background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                  }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Délai moyen par étape ────────────────────────────────────
function StageTimings({ applications }) {
  // Estimation : temps dans chaque étape = écart updated_at si données disponibles
  // Ici on calcule depuis applied_at et hired_at si dispo
  const hired = applications.filter(a => a.status === 'accepte' && a.hired_at && a.applied_at)
  const avgTTH = hired.length > 0
    ? Math.round(hired.reduce((sum, a) => {
        return sum + (new Date(a.hired_at) - new Date(a.applied_at)) / 86400000
      }, 0) / hired.length)
    : null

  const active = applications.filter(a => !['accepte','refuse','retire'].includes(a.status))
  const avgActive = active.length > 0
    ? Math.round(active.reduce((sum, a) => {
        return sum + (Date.now() - new Date(a.applied_at)) / 86400000
      }, 0) / active.length)
    : null

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl p-3 text-center"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <Clock size={16} className="mx-auto mb-1" style={{ color: '#10B981' }}/>
        <p className="text-xl font-extrabold text-white">{avgTTH != null ? `${avgTTH}j` : '–'}</p>
        <p className="text-[10px] text-white/30">Time-to-hire moyen</p>
        {hired.length > 0 && (
          <p className="text-[10px] text-emerald-400/50 mt-0.5">sur {hired.length} recrutement{hired.length > 1 ? 's' : ''}</p>
        )}
      </div>
      <div className="rounded-xl p-3 text-center"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <TrendingUp size={16} className="mx-auto mb-1" style={{ color: '#818CF8' }}/>
        <p className="text-xl font-extrabold text-white">{avgActive != null ? `${avgActive}j` : '–'}</p>
        <p className="text-[10px] text-white/30">Durée moy. en cours</p>
        {active.length > 0 && (
          <p className="text-[10px] text-indigo-400/50 mt-0.5">{active.length} candidature{active.length > 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  )
}

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────
export default function RecruitmentDashboard() {
  const { can } = usePermission()
  const canAdmin = can('recrutement', 'pipeline', 'update')
  const { data: stats }        = useRecruitmentGlobalStats()
  const { data: applications = [] } = useJobApplicationsEnriched()
  const { data: dashboard = [] }    = useRecruitmentDashboard()
  const refreshMVs = useRefreshRecruitmentMVs()

  const conversionRate = useMemo(() => {
    const total = applications.length
    const hired = applications.filter(a => a.status === 'accepte').length
    return total > 0 ? Math.round((hired / total) * 100) : 0
  }, [applications])

  const avgScore = useMemo(() => {
    const scored = applications.filter(a => a.match_score != null)
    return scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + a.match_score, 0) / scored.length)
      : null
  }, [applications])

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
  }
  const fadeUp = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">

      {/* ─── Stats globales ─── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Briefcase}    label="Offres actives"    value={stats?.active_postings}  color="#6366F1" sub="en cours de recrutement"/>
          <StatCard icon={Users}        label="Candidatures"      value={stats?.total_applications} color="#3B82F6" sub="toutes sources confondues"/>
          <StatCard icon={CheckCircle2} label="Recrutés"          value={stats?.hired}             color="#10B981" sub={`taux ${conversionRate}%`}/>
          <StatCard icon={Star}         label="Score moyen"       value={avgScore != null ? `${avgScore}%` : null} color="#F59E0B" sub="matching candidats"/>
        </div>
      </motion.div>

      {/* ─── Délais ─── */}
      <motion.div variants={fadeUp}>
        <StageTimings applications={applications}/>
      </motion.div>

      {/* ─── Funnel + Sources ─── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ConversionFunnel applications={applications}/>
          </div>
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <SourceBreakdown applications={applications}/>
          </div>
        </div>
      </motion.div>

      {/* ─── Scores + Top postes ─── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ScoreDistribution applications={applications}/>
          </div>
          {dashboard.length > 0 && (
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <TopPostings dashboard={dashboard}/>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Refresh admin ─── */}
      {canAdmin && (
        <motion.div variants={fadeUp} className="flex justify-end">
          <button onClick={() => refreshMVs.mutate()} disabled={refreshMVs.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={12} className={refreshMVs.isPending ? 'animate-spin' : ''}/>
            Actualiser les statistiques
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
