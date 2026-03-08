// ============================================================
// APEX RH — components/recrutement/RecruitmentScoringPanel.jsx
// Session 72 — Scoring candidat automatique
// Score matching · Distribution · Actions
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Star, TrendingUp, RefreshCw, ChevronDown, ChevronUp,
  User, Briefcase, Zap, Filter, BarChart2,
} from 'lucide-react'
import {
  useJobApplicationsEnriched, useJobPostings,
  useUpdateApplicationScore, useComputeApplicationScore,
  getScoreInfo, SCORE_LABELS, APPLICATION_SOURCE_LABELS,
} from '../../hooks/useRecruitment'
import { useAuth } from '../../contexts/AuthContext'

// ─── Score Gauge SVG ──────────────────────────────────────────
function ScoreGauge({ score, size = 64 }) {
  if (score == null) {
    return (
      <div className="flex items-center justify-center rounded-full"
        style={{ width: size, height: size, background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.08)' }}>
        <span className="text-white/20 text-xs font-bold">?</span>
      </div>
    )
  }

  const info = getScoreInfo(score)
  const R = size / 2 - 5
  const CX = size / 2
  const CY = size / 2
  const CIRC = 2 * Math.PI * R
  // Arc : 0° → 270° (3/4 du cercle)
  const ARC = 0.75
  const dashArray = CIRC
  const dashOffset = CIRC * (1 - ARC * (score / 100))

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        {/* Fond */}
        <circle cx={CX} cy={CY} r={R}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5}
          strokeDasharray={`${CIRC * ARC} ${CIRC * (1 - ARC)}`}/>
        {/* Valeur */}
        <circle cx={CX} cy={CY} r={R}
          fill="none" stroke={info?.color || '#6B7280'} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${CIRC * ARC * (score / 100)} ${CIRC * (1 - ARC * (score / 100))}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-extrabold" style={{ fontSize: size / 5 }}>{Math.round(score)}</span>
        <span className="text-white/30" style={{ fontSize: size / 9 }}>/ 100</span>
      </div>
    </div>
  )
}

