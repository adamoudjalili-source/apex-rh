// ============================================================
// APEX RH — components/formation/MyEnrollments.jsx
// Session 57 — Mes formations (inscriptions + progression)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, PlayCircle, XCircle,
  Star, ChevronDown, ChevronUp, Loader2, BookOpen,
  BarChart2, ThumbsUp,
} from 'lucide-react'
import {
  useMyEnrollments, useUpdateEnrollment, useSubmitFeedback,
  useMyTrainingStats,
  ENROLLMENT_STATUS_LABELS, ENROLLMENT_STATUS_COLORS,
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS,
} from '../../hooks/useFormations'

const STATUS_ICONS = {
  inscrit:   Clock,
  en_cours:  PlayCircle,
  termine:   CheckCircle2,
  annule:    XCircle,
  abandonne: XCircle,
}

const STATUS_FILTER_OPTIONS = [
  { value: '',          label: 'Toutes' },
  { value: 'inscrit',   label: 'Inscrites' },
  { value: 'en_cours',  label: 'En cours' },
  { value: 'termine',   label: 'Terminées' },
  { value: 'annule',    label: 'Annulées' },
]

function ProgressBar({ value, color = '#3B82F6' }) {
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  )
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}>
          <Star size={18}
            className={n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-white/15'}/>
        </button>
      ))}
    </div>
  )
}

function FeedbackForm({ enrollmentId, onDone }) {
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const submit = useSubmitFeedback()

  async function handleSubmit() {
    if (!rating) return
    await submit.mutateAsync({ enrollmentId, rating, comment })
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden">
      <div className="mt-3 p-3 rounded-lg space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-xs font-medium text-white/50">Votre avis sur cette formation</p>
        <StarInput value={rating} onChange={setRating}/>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Commentaire optionnel…"
          rows={2}
          className="w-full text-sm text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 placeholder-white/20 outline-none focus:border-indigo-500/40 resize-none transition-colors"
        />
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={!rating || submit.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/30 disabled:opacity-40 transition-colors">
            {submit.isPending ? <Loader2 size={12} className="animate-spin"/> : <ThumbsUp size={12}/>}
            Envoyer
          </button>
          <button onClick={onDone}
            className="px-3 py-1.5 rounded-lg text-white/25 text-xs hover:text-white/50 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function EnrollmentRow({ enrollment }) {
  const [expanded, setExpanded]   = useState(false)
  const [showFeedback, setFeedback] = useState(false)
  const updateEnroll = useUpdateEnrollment()

  const {
    id, status, progress_pct = 0, enrolled_at, completed_at,
    feedback_rating, training_catalog: training,
  } = enrollment

  if (!training) return null

  const StatusIcon = STATUS_ICONS[status] || Clock
  const statusColor = ENROLLMENT_STATUS_COLORS[status] || '#6B7280'
  const typeColor   = TRAINING_TYPE_COLORS[training.type] || '#6366F1'
  const isCompleted = status === 'termine'
  const canStart    = status === 'inscrit'
  const inProgress  = status === 'en_cours'

  async function markInProgress() {
    await updateEnroll.mutateAsync({ id, status: 'en_cours' })
  }
  async function markCompleted() {
    await updateEnroll.mutateAsync({ id, status: 'termine' })
  }

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Statut icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${statusColor}18` }}>
            <StatusIcon size={15} style={{ color: statusColor }}/>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{training.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-medium" style={{ color: typeColor }}>
                    {TRAINING_TYPE_LABELS[training.type]}
                  </span>
                  {training.provider && (
                    <span className="text-[11px] text-white/25">• {training.provider}</span>
                  )}
                  {training.duration_hours && (
                    <span className="text-[11px] text-white/25">• {training.duration_hours}h</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${statusColor}15`, color: statusColor }}>
                  {ENROLLMENT_STATUS_LABELS[status]}
                </span>
                <button onClick={() => setExpanded(e => !e)}
                  className="text-white/20 hover:text-white/50 transition-colors">
                  {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
              </div>
            </div>

            {/* Barre progression */}
            {(inProgress || isCompleted) && (
              <div className="mt-2 space-y-0.5">
                <div className="flex justify-between text-[10px] text-white/25">
                  <span>Progression</span>
                  <span>{progress_pct}%</span>
                </div>
                <ProgressBar value={progress_pct} color={isCompleted ? '#10B981' : '#3B82F6'}/>
              </div>
            )}

            {/* Actions rapides */}
            {(canStart || inProgress) && !expanded && (
              <div className="flex gap-2 mt-2">
                {canStart && (
                  <button onClick={markInProgress} disabled={updateEnroll.isPending}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <PlayCircle size={12}/>
                    Démarrer
                  </button>
                )}
                {inProgress && (
                  <button onClick={markCompleted} disabled={updateEnroll.isPending}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                    <CheckCircle2 size={12}/>
                    Marquer terminé
                  </button>
                )}
              </div>
            )}

            {/* Note si terminé */}
            {isCompleted && feedback_rating && (
              <div className="flex items-center gap-1 mt-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11}
                    className={i < feedback_rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}/>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Détail expandé */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/[0.05]">
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/25 mb-0.5">Date d'inscription</p>
                  <p className="text-white/60">
                    {enrolled_at ? new Date(enrolled_at).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                {completed_at && (
                  <div>
                    <p className="text-white/25 mb-0.5">Terminée le</p>
                    <p className="text-emerald-400/80">
                      {new Date(completed_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {canStart && (
                  <button onClick={markInProgress} disabled={updateEnroll.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors">
                    <PlayCircle size={12}/>
                    Démarrer la formation
                  </button>
                )}
                {inProgress && (
                  <button onClick={markCompleted} disabled={updateEnroll.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
                    <CheckCircle2 size={12}/>
                    Marquer comme terminé
                  </button>
                )}
                {isCompleted && !feedback_rating && !showFeedback && (
                  <button onClick={() => setFeedback(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors">
                    <Star size={12}/>
                    Donner mon avis
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showFeedback && (
                  <FeedbackForm
                    enrollmentId={id}
                    onDone={() => { setFeedback(false); setExpanded(false) }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MyEnrollments() {
  const [statusFilter, setStatus] = useState('')

  const { data: enrollments = [], isLoading } = useMyEnrollments({ status: statusFilter || undefined })
  const { data: stats } = useMyTrainingStats()

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'En attente',   value: stats.enrollments_pending,     color: '#6B7280' },
            { label: 'En cours',     value: stats.enrollments_in_progress, color: '#3B82F6' },
            { label: 'Terminées',    value: stats.enrollments_completed,   color: '#10B981' },
            { label: 'Heures',       value: `${stats.hours_completed || 0}h`, color: '#8B5CF6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres statut */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
          <button key={value}
            onClick={() => setStatus(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === value
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-indigo-400"/>
        </div>
      )}

      {/* Empty */}
      {!isLoading && enrollments.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <BookOpen size={32} className="text-white/10 mb-3"/>
          <p className="text-sm text-white/30">
            {statusFilter ? 'Aucune formation dans cet état.' : 'Vous n\'êtes inscrit à aucune formation.'}
          </p>
          <p className="text-xs text-white/20 mt-1">Explorez le catalogue pour vous inscrire.</p>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {enrollments.map(e => (
          <EnrollmentRow key={e.id} enrollment={e}/>
        ))}
      </div>
    </div>
  )
}
