// ============================================================
// APEX RH — MyOnboardingJourney.jsx  ·  Session 75
// Timeline visuelle collaborateur — marquage étapes
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Clock, AlertCircle,
  ChevronDown, ChevronUp, User, Users, Shield,
  SkipForward, MessageSquare, Calendar,
} from 'lucide-react'
import { useMyOnboardingProgress, useCompleteStep } from '../../hooks/useOnboarding'

const CATEGORY_COLORS = {
  administrative: '#6366F1',
  equipment:      '#F59E0B',
  access:         '#10B981',
  training:       '#8B5CF6',
  meeting:        '#3B82F6',
  documentation:  '#EC4899',
  other:          '#6B7280',
}

const CATEGORY_LABELS = {
  administrative: 'Administratif',
  equipment:      'Équipement',
  access:         'Accès & Outils',
  training:       'Formation',
  meeting:        'Réunion',
  documentation:  'Documentation',
  other:          'Autre',
}

const ASSIGNEE_ICONS = {
  self:    { icon: User,   label: 'À vous',    color: '#4F46E5' },
  manager: { icon: Users,  label: 'Manager',   color: '#3B82F6' },
  rh:      { icon: Shield, label: 'RH',        color: '#10B981' },
}

const STATUS_CONFIG = {
  pending:     { icon: Circle,       color: '#ffffff30', label: 'En attente' },
  in_progress: { icon: Clock,        color: '#F59E0B',   label: 'En cours' },
  completed:   { icon: CheckCircle2, color: '#10B981',   label: 'Terminé' },
  skipped:     { icon: SkipForward,  color: '#6B7280',   label: 'Passé' },
  overdue:     { icon: AlertCircle,  color: '#EF4444',   label: 'En retard' },
}

