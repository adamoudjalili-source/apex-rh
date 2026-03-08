// ============================================================
// APEX RH — ManagerReviewPanel.jsx
// ✅ Session 22 — Panneau d'évaluation manager PULSE (Phase B)
// ============================================================

// 1. React hooks
import { useState } from 'react'
// 2. Librairies externes
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, CheckCircle2, XCircle, AlertCircle,
  Clock, MessageSquare, ChevronDown, ChevronUp,
  Sun, Moon, BarChart2, User
} from 'lucide-react'
// 4. Contexts
import { useAuth } from '../../contexts/AuthContext'
// 5. Hooks projet
import { useSubmitReview } from '../../hooks/useManagerReview'
// 6. Helpers
import {
  PULSE_COLORS,
  formatMinutes,
  TASK_STATUS_LABELS,
  BLOCK_TYPE_LABELS,
  SATISFACTION_LABELS,
} from '../../lib/pulseHelpers'

/**
 * Panneau complet d'évaluation d'un journal collaborateur.
 *
 * Props :
 *   log         {object}  — daily_log complet avec entries + morning_plan + user
 *   onClose     {fn}      — callback fermeture
 */
export default function ManagerReviewPanel({ log, onClose }) {
  const { profile } = useAuth()
  const submitReview = useSubmitReview()

  const [qualityRating, setQualityRating] = useState(
    log?.manager_reviews?.[0]?.quality_rating || 0
  )
  const [comment, setComment] = useState(
    log?.manager_reviews?.[0]?.comment || ''
  )
  const [showEntries, setShowEntries] = useState(true)
  const [showPlan, setShowPlan] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const existingReview = log?.manager_reviews?.[0]
  const isAlreadyReviewed = existingReview && ['approved', 'rejected', 'correction_requested'].includes(existingReview.review_status)
  const entries = log?.daily_log_entries || []
  const totalTime = entries.reduce((s, e) => s + (e.time_spent_min || 0), 0)

  // ─── Soumettre évaluation ─────────────────────────────────
  const handleSubmit = async (reviewStatus) => {
    if (qualityRating === 0) {
      setError('Veuillez attribuer une note de qualité (1–5 étoiles).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitReview.mutateAsync({
        logId: log.id,
        qualityRating,
        comment,
        reviewStatus,
      })
      onClose?.()
    } catch (e) {
      setError(e.message || 'Erreur lors de la soumission.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!log) return null

  const userName = log.user
    ? `${log.user.first_name} ${log.user.last_name}`
    : 'Collaborateur'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex flex-col h-full overflow-y-auto"
      style={{ maxHeight: '100vh' }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            {log.user?.first_name?.[0]}{log.user?.last_name?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-white/30">Évaluation du journal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 p-5 space-y-5">

        {/* Statut actuel */}
        <LogStatusBanner log={log} existingReview={existingReview} />

        {/* Résumé global */}
        <div
          className="rounded-xl p-4 grid grid-cols-3 gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <StatPill icon={<Clock size={13} />} label="Temps total" value={formatMinutes(totalTime)} />
          <StatPill icon={<BarChart2 size={13} />} label="Entrées" value={`${entries.length} tâche${entries.length > 1 ? 's' : ''}`} />
          <StatPill
            icon={<span>{SATISFACTION_LABELS[log.satisfaction_level]?.split(' ')[0] || '—'}</span>}
            label="Satisfaction"
            value={log.satisfaction_level ? `${log.satisfaction_level}/5` : 'N/A'}
          />
        </div>

        {/* Brief matinal — repliable */}
        <Collapsible
          title="Brief matinal"
          icon={<Sun size={14} className="text-amber-400" />}
          open={showPlan}
          onToggle={() => setShowPlan(v => !v)}
        >
          {log.morning_plan ? (
            <div className="space-y-2 text-sm text-white/60">
              <p>
                <span className="text-white/30">Disponibilité : </span>
                {log.morning_plan.available_hours}h
              </p>
              {log.morning_plan.note && (
                <p>
                  <span className="text-white/30">Note : </span>
                  {log.morning_plan.note}
                </p>
              )}
              <p className="text-white/30 text-xs">
                Soumis à {log.morning_plan.submitted_at
                  ? new Date(log.morning_plan.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/30 italic">Brief non soumis</p>
          )}
        </Collapsible>

        {/* Entrées du journal — repliable */}
        <Collapsible
          title={`Journal du soir (${entries.length} tâche${entries.length > 1 ? 's' : ''})`}
          icon={<Moon size={14} className="text-indigo-400" />}
          open={showEntries}
          onToggle={() => setShowEntries(v => !v)}
        >
          {entries.length === 0 ? (
            <p className="text-sm text-white/30 italic">Aucune entrée</p>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {/* Note globale */}
          {log.overall_note && (
            <div
              className="mt-3 rounded-lg p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs text-white/30 mb-1">Note globale du collaborateur</p>
              <p className="text-sm text-white/70">{log.overall_note}</p>
            </div>
          )}
        </Collapsible>

        {/* ─── ZONE D'ÉVALUATION ─────────────────────────────── */}
        {!isAlreadyReviewed ? (
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)' }}
          >
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Star size={14} className="text-amber-400" />
              Votre évaluation
            </h3>

            {/* Note qualité */}
            <div>
              <p className="text-xs text-white/40 mb-2">Note de qualité (1–5 étoiles)</p>
              <StarRating value={qualityRating} onChange={setQualityRating} />
            </div>

            {/* Commentaire */}
            <div>
              <p className="text-xs text-white/40 mb-2">Commentaire (optionnel)</p>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Feedback constructif, points d'amélioration..."
                className="w-full rounded-lg px-3 py-2 text-sm text-white/80 resize-none outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit('approved')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: '#10B981' }}
              >
                <CheckCircle2 size={14} />
                Valider
              </button>
              <button
                onClick={() => handleSubmit('correction_requested')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <AlertCircle size={14} />
                Correction
              </button>
              <button
                onClick={() => handleSubmit('rejected')}
                disabled={submitting}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <XCircle size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Évaluation déjà faite */
          <ExistingReviewCard review={existingReview} />
        )}
      </div>
    </motion.div>
  )
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────

function LogStatusBanner({ log, existingReview }) {
  const configs = {
    draft:     { label: 'En cours de rédaction', color: PULSE_COLORS.neutral, icon: <Clock size={13} /> },
    submitted: { label: 'Soumis — en attente d\'évaluation', color: PULSE_COLORS.warning, icon: <AlertCircle size={13} /> },
    validated: { label: 'Validé', color: PULSE_COLORS.success, icon: <CheckCircle2 size={13} /> },
    rejected:  { label: 'Rejeté / Correction demandée', color: PULSE_COLORS.danger, icon: <XCircle size={13} /> },
  }
  const cfg = configs[log.status] || configs.draft

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}
    >
      <span style={{ color: cfg.color }}>{cfg.icon}</span>
      <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
      {log.submitted_at && (
        <span className="text-xs text-white/30 ml-auto">
          {new Date(log.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}

function StatPill({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-white/30">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white/70">{value}</span>
    </div>
  )
}

function Collapsible({ title, icon, open, onToggle, children }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white/70">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EntryRow({ entry }) {
  const statusColor = {
    terminee: PULSE_COLORS.success,
    en_cours: PULSE_COLORS.warning,
    bloquee:  PULSE_COLORS.danger,
    reporte:  PULSE_COLORS.neutral,
  }[entry.task_status] || PULSE_COLORS.neutral

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-white/80 leading-tight">
          {entry.task?.title || 'Tâche inconnue'}
        </p>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
          style={{ color: statusColor, background: `${statusColor}15` }}
        >
          {TASK_STATUS_LABELS[entry.task_status] || entry.task_status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-white/30">
        <span>{formatMinutes(entry.time_spent_min)}</span>
        <span>{entry.progress_before}% → {entry.progress_after}%</span>
        {entry.block_type && (
          <span className="text-red-400">
            ⚠ {BLOCK_TYPE_LABELS[entry.block_type] || entry.block_type}
          </span>
        )}
      </div>

      {entry.block_note && (
        <p className="text-[10px] text-orange-300/60 italic">{entry.block_note}</p>
      )}
    </div>
  )
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={22}
            className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-white/20'}
          />
        </button>
      ))}
      <span className="text-xs text-white/30 ml-2">
        {value > 0 ? `${value}/5` : 'Non noté'}
      </span>
    </div>
  )
}

function ExistingReviewCard({ review }) {
  const configs = {
    approved:             { label: 'Validé', color: PULSE_COLORS.success, icon: <CheckCircle2 size={13} /> },
    rejected:             { label: 'Rejeté', color: PULSE_COLORS.danger,  icon: <XCircle size={13} /> },
    correction_requested: { label: 'Correction demandée', color: PULSE_COLORS.warning, icon: <AlertCircle size={13} /> },
  }
  const cfg = configs[review.review_status] || configs.approved

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="text-xs text-white/20 ml-auto">
          {review.reviewed_at
            ? new Date(review.reviewed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>

      {/* Note qualité */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <Star
            key={n}
            size={14}
            className={n <= review.quality_rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}
          />
        ))}
        <span className="text-xs text-white/30 ml-1">{review.quality_rating}/5</span>
      </div>

      {review.comment && (
        <p className="text-xs text-white/50 italic">"{review.comment}"</p>
      )}
    </div>
  )
}
