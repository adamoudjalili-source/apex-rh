// ============================================================
// APEX RH — DailyLogForm.jsx
// ✅ Session 21 — Formulaire Journal du Soir PULSE
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon, Check, Plus, AlertCircle, CheckCircle2,
  Lock, Loader2, Star, Search, X
} from 'lucide-react'
import LogEntryRow from './LogEntryRow'
import {
  useTodayLog,
  useTodayMorningPlan,
  useEnsureTodayLog,
  useAddLogEntry,
  useSubmitLog,
  useUpdateLog,
  useMyActiveTasks,
} from '../../hooks/usePulse'
import {
  PULSE_COLORS,
  formatDateFr,
  getTodayString,
  isJournalDeadlinePassed,
  isJournalAccessible,
  SATISFACTION_LABELS,
} from '../../lib/pulseHelpers'

export default function DailyLogForm({ settings }) {
  const today = getTodayString()
  const { data: log,         isLoading: logLoading  } = useTodayLog()
  const { data: morningPlan                          } = useTodayMorningPlan()
  const { data: activeTasks = []                     } = useMyActiveTasks()
  const ensureLog    = useEnsureTodayLog()
  const addEntry     = useAddLogEntry()
  const submitLog    = useSubmitLog()
  const updateLog    = useUpdateLog()

  const [overallNote,       setOverallNote]       = useState('')
  const [satisfactionLevel, setSatisfactionLevel] = useState(null)
  const [showTaskPicker,    setShowTaskPicker]     = useState(false)
  const [taskSearch,        setTaskSearch]         = useState('')
  const [initialized,       setInitialized]        = useState(false)
  const [submitting,        setSubmitting]         = useState(false)

  const deadlinePassed = isJournalDeadlinePassed(settings)
  const accessible     = isJournalAccessible(settings)
  const isReadOnly     = log?.status === 'submitted' || log?.status === 'validated' || log?.status === 'rejected'

  // Pré-remplir depuis le log existant
  useEffect(() => {
    if (log && !initialized) {
      setOverallNote(log.overall_note || '')
      setSatisfactionLevel(log.satisfaction_level || null)
      setInitialized(true)
    }
  }, [log, initialized])

  // Créer automatiquement le log en draft + pré-remplir depuis le brief
  const handleInit = async () => {
    const logData = await ensureLog.mutateAsync()

    // Pré-remplir avec les tâches du brief matinal si le log n'a pas encore d'entrées
    if (logData && (!log?.daily_log_entries || log.daily_log_entries.length === 0) && morningPlan?.planned_task_ids?.length > 0) {
      for (const taskId of morningPlan.planned_task_ids) {
        await addEntry.mutateAsync({ logId: logData.id, taskId })
      }
    }
  }

  const handleAddTask = async (taskId) => {
    if (!log?.id) return
    // Vérifier que la tâche n'est pas déjà dans le log
    const alreadyIn = log.daily_log_entries?.some(e => e.task_id === taskId)
    if (alreadyIn) { setShowTaskPicker(false); return }

    await addEntry.mutateAsync({ logId: log.id, taskId })
    setShowTaskPicker(false)
    setTaskSearch('')
  }

  const handleSubmit = async () => {
    if (!log?.id) return
    setSubmitting(true)
    try {
      // Sauvegarder note et satisfaction avant soumission
      await updateLog.mutateAsync({
        logId: log.id,
        updates: { overall_note: overallNote || null, satisfaction_level: satisfactionLevel }
      })
      // Soumettre
      await submitLog.mutateAsync({
        logId: log.id,
        deadlineMissed: deadlinePassed,
        overallNote,
        satisfactionLevel,
      })
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }

  if (logLoading) return <LogSkeleton />

  // Fenêtre pas encore ouverte
  if (!accessible) {
    const startTime = settings?.pulse_journal_start || '16:00'
    return (
      <div className="rounded-xl p-6 text-center" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Moon size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-white/60 font-medium">Le journal du soir ouvre à {startTime}</p>
        <p className="text-white/30 text-sm mt-1">{formatDateFr(today)}</p>
      </div>
    )
  }

  // Vue lecture seule si déjà soumis
  if (isReadOnly) {
    return <LogReadOnly log={log} />
  }

  // Pas encore de log → bouton "Commencer le journal"
  if (!log) {
    return (
      <div className="rounded-xl p-6 text-center space-y-4" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Moon size={32} className="mx-auto text-indigo-400" />
        <div>
          <p className="text-white font-semibold">Prêt à clôturer votre journée ?</p>
          <p className="text-white/40 text-sm mt-1">
            {morningPlan?.planned_task_ids?.length > 0
              ? `${morningPlan.planned_task_ids.length} tâche(s) planifiées ce matin seront pré-remplies.`
              : 'Commencez le journal pour renseigner vos activités du jour.'
            }
          </p>
        </div>
        <button
          onClick={handleInit}
          disabled={ensureLog.isPending || addEntry.isPending}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl mx-auto
            text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          {(ensureLog.isPending || addEntry.isPending) ? (
            <Loader2 size={15} className="animate-spin" />
          ) : <Moon size={15} />}
          Commencer le journal
        </button>
        {deadlinePassed && (
          <p className="text-xs text-amber-400 flex items-center justify-center gap-1">
            <AlertCircle size={12} /> Soumission hors délai (sera marquée en retard)
          </p>
        )}
      </div>
    )
  }

  // Formulaire actif
  const entries = log.daily_log_entries || []
  const entryTaskIds = new Set(entries.map(e => e.task_id))
  const availableToAdd = activeTasks.filter(t =>
    !entryTaskIds.has(t.id) &&
    (taskSearch === '' || t.title.toLowerCase().includes(taskSearch.toLowerCase()))
  )

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
            style={{ background: 'rgba(79,70,229,0.15)' }}>
            <Moon size={20} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Journal du Soir</h2>
            <p className="text-xs text-white/30">{formatDateFr(today)}</p>
          </div>
          {deadlinePassed && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertCircle size={11} /> Soumission en retard
            </span>
          )}
        </div>
      </div>

      {/* Entrées tâches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Activités du jour
            <span className="ml-2 text-xs text-white/30">{entries.length} tâche{entries.length > 1 ? 's' : ''}</span>
          </h3>
          {!deadlinePassed && (
            <button
              onClick={() => setShowTaskPicker(!showTaskPicker)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={13} /> Ajouter une tâche
            </button>
          )}
        </div>

        {/* Picker de tâches */}
        <AnimatePresence>
          {showTaskPicker && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl p-3 space-y-2"
              style={{
                background: 'rgba(79,70,229,0.05)',
                border: '1px solid rgba(79,70,229,0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                  <Search size={13} className="text-white/30 flex-shrink-0" />
                  <input
                    autoFocus
                    value={taskSearch}
                    onChange={e => setTaskSearch(e.target.value)}
                    placeholder="Rechercher une tâche…"
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
                  />
                </div>
                <button onClick={() => { setShowTaskPicker(false); setTaskSearch('') }}
                  className="p-1.5 text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-2">Aucune tâche disponible</p>
                ) : (
                  availableToAdd.slice(0, 10).map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleAddTask(task.id)}
                      disabled={addEntry.isPending}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                        text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <Plus size={12} className="text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Liste des entrées */}
        {entries.length === 0 ? (
          <div className="py-6 text-center rounded-xl" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}>
            <p className="text-sm text-white/30">Aucune activité enregistrée</p>
            <p className="text-xs text-white/20 mt-1">Ajoutez vos tâches via le bouton ci-dessus</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <LogEntryRow key={entry.id} entry={entry} readOnly={deadlinePassed && false} />
            ))}
          </div>
        )}
      </div>

      {/* Note globale */}
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 className="text-sm font-semibold text-white mb-3">Bilan de la journée</h3>
        <textarea
          value={overallNote}
          onChange={e => setOverallNote(e.target.value)}
          placeholder="Points importants, obstacles, réussites, suggestions…"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white
            placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
        />
      </div>

      {/* Satisfaction */}
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 className="text-sm font-semibold text-white mb-3">Comment s'est passée votre journée ?</h3>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(val => (
            <button
              key={val}
              onClick={() => setSatisfactionLevel(prev => prev === val ? null : val)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all text-lg
                ${satisfactionLevel === val
                  ? 'bg-indigo-500/15 border border-indigo-500/30 scale-105'
                  : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05]'
                }`}
            >
              <span>{SATISFACTION_LABELS[val].split(' ')[0]}</span>
              <span className="text-[9px] text-white/30 hidden sm:block">
                {val === 1 ? 'Difficile' : val === 3 ? 'Neutre' : val === 5 ? 'Excellent' : ''}
              </span>
            </button>
          ))}
        </div>
        {satisfactionLevel && (
          <p className="text-xs text-white/40 text-center mt-2">
            {SATISFACTION_LABELS[satisfactionLevel]}
          </p>
        )}
      </div>

      {/* Bouton soumettre */}
      <div className="flex flex-col gap-3">
        {entries.length === 0 && (
          <p className="text-xs text-amber-400 text-center flex items-center justify-center gap-1">
            <AlertCircle size={12} /> Ajoutez au moins une activité avant de soumettre
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || entries.length === 0}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
            text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          {submitting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          {deadlinePassed ? 'Soumettre (hors délai)' : 'Soumettre le journal'}
        </button>
        {deadlinePassed && (
          <p className="text-[10px] text-white/30 text-center">
            Soumission après l'heure limite — sera notée comme retard (score Régularité = 50%)
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── VUE LECTURE SEULE ───────────────────────────────────────
function LogReadOnly({ log }) {
  const statusConfig = {
    submitted: { label: 'Journal soumis ✓', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.15)' },
    validated: { label: 'Journal validé ✓', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.15)' },
    rejected:  { label: 'Correction demandée', color: 'text-red-400',     bg: 'rgba(239,68,68,0.05)',   border: 'rgba(239,68,68,0.15)'   },
  }
  const cfg = statusConfig[log.status] || statusConfig.submitted
  const entries = log.daily_log_entries || []
  const review = log.manager_reviews?.[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 space-y-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 size={20} className={cfg.color} />
        <div>
          <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
          {log.submitted_at && (
            <p className="text-xs text-white/30">
              Soumis à {new Date(log.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {log.deadline_missed && <span className="ml-2 text-amber-400">· Hors délai</span>}
            </p>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(entry => (
            <LogEntryRow key={entry.id} entry={entry} readOnly />
          ))}
        </div>
      )}

      {log.overall_note && (
        <div className="border-t border-white/5 pt-3">
          <p className="text-xs text-white/30 mb-1">Note globale :</p>
          <p className="text-sm text-white/60 italic">{log.overall_note}</p>
        </div>
      )}

      {review && (
        <div className="border-t border-white/5 pt-3">
          <p className="text-xs text-white/30 mb-2">Évaluation manager :</p>
          <div className="flex items-center gap-2 mb-1">
            {[1,2,3,4,5].map(v => (
              <Star
                key={v}
                size={14}
                className={v <= (review.quality_rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
              />
            ))}
            <span className="text-xs text-white/50">{review.quality_rating}/5</span>
          </div>
          {review.comment && (
            <p className="text-xs text-white/60 italic">{review.comment}</p>
          )}
        </div>
      )}

      {log.status === 'rejected' && (
        <div className="border-t border-red-500/15 pt-3">
          <p className="text-xs text-red-400">
            Votre manager a demandé une correction. Modifiez votre journal et soumettez à nouveau.
          </p>
        </div>
      )}
    </motion.div>
  )
}

// ─── SKELETON ────────────────────────────────────────────────
function LogSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 rounded-xl bg-white/[0.03] border border-white/[0.04]" />
      ))}
    </div>
  )
}