// ─── Modal de complétion ──────────────────────────────────────
function CompleteModal({ step, completionId, onClose, onComplete }) {
  const [comment, setComment] = useState('')
  const completeStep = useCompleteStep()

  const handle = async (skip = false) => {
    await completeStep.mutateAsync({ completionId, comment, skip })
    onComplete()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: 'linear-gradient(135deg, #1a1a3e, #12122a)', border: '1px solid rgba(16,185,129,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Valider l'étape</h3>
            <p className="text-xs text-white/40 truncate max-w-[200px]">{step.title}</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 mb-1 block flex items-center gap-1">
            <MessageSquare size={10} /> Commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Ajoutez une note..."
            className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-emerald-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handle(true)}
            className="flex-1 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/10"
          >
            Passer
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/10"
          >
            Annuler
          </button>
          <button
            onClick={() => handle(false)}
            disabled={completeStep.isPending}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {completeStep.isPending
              ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              : <><CheckCircle2 size={12} /> Valider</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Étape timeline ───────────────────────────────────────────
function TimelineStep({ completion, startDate, index, isLast }) {
  const [open, setOpen] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)

  const step   = completion.onboarding_steps
  if (!step) return null

  const status    = completion.status || 'pending'
  const cfg       = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon
  const catColor  = CATEGORY_COLORS[step.category] || '#6B7280'
  const assign    = ASSIGNEE_ICONS[step.assignee_type] || ASSIGNEE_ICONS.self
  const AssignIcon = assign.icon

  // Date d'échéance
  let dueDate = null
  if (startDate) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + step.due_day_offset)
    dueDate = d
  }
  const isOverdue = dueDate && dueDate < new Date() && status === 'pending'
  const effectiveStatus = isOverdue ? 'overdue' : status
  const effectiveCfg = STATUS_CONFIG[effectiveStatus] || cfg

  const canComplete = ['pending', 'in_progress', 'overdue'].includes(effectiveStatus)

  return (
    <div className="flex gap-3">
      {/* Ligne timeline */}
      <div className="flex flex-col items-center flex-shrink-0 w-6">
        <motion.div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
          style={{
            background: effectiveCfg.color === '#ffffff30'
              ? 'rgba(255,255,255,0.06)'
              : `${effectiveCfg.color}20`,
            border: `2px solid ${effectiveCfg.color}`,
          }}
        >
          <effectiveCfg.icon size={12} style={{ color: effectiveCfg.color }} />
        </motion.div>
        {!isLast && (
          <div className="flex-1 w-0.5 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 pb-4">
        <motion.div
          className="rounded-xl overflow-hidden cursor-pointer"
          style={{
            background: effectiveStatus === 'completed'
              ? 'rgba(16,185,129,0.04)'
              : effectiveStatus === 'overdue'
              ? 'rgba(239,68,68,0.05)'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${
              effectiveStatus === 'completed' ? 'rgba(16,185,129,0.15)'
              : effectiveStatus === 'overdue' ? 'rgba(239,68,68,0.2)'
              : 'rgba(255,255,255,0.06)'
            }`,
          }}
          whileHover={{ scale: 1.005 }}
          onClick={() => setOpen(p => !p)}
        >
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${
                  effectiveStatus === 'completed' ? 'text-white/50 line-through' : 'text-white'
                }`}>{step.title}</span>
                {step.is_required && effectiveStatus !== 'completed' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
                    Obligatoire
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: `${catColor}15`, color: catColor }}>
                  {CATEGORY_LABELS[step.category] || 'Autre'}
                </span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: assign.color }}>
                  <AssignIcon size={9} /> {assign.label}
                </span>
                {dueDate && (
                  <span className={`flex items-center gap-1 text-[10px] ${
                    isOverdue ? 'text-red-400' : 'text-white/30'
                  }`}>
                    <Calendar size={9} />
                    J+{step.due_day_offset}
                    {isOverdue && ' — En retard'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-medium" style={{ color: effectiveCfg.color }}>
                {effectiveCfg.label}
              </span>
              {open ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
            </div>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-3 pb-3 space-y-2">
                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  {step.description && (
                    <p className="text-xs text-white/50 leading-relaxed">{step.description}</p>
                  )}
                  {completion.comment && (
                    <div className="px-2.5 py-2 rounded-lg text-xs text-white/40 italic"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      "{completion.comment}"
                    </div>
                  )}
                  {completion.completed_at && (
                    <p className="text-[10px] text-white/25">
                      Complété le {new Date(completion.completed_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {canComplete && (
                    <button
                      onClick={e => { e.stopPropagation(); setCompleteModal(true) }}
                      className="w-full py-2 rounded-lg text-xs font-semibold text-white mt-1"
                      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.3))' }}
                    >
                      ✓ Marquer comme terminé
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {completeModal && (
          <CompleteModal
            step={step}
            completionId={completion.id}
            onClose={() => setCompleteModal(false)}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function MyOnboardingJourney() {
  const { data: assignments = [], isLoading } = useMyOnboardingProgress()

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  if (assignments.length === 0) return (
    <div className="text-center py-12 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
      <CheckCircle2 size={36} className="mx-auto text-white/15 mb-3" />
      <p className="text-white/40">Aucun parcours en cours</p>
      <p className="text-white/25 text-xs mt-1">Votre manager ou RH vous assignera un parcours</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {assignments.map(assignment => {
        const completions = assignment.onboarding_step_completions || []
        const sorted = [...completions].sort(
          (a, b) => (a.onboarding_steps?.order_index ?? 0) - (b.onboarding_steps?.order_index ?? 0)
        )
        const total     = completions.length
        const completed = completions.filter(c => c.status === 'completed').length
        const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
        const overdue   = completions.filter(c => {
          if (!assignment.start_date || c.status !== 'pending') return false
          const s = c.onboarding_steps
          if (!s) return false
          const d = new Date(assignment.start_date)
          d.setDate(d.getDate() + s.due_day_offset)
          return d < new Date()
        }).length

        return (
          <motion.div
            key={assignment.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Header parcours */}
            <div className="p-5 pb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {assignment.onboarding_templates?.name}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Démarré le {new Date(assignment.start_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-2xl font-extrabold text-white">{pct}%</span>
                  {overdue > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                      <AlertCircle size={9} /> {overdue} en retard
                    </span>
                  )}
                </div>
              </div>

              {/* Barre de progression */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: pct === 100 ? '#10B981' : 'linear-gradient(90deg, #6366F1, #8B5CF6)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-white/30">{completed}/{total} étapes complétées</span>
                {pct === 100 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">🎉 Parcours terminé !</span>
                )}
              </div>

              {/* Catégories résumé */}
              {['administrative','equipment','access','training','meeting','documentation'].map(cat => {
                const catSteps = sorted.filter(c => c.onboarding_steps?.category === cat)
                if (catSteps.length === 0) return null
                const done = catSteps.filter(c => c.status === 'completed').length
                const color = CATEGORY_COLORS[cat]
                return (
                  <span key={cat} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full mr-1.5 mt-2"
                    style={{ background: `${color}15`, color }}>
                    {done}/{catSteps.length} {CATEGORY_LABELS[cat]}
                  </span>
                )
              })}
            </div>

            <div className="h-px mx-5" style={{ background: 'rgba(255,255,255,0.05)' }} />

            {/* Timeline */}
            <div className="p-5 pt-4">
              {sorted.map((completion, i) => (
                <TimelineStep
                  key={completion.id}
                  completion={completion}
                  startDate={assignment.start_date}
                  index={i}
                  isLast={i === sorted.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
