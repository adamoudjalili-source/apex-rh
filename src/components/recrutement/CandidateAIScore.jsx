// ============================================================
// APEX RH — components/recrutement/CandidateAIScore.jsx
// Session 61 — Badge score IA + modal détail candidat
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, X, TrendingUp, TrendingDown, Star,
  CheckCircle2, AlertTriangle, Zap, ChevronRight,
  RefreshCw, Loader2,
} from 'lucide-react'
import {
  AI_RECOMMENDATION_LABELS,
  AI_RECOMMENDATION_COLORS,
  AI_RECOMMENDATION_BG,
  SCORE_AXES_LABELS,
  SCORE_AXES_COLORS,
  getScoreLevel,
  scoreToColor,
  useApplicationAIScore,
  useAnalyzeCandidate,
} from '../../hooks/useRecruitmentAI'

// ─── Mini badge score inline ──────────────────────────────────
export function AIScoreBadge({ applicationId, onClick }) {
  const { data: aiScore, isLoading } = useApplicationAIScore(applicationId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        <Loader2 size={9} className="animate-spin text-white/30"/>
      </div>
    )
  }

  if (!aiScore) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold transition-all hover:opacity-80"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}
        title="Analyser avec IA">
        <Brain size={9}/>
        <span>Analyser</span>
      </button>
    )
  }

  const color = scoreToColor(aiScore.overall_score)

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all hover:opacity-80"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
      title="Score IA — cliquer pour détails">
      <Brain size={9}/>
      <span>{aiScore.overall_score}</span>
    </button>
  )
}

// ─── Barre de score avec animation ───────────────────────────
function ScoreBar({ label, value, color }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/50">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{value ?? '—'}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value ?? 0}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  )
}

// ─── Modal détail score ───────────────────────────────────────
function AIScoreModal({ applicationId, candidateName, onClose }) {
  const { data: aiScore, isLoading } = useApplicationAIScore(applicationId)
  const analyze = useAnalyzeCandidate()

  const handleReanalyze = () => {
    analyze.mutate({ applicationId, forceReanalyze: true })
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}>

        <motion.div
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="p-5 pb-4 flex items-start justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                <Brain size={18} className="text-white"/>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Analyse IA</p>
                <p className="text-[11px] text-white/40 truncate max-w-[200px]">{candidateName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReanalyze}
                disabled={analyze.isPending}
                className="p-1.5 rounded-lg transition-all hover:bg-white/05"
                title="Re-analyser">
                <RefreshCw size={13} className={`text-white/40 ${analyze.isPending ? 'animate-spin' : ''}`}/>
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/05">
                <X size={15} className="text-white/40"/>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">

            {isLoading || analyze.isPending ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Brain size={20} className="text-indigo-400 animate-pulse"/>
                </div>
                <p className="text-sm text-white/50">Analyse IA en cours…</p>
                <p className="text-[11px] text-white/25 text-center max-w-[200px]">
                  Claude analyse le profil et les exigences du poste
                </p>
              </div>
            ) : !aiScore ? (
              <div className="text-center py-6">
                <Brain size={28} className="mx-auto mb-3 text-white/15"/>
                <p className="text-sm text-white/50 mb-3">Profil non encore analysé</p>
                <button
                  onClick={() => analyze.mutate({ applicationId })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                  Lancer l'analyse IA
                </button>
              </div>
            ) : (
              <>
                {/* Score global */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                      <circle
                        cx="32" cy="32" r="28"
                        fill="none"
                        stroke={scoreToColor(aiScore.overall_score)}
                        strokeWidth="4"
                        strokeDasharray={`${(aiScore.overall_score / 100) * 176} 176`}
                        strokeLinecap="round"
                        strokeDashoffset="44"
                        transform="rotate(-90 32 32)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-extrabold text-white">{aiScore.overall_score}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white mb-1">
                      {getScoreLevel(aiScore.overall_score).label}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: AI_RECOMMENDATION_BG[aiScore.recommendation],
                        color:      AI_RECOMMENDATION_COLORS[aiScore.recommendation],
                      }}>
                      <Zap size={9}/>
                      {AI_RECOMMENDATION_LABELS[aiScore.recommendation]}
                    </div>
                  </div>
                </div>

                {/* Axes breakdown */}
                {aiScore.score_breakdown && Object.keys(aiScore.score_breakdown).length > 0 && (
                  <div className="space-y-2.5">
                    {Object.entries(aiScore.score_breakdown).map(([axis, val]) => (
                      <ScoreBar
                        key={axis}
                        label={SCORE_AXES_LABELS[axis] ?? axis}
                        value={val}
                        color={SCORE_AXES_COLORS[axis] ?? '#6366F1'}
                      />
                    ))}
                  </div>
                )}

                {/* Résumé IA */}
                {aiScore.ai_summary && (
                  <div className="rounded-xl p-3.5"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <p className="text-[12px] text-white/60 leading-relaxed italic">
                      "{aiScore.ai_summary}"
                    </p>
                  </div>
                )}

                {/* Points forts */}
                {aiScore.strengths?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp size={13} className="text-emerald-400"/>
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                        Points forts
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {aiScore.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0"/>
                          <p className="text-[12px] text-white/60">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lacunes */}
                {aiScore.gaps?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingDown size={13} className="text-amber-400"/>
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                        Lacunes identifiées
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {aiScore.gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle size={12} className="text-amber-400 mt-0.5 flex-shrink-0"/>
                          <p className="text-[12px] text-white/60">{g}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date analyse */}
                <p className="text-[10px] text-white/20 text-right">
                  Analysé le {new Date(aiScore.analyzed_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Export principal : badge cliquable + modal ───────────────
export default function CandidateAIScore({ applicationId, candidateName }) {
  const [open, setOpen] = useState(false)
  const analyze = useAnalyzeCandidate()

  const handleClick = () => {
    setOpen(true)
    // Auto-lancer l'analyse si non encore faite
  }

  return (
    <>
      <AIScoreBadge applicationId={applicationId} onClick={handleClick}/>
      {open && (
        <AIScoreModal
          applicationId={applicationId}
          candidateName={candidateName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
