// ============================================================
// APEX RH — src/components/formation/FormationEvaluation.jsx
// Session 73 — Évaluation post-formation : satisfaction + efficacité J+30
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, CheckCircle2, Clock, TrendingUp, MessageSquare, Award, BarChart2 } from 'lucide-react'
import {
  useMyPendingEvaluations, useMyEnrollments,
  useSubmitSatisfaction, useSubmitEffectiveness,
  useGlobalEvaluationStats,
} from '../../hooks/useFormations'
import { useAuth } from '../../contexts/AuthContext'

// ─── StarRating ───────────────────────────────────────────────
function StarRating({ value, onChange, size = 20 }) {
  const [hovered, setHovered] = useState(0)
  const labels = ['', 'Très insuffisant', 'Insuffisant', 'Satisfaisant', 'Bien', 'Excellent']
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110">
            <Star
              size={size}
              fill={(hovered || value) >= n ? '#F59E0B' : 'transparent'}
              stroke={(hovered || value) >= n ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
            />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <p className="text-xs text-amber-400">{labels[hovered || value]}</p>
      )}
    </div>
  )
}

// ─── Gauge SVG ────────────────────────────────────────────────
function ScoreGauge({ value, max = 5, label, color = '#F59E0B' }) {
  if (!value) return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white/20">—</div>
      <p className="text-xs text-white/30 mt-0.5">{label}</p>
    </div>
  )
  const pct = (value / max) * 100
  const r = 28, cx = 36, cy = 36
  const circumference = 2 * Math.PI * r
  const stroke = circumference * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center">
      <svg width="72" height="72">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={stroke}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
          {value.toFixed(1)}
        </text>
      </svg>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  )
}

// ─── Modal évaluation ─────────────────────────────────────────
function EvaluationModal({ enrollment, type, onClose }) {
  const [score, setScore]     = useState(0)
  const [comment, setComment] = useState('')
  const { mutateAsync: submitSat, isPending: pendingSat } = useSubmitSatisfaction()
  const { mutateAsync: submitEff, isPending: pendingEff } = useSubmitEffectiveness()

  const isPending = pendingSat || pendingEff
  const isSatisfaction = type === 'satisfaction'

  const handle = async () => {
    if (!score) return
    if (isSatisfaction) {
      await submitSat({ enrollmentId: enrollment.id, satisfaction_score: score, satisfaction_comment: comment })
    } else {
      await submitEff({ enrollmentId: enrollment.id, effectiveness_score: score, effectiveness_comment: comment })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: '#161B2E', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <p className="text-base font-bold text-white">
            {isSatisfaction ? 'Évaluation de satisfaction' : 'Évaluation d\'efficacité (J+30)'}
          </p>
          <p className="text-sm text-white/40 mt-1">{enrollment.training_catalog?.title}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            {isSatisfaction
              ? 'Dans l\'ensemble, êtes-vous satisfait de cette formation ?'
              : 'Dans quelle mesure cette formation a-t-elle amélioré vos compétences ?'}
          </p>
          <StarRating value={score} onChange={setScore} size={28}/>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Commentaire (optionnel)</p>
          <textarea
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            placeholder={isSatisfaction
              ? 'Ce qui vous a plu ou déplu, suggestions...'
              : 'Compétences acquises, impact sur votre travail...'}
            value={comment} onChange={e => setComment(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button onClick={handle} disabled={!score || isPending}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition"
            style={{ background: isSatisfaction ? 'rgba(245,158,11,0.6)' : 'rgba(99,102,241,0.6)' }}>
            {isPending ? 'Envoi...' : 'Soumettre'}
          </button>
          <button onClick={onClose}
            className="px-4 rounded-xl text-sm text-white/40 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            Plus tard
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Panel évaluations en attente (collaborateur) ─────────────
function PendingEvaluationsPanel() {
  const { data: pending = [], isLoading } = useMyPendingEvaluations()
  const [modal, setModal] = useState(null) // { enrollment, type }

  if (isLoading) return <div className="text-center py-6 text-white/20 text-sm">Chargement...</div>
  if (!pending.length) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
      <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: '#10B981' }}/>
      <p className="text-sm font-semibold text-white">Toutes vos évaluations sont complètes !</p>
      <p className="text-xs text-white/30 mt-1">Aucune formation en attente d'évaluation.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white">{pending.length} formation{pending.length > 1 ? 's' : ''} à évaluer</p>
      {pending.map(e => {
        const completedAt = e.completed_at ? new Date(e.completed_at) : null
        const now = new Date()
        const daysSince = completedAt ? Math.floor((now - completedAt) / (1000*60*60*24)) : 0
        const needsEff = !e.effectiveness_score && daysSince >= 30

        return (
          <div key={e.id} className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{e.training_catalog?.title}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  Terminé le {completedAt?.toLocaleDateString('fr-FR')}
                  {needsEff && ` · ${daysSince} jours`}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {!e.satisfaction_score && (
                  <button onClick={() => setModal({ enrollment: e, type: 'satisfaction' })}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition"
                    style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Star size={11}/> Satisfaction
                  </button>
                )}
                {needsEff && (
                  <button onClick={() => setModal({ enrollment: e, type: 'effectiveness' })}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-300 transition"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <TrendingUp size={11}/> Efficacité J+30
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <AnimatePresence>
        {modal && (
          <EvaluationModal enrollment={modal.enrollment} type={modal.type} onClose={() => setModal(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Panel stats évaluation (admin) ───────────────────────────
function EvaluationStatsPanel() {
  const { data: stats } = useGlobalEvaluationStats()
  if (!stats) return <div className="text-center py-6 text-white/20 text-sm">Chargement...</div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Formations terminées', value: stats.total_completed, color: '#6366F1' },
          { label: 'Taux éval. satisfaction', value: `${stats.response_rate_sat}%`, color: '#F59E0B' },
          { label: 'Taux éval. efficacité', value: `${stats.response_rate_eff}%`, color: '#8B5CF6' },
          { label: 'Note moy. satisfaction', value: stats.avg_satisfaction ? `${stats.avg_satisfaction}/5` : '—', color: '#10B981' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-lg font-bold text-white" style={{ color }}>{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Note de satisfaction</p>
          <ScoreGauge value={stats.avg_satisfaction} label={`${stats.satisfaction_count} réponses`} color="#F59E0B"/>
        </div>
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Note d'efficacité J+30</p>
          <ScoreGauge value={stats.avg_effectiveness} label={`${stats.effectiveness_count} réponses`} color="#6366F1"/>
        </div>
      </div>

      {/* Barre participation */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Taux de participation aux évaluations</p>
        {[
          { label: 'Satisfaction', pct: stats.response_rate_sat, color: '#F59E0B' },
          { label: 'Efficacité J+30', pct: stats.response_rate_eff, color: '#6366F1' },
        ].map(({ label, pct, color }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>{label}</span><span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────
export default function FormationEvaluation() {
  const { canAdmin } = useAuth()
  const [view, setView] = useState('pending')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { id: 'pending', label: 'Mes évaluations', icon: Star },
          ...(canAdmin ? [{ id: 'stats', label: 'Statistiques', icon: BarChart2 }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
            style={view === t.id ? { background: 'rgba(245,158,11,0.3)' } : {}}>
            <t.icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      {view === 'pending' && <PendingEvaluationsPanel/>}
      {view === 'stats'   && <EvaluationStatsPanel/>}
    </div>
  )
}