// ─── Ligne candidat avec score ────────────────────────────────
function CandidateScoreRow({ app, onManualScore }) {
  const [editing, setEditing] = useState(false)
  const [manualScore, setManualScore] = useState('')
  const computeScore = useComputeApplicationScore()
  const info = getScoreInfo(app.match_score)

  const handleCompute = async () => {
    await computeScore.mutateAsync(app.id)
  }

  const handleManual = async () => {
    const score = parseFloat(manualScore)
    if (isNaN(score) || score < 0 || score > 100) return
    await onManualScore(app.id, score)
    setEditing(false)
    setManualScore('')
  }

  const avgInterviewScore = useMemo(() => {
    const scores = app.interviews
      ?.flatMap(i => i.feedback || [])
      .map(f => f.overall_score)
      .filter(s => s != null) || []
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) : null
  }, [app.interviews])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 rounded-xl p-3 group"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>

      {/* ─── Score gauge ─── */}
      <ScoreGauge score={app.match_score} size={52}/>

      {/* ─── Infos ─── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-white truncate">{app.candidate_name}</p>
          {info && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
              style={{ background: info.bg, color: info.color }}>
              {info.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          {app.job?.title && (
            <span className="flex items-center gap-0.5 truncate max-w-[120px]">
              <Briefcase size={9}/>{app.job.title}
            </span>
          )}
          {avgInterviewScore != null && (
            <span className="flex items-center gap-0.5 text-yellow-400/60">
              <Star size={9}/>{avgInterviewScore}%
            </span>
          )}
          {app.source && (
            <span>{APPLICATION_SOURCE_LABELS[app.source] || app.source}</span>
          )}
        </div>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0} max={100}
              value={manualScore}
              onChange={e => setManualScore(e.target.value)}
              className="w-14 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(99,102,241,0.3)' }}
              placeholder="0–100"
              autoFocus/>
            <button onClick={handleManual}
              className="px-2 py-1 rounded-lg text-xs font-bold text-white"
              style={{ background: '#6366F1' }}>OK</button>
            <button onClick={() => setEditing(false)}
              className="px-2 py-1 rounded-lg text-xs text-white/40"
              style={{ background: 'rgba(255,255,255,0.06)' }}>✕</button>
          </div>
        ) : (
          <>
            <button onClick={() => setEditing(true)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}>
              Manuel
            </button>
            <button onClick={handleCompute} disabled={computeScore.isPending}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              title="Recalculer depuis les entretiens">
              <RefreshCw size={12} className={`text-white/40 ${computeScore.isPending ? 'animate-spin' : ''}`}/>
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── Résumé distribution ─────────────────────────────────────
function ScoreSummary({ applications }) {
  const stats = useMemo(() => {
    const total = applications.length
    const scored = applications.filter(a => a.match_score != null)
    const levels = { excellent: 0, fort: 0, moyen: 0, faible: 0 }
    scored.forEach(a => {
      const lvl = getScoreInfo(a.match_score)?.level
      if (lvl) levels[lvl]++
    })
    const avg = scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + a.match_score, 0) / scored.length)
      : null
    return { total, scored: scored.length, levels, avg }
  }, [applications])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
      <div className="rounded-xl p-3 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xl font-extrabold text-white">{stats.total}</p>
        <p className="text-[10px] text-white/30">Total</p>
      </div>
      <div className="rounded-xl p-3 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xl font-extrabold" style={{ color: '#F59E0B' }}>
          {stats.avg != null ? `${stats.avg}%` : '–'}
        </p>
        <p className="text-[10px] text-white/30">Score moyen</p>
      </div>
      {['excellent','fort','moyen','faible'].map(lvl => {
        const info = SCORE_LABELS[lvl]
        return (
          <div key={lvl} className="rounded-xl p-3 text-center"
            style={{ background: info.bg, border: `1px solid ${info.color}25` }}>
            <p className="text-xl font-extrabold" style={{ color: info.color }}>
              {stats.levels[lvl]}
            </p>
            <p className="text-[10px]" style={{ color: info.color, opacity: 0.7 }}>{info.label}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL PRINCIPAL ──────────────────────────────────────────
export default function RecruitmentScoringPanel() {
  const { data: applications = [], isLoading } = useJobApplicationsEnriched()
  const { data: jobs = [] } = useJobPostings()
  const updateScore = useUpdateApplicationScore()

  const [filterJob,    setFilterJob]    = useState('')
  const [filterLevel,  setFilterLevel]  = useState('')
  const [sortBy,       setSortBy]       = useState('score_desc')

  const filtered = useMemo(() => {
    let arr = applications
    if (filterJob)   arr = arr.filter(a => a.job_id === filterJob)
    if (filterLevel) {
      const minScore = filterLevel === 'excellent' ? 80 : filterLevel === 'fort' ? 65 : filterLevel === 'moyen' ? 45 : 0
      const maxScore = filterLevel === 'excellent' ? 100 : filterLevel === 'fort' ? 79 : filterLevel === 'moyen' ? 64 : 44
      if (filterLevel === 'noscored') {
        arr = arr.filter(a => a.match_score == null)
      } else {
        arr = arr.filter(a => a.match_score != null && a.match_score >= minScore && a.match_score <= maxScore)
      }
    }
    // Tri
    const sorted = [...arr]
    if (sortBy === 'score_desc') sorted.sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1))
    if (sortBy === 'score_asc')  sorted.sort((a, b) => (a.match_score ?? -1) - (b.match_score ?? -1))
    if (sortBy === 'name')       sorted.sort((a, b) => a.candidate_name.localeCompare(b.candidate_name))
    if (sortBy === 'recent')     sorted.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
    return sorted
  }, [applications, filterJob, filterLevel, sortBy])

  if (isLoading) {
    return (
      <div className="text-center py-16 text-white/30 text-sm">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        Chargement des scores...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── Résumé ─── */}
      <ScoreSummary applications={applications}/>

      {/* ─── Filtres + tri ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterJob}
          onChange={e => setFilterJob(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[180px]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Tous les postes</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>

        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">Tous niveaux</option>
          <option value="excellent">Excellent (≥80%)</option>
          <option value="fort">Fort (65–79%)</option>
          <option value="moyen">Moyen (45–64%)</option>
          <option value="faible">Faible (&lt;45%)</option>
          <option value="noscored">Non scorés</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="score_desc">Score ↓</option>
          <option value="score_asc">Score ↑</option>
          <option value="recent">Plus récents</option>
          <option value="name">Nom A→Z</option>
        </select>

        <span className="text-xs text-white/25 ml-auto">{filtered.length} candidat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* ─── Liste ─── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Star size={32} className="mx-auto text-white/10 mb-2"/>
          <p className="text-white/30 text-sm">Aucun candidat dans ce filtre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => (
            <CandidateScoreRow
              key={app.id}
              app={app}
              onManualScore={(id, score) => updateScore.mutateAsync({ id, match_score: score })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
