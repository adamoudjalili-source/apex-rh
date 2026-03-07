// ============================================================
// APEX RH — components/recrutement/AIMatchingPanel.jsx
// Session 61 — Panel principal IA Matching (vue manager/admin)
// ============================================================
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Zap, Users, TrendingUp, Star, Filter,
  RefreshCw, ChevronDown, Loader2, BarChart2,
  CheckCircle2, AlertTriangle, Trophy, Clock,
  Briefcase, Play, Info,
} from 'lucide-react'
import {
  AI_RECOMMENDATION_LABELS,
  AI_RECOMMENDATION_COLORS,
  AI_RECOMMENDATION_BG,
  SCORE_AXES_LABELS,
  SCORE_AXES_COLORS,
  getScoreLevel,
  scoreToColor,
  computeScoreStats,
  rankCandidates,
  filterByMinScore,
  getAnalysisRate,
  useJobAIScores,
  useAIRecruitmentRanking,
  useAnalyzeAllCandidates,
  useAnalyzeCandidate,
} from '../../hooks/useRecruitmentAI'
import { useJobPostings, APPLICATION_STATUS_LABELS } from '../../hooks/useRecruitment'
import CandidateAIScore from './CandidateAIScore'

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

// ─── Carte stat globale ───────────────────────────────────────
function StatBadge({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-3 text-center"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Icon size={14} className="mx-auto mb-1.5" style={{ color }}/>
      <p className="text-sm font-extrabold text-white">{value ?? '—'}</p>
      <p className="text-[10px] text-white/30">{label}</p>
    </div>
  )
}

// ─── Jauge donut score ────────────────────────────────────────
function ScoreDonut({ score, size = 48 }) {
  const color = scoreToColor(score)
  const r  = (size / 2) - 5
  const c  = 2 * Math.PI * r
  const offset = c - (score / 100) * c

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"
        />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-extrabold text-white">{score}</span>
      </div>
    </div>
  )
}

// ─── Ligne candidat ranked ────────────────────────────────────
function CandidateRankRow({ item, rank, onAnalyze, isAnalyzing }) {
  const hasScore   = item.overall_score != null
  const level      = getScoreLevel(item.overall_score)
  const rec        = item.recommendation
  const color      = scoreToColor(item.overall_score)

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.02]"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Rang */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
        style={{
          background: rank <= 3 ? `${color}20` : 'rgba(255,255,255,0.04)',
          color:      rank <= 3 ? color          : 'rgba(255,255,255,0.25)',
          border:     rank <= 3 ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
        }}>
        {rank <= 3 ? (
          <Trophy size={11}/>
        ) : rank}
      </div>

      {/* Score donut */}
      {hasScore ? (
        <ScoreDonut score={item.overall_score} size={40}/>
      ) : (
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Brain size={13} className="text-white/20"/>
        </div>
      )}

      {/* Info candidat */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">{item.candidate_name}</p>
          {item.is_internal && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>
              Interne
            </span>
          )}
          {hasScore && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: AI_RECOMMENDATION_BG[rec], color: AI_RECOMMENDATION_COLORS[rec] }}>
              {AI_RECOMMENDATION_LABELS[rec]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-white/30 truncate">{item.candidate_email}</p>
          {item.application_status && (
            <span className="text-[10px] text-white/20">·</span>
          )}
          {item.application_status && (
            <p className="text-[10px] text-white/25">
              {APPLICATION_STATUS_LABELS[item.application_status] ?? item.application_status}
            </p>
          )}
        </div>
        {hasScore && item.ai_summary && (
          <p className="text-[11px] text-white/35 mt-1 line-clamp-1 italic">
            {item.ai_summary}
          </p>
        )}
      </div>

      {/* Score level label */}
      {hasScore ? (
        <div className="flex-shrink-0 text-right">
          <p className="text-[11px] font-bold" style={{ color: level.color }}>{level.label}</p>
          <p className="text-[10px] text-white/25">#{rank}</p>
        </div>
      ) : (
        <button
          onClick={() => onAnalyze(item.application_id ?? item.id)}
          disabled={isAnalyzing}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}>
          {isAnalyzing ? <Loader2 size={11} className="animate-spin"/> : <Zap size={11}/>}
          Analyser
        </button>
      )}
    </motion.div>
  )
}

