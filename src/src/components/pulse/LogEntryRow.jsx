// ============================================================
// APEX RH — LogEntryRow.jsx
// ✅ Session 21 — Ligne tâche dans le Journal du soir PULSE
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, Trash2, ChevronDown } from 'lucide-react'
import {
  TASK_STATUS_LABELS,
  BLOCK_TYPE_LABELS,
  PULSE_COLORS,
  minutesToTimeString,
  timeStringToMinutes,
} from '../../lib/pulseHelpers'
import { useUpdateLogEntry, useDeleteLogEntry } from '../../hooks/usePulse'

export default function LogEntryRow({ entry, readOnly = false }) {
  const updateEntry = useUpdateLogEntry()
  const deleteEntry = useDeleteLogEntry()

  const [local, setLocal] = useState({
    time_spent_min: entry.time_spent_min || 0,
    progress_before: entry.progress_before || 0,
    progress_after: entry.progress_after || 0,
    task_status: entry.task_status || 'en_cours',
    note: entry.note || '',
    is_blocked: entry.is_blocked || false,
    block_reason: entry.block_reason || '',
    block_type: entry.block_type || '',
  })
  const [timeInput, setTimeInput] = useState(minutesToTimeString(entry.time_spent_min || 0))
  const [expanded, setExpanded] = useState(false)
  const [saveTimeout, setSaveTimeout] = useState(null)

  // Sync si la prop change
  useEffect(() => {
    setLocal({
      time_spent_min: entry.time_spent_min || 0,
      progress_before: entry.progress_before || 0,
      progress_after: entry.progress_after || 0,
      task_status: entry.task_status || 'en_cours',
      note: entry.note || '',
      is_blocked: entry.is_blocked || false,
      block_reason: entry.block_reason || '',
      block_type: entry.block_type || '',
    })
    setTimeInput(minutesToTimeString(entry.time_spent_min || 0))
  }, [entry.id])

  // Auto-save avec debounce
  const triggerSave = (updates) => {
    if (readOnly) return
    if (saveTimeout) clearTimeout(saveTimeout)
    setSaveTimeout(setTimeout(() => {
      updateEntry.mutate({ entryId: entry.id, updates })
    }, 600))
  }

  const updateLocal = (field, value) => {
    const next = { ...local, [field]: value }
    setLocal(next)
    triggerSave({ [field]: value })
  }

  const handleTimeChange = (val) => {
    setTimeInput(val)
    // Valider format HH:MM
    if (/^\d{1,2}:\d{2}$/.test(val)) {
      const mins = timeStringToMinutes(val)
      if (mins >= 0 && mins <= 600) {
        updateLocal('time_spent_min', mins)
      }
    }
  }

  const handleDelete = () => {
    if (readOnly) return
    deleteEntry.mutate(entry.id)
  }

  const task = entry.task
  const statusColor = {
    en_cours: '#F59E0B',
    terminee: '#10B981',
    bloquee:  '#EF4444',
    reporte:  '#6B7280',
  }[local.task_status] || '#6B7280'

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${local.is_blocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      {/* Ligne principale */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Indicateur statut */}
          <div
            className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: statusColor }}
          />

          {/* Titre tâche */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {task?.title || 'Tâche inconnue'}
            </p>
            {task?.due_date && (
              <p className="text-[10px] text-white/30 mt-0.5">
                Échéance : {new Date(task.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>

          {/* Actions header */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {local.is_blocked && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} /> Bloquée
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {!readOnly && (
              <button
                onClick={handleDelete}
                disabled={deleteEntry.isPending}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-all"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Contrôles rapides (toujours visibles) */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Temps passé */}
          <div>
            <label className="text-[10px] text-white/30 mb-1 flex items-center gap-1">
              <Clock size={9} /> Temps passé
            </label>
            <input
              type="text"
              value={timeInput}
              onChange={e => handleTimeChange(e.target.value)}
              placeholder="00:00"
              disabled={readOnly}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white
                text-center font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50
                disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">Statut</label>
            <select
              value={local.task_status}
              onChange={e => updateLocal('task_status', e.target.value)}
              disabled={readOnly}
              className="w-full bg-[#0F0F23] border border-white/10 rounded-lg px-3 py-1.5 text-sm
                text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
            >
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section étendue */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
              {/* Progression */}
              <div>
                <label className="text-[10px] text-white/30 mb-2 block">
                  Progression : {local.progress_before}% → {local.progress_after}%
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-12">Avant</span>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={local.progress_before}
                      onChange={e => updateLocal('progress_before', Number(e.target.value))}
                      disabled={readOnly}
                      className="flex-1 accent-indigo-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-white/50 w-8 text-right">{local.progress_before}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-12">Après</span>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={local.progress_after}
                      onChange={e => updateLocal('progress_after', Number(e.target.value))}
                      disabled={readOnly}
                      className="flex-1 accent-emerald-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-white/50 w-8 text-right">{local.progress_after}%</span>
                  </div>
                </div>
                {/* Barre visuelle */}
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden relative">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full opacity-30"
                    style={{ width: `${local.progress_before}%`, background: PULSE_COLORS.neutral }}
                  />
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{ width: `${local.progress_after}%`, background: PULSE_COLORS.success }}
                  />
                </div>
              </div>

              {/* Blocage */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !readOnly && updateLocal('is_blocked', !local.is_blocked)}
                  disabled={readOnly}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${local.is_blocked
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/8'
                    } disabled:cursor-not-allowed`}
                >
                  <AlertTriangle size={12} />
                  {local.is_blocked ? 'Blocage signalé' : 'Signaler un blocage'}
                </button>
              </div>

              {local.is_blocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <select
                    value={local.block_type}
                    onChange={e => updateLocal('block_type', e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-[#0F0F23] border border-red-500/20 rounded-lg px-3 py-1.5 text-sm
                      text-white focus:outline-none focus:border-red-500/40 disabled:opacity-50"
                  >
                    <option value="">Type de blocage…</option>
                    {Object.entries(BLOCK_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <textarea
                    value={local.block_reason}
                    onChange={e => updateLocal('block_reason', e.target.value)}
                    disabled={readOnly}
                    placeholder="Décrivez le blocage…"
                    rows={2}
                    className="w-full bg-white/5 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white
                      placeholder-white/20 focus:outline-none focus:border-red-500/40 resize-none disabled:opacity-50"
                  />
                </motion.div>
              )}

              {/* Note tâche */}
              <div>
                <label className="text-[10px] text-white/30 mb-1 block">Note</label>
                <textarea
                  value={local.note}
                  onChange={e => updateLocal('note', e.target.value)}
                  disabled={readOnly}
                  placeholder="Note optionnelle sur cette tâche…"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                    placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none disabled:opacity-50"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
