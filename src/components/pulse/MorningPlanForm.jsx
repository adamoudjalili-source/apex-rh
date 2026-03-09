// ============================================================
// APEX RH — MorningPlanForm.jsx
// ✅ Session 21 — Formulaire Brief Matinal PULSE
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sun, Check, Clock, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle2, Lock, Loader2, FileText
} from 'lucide-react'
import {
  useMyActiveTasks,
  useTodayMorningPlan,
  useSubmitMorningPlan,
  useSaveMorningPlan,
} from '../../hooks/usePulse'
import {
  PULSE_COLORS,
  formatDateFr,
  getTodayString,
  getAvailabilityOptions,
  formatHoursDecimal,
  isBriefDeadlinePassed,
  isBriefAccessible,
} from '../../lib/pulseHelpers'

const PRIORITY_COLORS = {
  haute:   '#EF4444',
  moyenne: '#F59E0B',
  basse:   '#6B7280',
  urgente: '#EC4899',
}

export default function MorningPlanForm({ settings }) {
  const today = getTodayString()
  const { data: plan, isLoading: planLoading } = useTodayMorningPlan()
  const { data: activeTasks = [], isLoading: tasksLoading } = useMyActiveTasks()
  const submitPlan   = useSubmitMorningPlan()
  const saveDraft    = useSaveMorningPlan()

  const [selectedTaskIds, setSelectedTaskIds] = useState([])
  const [availableHours, setAvailableHours]   = useState(8.0)
  const [note, setNote]                       = useState('')
  const [submitted, setSubmitted]             = useState(false)
  const [showAllTasks, setShowAllTasks]       = useState(false)

  const deadlinePassed = isBriefDeadlinePassed(settings)
  const accessible     = isBriefAccessible(settings)
  const isReadOnly     = plan?.status === 'submitted' || plan?.status === 'acknowledged'

  // Pré-remplir depuis le brouillon existant
  useEffect(() => {
    if (plan) {
      setSelectedTaskIds(plan.planned_task_ids || [])
      setAvailableHours(plan.available_hours ?? 8.0)
      setNote(plan.note || '')
    }
  }, [plan])

  const toggleTask = (taskId) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    )
  }

  const handleSubmit = async () => {
    try {
      await submitPlan.mutateAsync({ plannedTaskIds: selectedTaskIds, availableHours, note })
      setSubmitted(true)
    } catch (err) {
    }
  }

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({ plannedTaskIds: selectedTaskIds, availableHours, note })
    } catch (err) {
    }
  }

  if (planLoading || tasksLoading) return <BriefSkeleton />

  // Vue lecture seule si déjà soumis
  if (isReadOnly || submitted) {
    return <BriefReadOnly plan={plan} activeTasks={activeTasks} />
  }

  // Fenêtre pas encore ouverte
  if (!accessible) {
    const startTime = settings?.pulse_brief_start || '07:00'
    return (
      <div className="rounded-xl p-6 text-center" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Clock size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-white/60 font-medium">Le brief matinal ouvre à {startTime}</p>
        <p className="text-white/30 text-sm mt-1">{formatDateFr(today)}</p>
      </div>
    )
  }

  const displayedTasks = showAllTasks ? activeTasks : activeTasks.slice(0, 8)
  const availOpts      = getAvailabilityOptions()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* En-tête */}
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Sun size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Brief Matinal</h2>
            <p className="text-xs text-white/30">{formatDateFr(today)}</p>
          </div>
          {deadlinePassed && (
            <span className="ml-auto flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <Lock size={11} /> Délai dépassé
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 mt-2">
          Sélectionnez les tâches sur lesquelles vous allez travailler aujourd'hui
          et indiquez votre disponibilité.
        </p>
      </div>

      {/* Tâches planifiables */}
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">
            Tâches du jour
            {selectedTaskIds.length > 0 && (
              <span className="ml-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {selectedTaskIds.length} sélectionnée{selectedTaskIds.length > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {deadlinePassed && (
            <span className="text-xs text-white/30 flex items-center gap-1">
              <AlertCircle size={12} /> Lecture seule
            </span>
          )}
        </div>

        {activeTasks.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/30">Aucune tâche active pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedTasks.map(task => {
              const isSelected = selectedTaskIds.includes(task.id)
              return (
                <button
                  key={task.id}
                  onClick={() => !deadlinePassed && toggleTask(task.id)}
                  disabled={deadlinePassed}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-150 ${
                    isSelected
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'
                  } ${deadlinePassed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'bg-indigo-500' : 'bg-white/10'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isSelected ? 'text-white' : 'text-white/70'
                    }`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.due_date && (
                        <span className="text-[10px] text-white/30 flex items-center gap-1">
                          <Clock size={9} />
                          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {task.services?.name && (
                        <span className="text-[10px] text-white/20">{task.services.name}</span>
                      )}
                    </div>
                  </div>
                  {task.priority && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_COLORS[task.priority] || '#6B7280' }}
                    />
                  )}
                </button>
              )
            })}

            {activeTasks.length > 8 && (
              <button
                onClick={() => setShowAllTasks(!showAllTasks)}
                className="w-full flex items-center justify-center gap-1 p-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                {showAllTasks ? (
                  <><ChevronUp size={14} /> Voir moins</>
                ) : (
                  <><ChevronDown size={14} /> +{activeTasks.length - 8} autres tâches</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Disponibilité */}
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 className="text-sm font-semibold text-white mb-3">
          Disponibilité aujourd'hui
        </h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0} max={10} step={0.5}
            value={availableHours}
            onChange={e => setAvailableHours(Number(e.target.value))}
            disabled={deadlinePassed}
            className="flex-1 accent-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div
            className="w-20 text-center py-1.5 px-3 rounded-lg text-sm font-bold text-white"
            style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}
          >
            {formatHoursDecimal(availableHours)}
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/20">0h</span>
          <span className="text-[10px] text-white/20">5h</span>
          <span className="text-[10px] text-white/20">10h</span>
        </div>
      </div>

      {/* Note libre */}
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={15} className="text-white/40" />
          <h3 className="text-sm font-semibold text-white">Note (optionnel)</h3>
          <span className="ml-auto text-[10px] text-white/30">{note.length}/200</span>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 200))}
          disabled={deadlinePassed}
          placeholder="Contraintes du jour, absences prévues, réunions importantes…"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20
            focus:outline-none focus:border-indigo-500/50 resize-none transition-colors disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      {!deadlinePassed && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saveDraft.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60
              bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {saveDraft.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Sauvegarder
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitPlan.isPending || selectedTaskIds.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
              text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            {submitPlan.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Soumettre le brief
          </button>
        </div>
      )}

      {selectedTaskIds.length === 0 && !deadlinePassed && (
        <p className="text-xs text-white/30 text-center -mt-2">
          Sélectionnez au moins une tâche pour soumettre
        </p>
      )}

      {submitPlan.isError && (
        <p className="text-xs text-red-400 text-center">
          Erreur lors de la soumission. Veuillez réessayer.
        </p>
      )}
    </motion.div>
  )
}

// ─── VUE LECTURE SEULE ───────────────────────────────────────
function BriefReadOnly({ plan, activeTasks }) {
  if (!plan) return null

  const plannedTasks = activeTasks.filter(t => plan.planned_task_ids?.includes(t.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 space-y-4"
      style={{
        background: 'rgba(16,185,129,0.05)',
        border: '1px solid rgba(16,185,129,0.15)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)' }}>
          <CheckCircle2 size={20} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Brief matinal soumis ✓</p>
          {plan.submitted_at && (
            <p className="text-xs text-white/30">
              {new Date(plan.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/40">Disponibilité : {formatHoursDecimal(plan.available_hours)}</p>
        {plannedTasks.length > 0 && (
          <div>
            <p className="text-xs text-white/40 mb-1.5">Tâches planifiées :</p>
            <div className="space-y-1">
              {plannedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="text-xs text-white/60 truncate">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {plan.note && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-white/30 italic">{plan.note}</p>
          </div>
        )}
        {plan.manager_comment && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] text-white/30 mb-1">Commentaire manager :</p>
            <p className="text-xs text-white/60 italic">{plan.manager_comment}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── SKELETON ────────────────────────────────────────────────
function BriefSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-28 rounded-xl bg-white/[0.03] border border-white/[0.04]" />
      ))}
    </div>
  )
}