// ─── Panel histogramme des scores ─────────────────────────────
function ScoreHistogram({ scores }) {
  const maxCount = Math.max(...scores.map(s => s.count), 1)
  return (
    <div className="flex items-end gap-1 h-16">
      {scores.map(({ label, count, color }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-white/25">{count}</span>
          <motion.div
            className="w-full rounded-t-sm"
            style={{ background: color }}
            initial={{ height: 0 }}
            animate={{ height: `${(count / maxCount) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <span className="text-[9px] text-white/30">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────
export default function AIMatchingPanel() {
  const [selectedJob, setSelectedJob] = useState(null)
  const [minScore,    setMinScore]    = useState(0)
  const [filterRec,   setFilterRec]   = useState('all')
  const [jobMenuOpen, setJobMenuOpen] = useState(false)

  const { data: jobs = [] }      = useJobPostings()
  const activeJobs               = jobs.filter(j => j.status === 'published' || j.status === 'active')

  const { data: ranking = [], isLoading: rankLoading } = useAIRecruitmentRanking(selectedJob?.id)
  const { data: scores  = [] }  = useJobAIScores(selectedJob?.id)

  const analyzeOne  = useAnalyzeCandidate()
  const analyzeAll  = useAnalyzeAllCandidates()

  // Stats
  const analyzedCount   = ranking.filter(r => r.overall_score != null).length
  const totalCandidates = ranking.length
  const analysisRate    = totalCandidates ? Math.round((analyzedCount / totalCandidates) * 100) : 0
  const allScores       = ranking.filter(r => r.overall_score != null).map(r => r.overall_score)
  const stats           = computeScoreStats(allScores)

  // Histogram data
  const histData = [
    { label: '0-39',  count: allScores.filter(s => s < 40).length,              color: '#EF4444' },
    { label: '40-54', count: allScores.filter(s => s >= 40 && s < 55).length,   color: '#F97316' },
    { label: '55-69', count: allScores.filter(s => s >= 55 && s < 70).length,   color: '#F59E0B' },
    { label: '70-84', count: allScores.filter(s => s >= 70 && s < 85).length,   color: '#3B82F6' },
    { label: '85+',   count: allScores.filter(s => s >= 85).length,             color: '#10B981' },
  ]

  // Filtre candidats
  const filteredRanking = useMemo(() => {
    let list = ranking
    if (filterRec !== 'all') list = list.filter(r => r.recommendation === filterRec)
    if (minScore  > 0)       list = filterByMinScore(list, minScore)
    return list
  }, [ranking, filterRec, minScore])

  const handleAnalyzeAll = () => {
    if (!selectedJob) return
    analyzeAll.mutate({ jobPostingId: selectedJob.id, forceReanalyze: false })
  }

  return (
    <motion.div
      className="space-y-5"
      variants={stagger}
      initial="hidden"
      animate="visible">

      {/* ── Sélecteur offre ──────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative">
          <button
            onClick={() => setJobMenuOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl text-left transition-all hover:border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                <Briefcase size={17} className="text-white"/>
              </div>
              <div>
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-0.5">Offre analysée</p>
                <p className="text-sm font-bold text-white">
                  {selectedJob?.title ?? 'Sélectionner une offre…'}
                </p>
              </div>
            </div>
            <ChevronDown size={15} className={`text-white/30 transition-transform ${jobMenuOpen ? 'rotate-180' : ''}`}/>
          </button>

          <AnimatePresence>
            {jobMenuOpen && (
              <motion.div
                className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden"
                style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}>
                <div className="max-h-56 overflow-y-auto">
                  {activeJobs.length === 0 && (
                    <p className="px-4 py-3 text-sm text-white/30">Aucune offre active</p>
                  )}
                  {activeJobs.map(job => (
                    <button key={job.id}
                      onClick={() => { setSelectedJob(job); setJobMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-white/05 transition-all"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-sm font-semibold text-white">{job.title}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">
                        {job.division?.name ?? job.service?.name ?? 'N/A'} · {job.contract_type?.toUpperCase()}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── État vide ─────────────────────────────────────────── */}
      {!selectedJob && (
        <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Brain size={26} className="text-indigo-400"/>
          </div>
          <p className="text-sm font-semibold text-white/50">IA Matching Recrutement</p>
          <p className="text-[12px] text-white/25 text-center max-w-[260px]">
            Sélectionnez une offre pour analyser et classer automatiquement les candidats par IA
          </p>
        </motion.div>
      )}

      {selectedJob && (
        <>
          {/* ── KPIs ──────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
            <StatBadge label="Candidats"  value={totalCandidates} color="#6366F1" icon={Users}/>
            <StatBadge label="Analysés"   value={analyzedCount}   color="#3B82F6" icon={Brain}/>
            <StatBadge label="Score moy." value={stats.avg ? `${stats.avg}/100` : '—'} color="#10B981" icon={TrendingUp}/>
            <StatBadge label="Taux analyse" value={`${analysisRate}%`} color="#F59E0B" icon={BarChart2}/>
          </motion.div>

          {/* ── Barre progression + bouton bulk ─────────────────── */}
          <motion.div variants={fadeUp}
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">Progression de l'analyse</p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {analyzedCount} candidat{analyzedCount > 1 ? 's' : ''} analysé{analyzedCount > 1 ? 's' : ''} sur {totalCandidates}
                </p>
              </div>
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzeAll.isPending || analyzedCount === totalCandidates}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'white' }}>
                {analyzeAll.isPending ? (
                  <><Loader2 size={13} className="animate-spin"/>Analyse…</>
                ) : (
                  <><Zap size={13}/>Tout analyser</>
                )}
              </button>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #6366F1, #10B981)' }}
                animate={{ width: `${analysisRate}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {analyzeAll.data && (
              <p className="text-[11px] text-emerald-400 mt-2">
                ✓ {analyzeAll.data.analyzed} analysé{analyzeAll.data.analyzed > 1 ? 's' : ''} — {analyzeAll.data.errors} erreur{analyzeAll.data.errors > 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

          {/* ── Histogramme scores ───────────────────────────── */}
          {allScores.length > 0 && (
            <motion.div variants={fadeUp}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                Distribution des scores
              </p>
              <ScoreHistogram scores={histData}/>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-white/25">Min : {stats.min ?? '—'}</p>
                <p className="text-[10px] text-white/25">Moy : {stats.avg ?? '—'}</p>
                <p className="text-[10px] text-white/25">Max : {stats.max ?? '—'}</p>
              </div>
            </motion.div>
          )}

          {/* ── Filtres ─────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Filter size={11} className="text-white/30"/>
              <span className="text-[10px] text-white/30">Filtre :</span>
            </div>
            {['all', 'strongly_recommend', 'recommend', 'neutral', 'not_recommend'].map(rec => (
              <button key={rec}
                onClick={() => setFilterRec(rec)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: filterRec === rec
                    ? (rec === 'all' ? 'rgba(99,102,241,0.2)' : AI_RECOMMENDATION_BG[rec])
                    : 'rgba(255,255,255,0.04)',
                  color: filterRec === rec
                    ? (rec === 'all' ? '#818CF8' : AI_RECOMMENDATION_COLORS[rec])
                    : 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {rec === 'all' ? 'Tous' : AI_RECOMMENDATION_LABELS[rec]}
              </button>
            ))}
          </motion.div>

          {/* ── Liste candidats ─────────────────────────────── */}
          <motion.div variants={fadeUp} className="space-y-2">
            {rankLoading ? (
              <div className="flex items-center justify-center py-10 gap-2">
                <Loader2 size={18} className="animate-spin text-white/25"/>
                <span className="text-sm text-white/25">Chargement…</span>
              </div>
            ) : filteredRanking.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Users size={22} className="text-white/15"/>
                <p className="text-sm text-white/30">Aucun candidat trouvé</p>
              </div>
            ) : (
              <motion.div variants={stagger}>
                {filteredRanking.map((item, idx) => (
                  <CandidateRankRow
                    key={item.application_id ?? idx}
                    item={item}
                    rank={item.rank_in_posting ?? idx + 1}
                    onAnalyze={(appId) => analyzeOne.mutate({ applicationId: appId })}
                    isAnalyzing={analyzeOne.isPending}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
