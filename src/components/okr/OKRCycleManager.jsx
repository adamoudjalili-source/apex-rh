// ============================================================
// APEX RH — OKRCycleManager.jsx
// Session 78 — Gestion des cycles OKR (admin/directeur)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Lock, Archive, Play, Edit2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useOKRCycles, useCreateCycle, useUpdateCycle, useCloseCycle, useOKRCycleStats } from '../../hooks/useObjectives'
import { useAuth } from '../../contexts/AuthContext'

const CADENCE_LABELS = {
  quarterly: 'Trimestriel',
  semestrial: 'Semestriel',
  annual: 'Annuel',
  custom: 'Personnalisé',
}

const STATUS_CONFIG = {
  draft:    { label: 'Brouillon',  color: 'text-gray-400',  bg: 'bg-gray-800',   dot: 'bg-gray-400' },
  active:   { label: 'Actif',      color: 'text-green-400', bg: 'bg-green-900/30', dot: 'bg-green-400' },
  closed:   { label: 'Clôturé',   color: 'text-amber-400', bg: 'bg-amber-900/20', dot: 'bg-amber-400' },
  archived: { label: 'Archivé',   color: 'text-gray-500',  bg: 'bg-gray-900',   dot: 'bg-gray-600' },
}

function CycleStatsBar({ cycleId }) {
  const { data: stats } = useOKRCycleStats(cycleId)
  if (!stats) return null
  const progress = stats.avg_progress || 0
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{stats.total_objectives} objectifs · {stats.total_key_results} KRs</span>
        <span>{Math.round(progress)}% progression moy.</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: progress >= 70 ? '#22c55e' : progress >= 40 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      {stats.at_risk_count > 0 && (
        <div className="flex items-center gap-1 text-xs text-rose-400">
          <AlertTriangle className="w-3 h-3" />
          <span>{stats.at_risk_count} KR en risque</span>
        </div>
      )}
    </div>
  )
}

function CycleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    cadence: initial?.cadence || 'quarterly',
    start_date: initial?.start_date || '',
    end_date: initial?.end_date || '',
    description: initial?.description || '',
  })

  function handleChange(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function prefillDates(cadence) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    let start, end
    if (cadence === 'quarterly') {
      const qStart = Math.floor(month / 3) * 3
      start = new Date(year, qStart, 1)
      end = new Date(year, qStart + 3, 0)
    } else if (cadence === 'semestrial') {
      start = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1)
      end = month < 6 ? new Date(year, 6, 0) : new Date(year, 12, 0)
    } else if (cadence === 'annual') {
      start = new Date(year, 0, 1)
      end = new Date(year, 12, 0)
    }
    if (start && end) {
      handleChange('start_date', start.toISOString().split('T')[0])
      handleChange('end_date', end.toISOString().split('T')[0])
    }
    handleChange('cadence', cadence)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nom du cycle *</label>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          placeholder="ex: Q1 2026, S1 2026…"
          value={form.name}
          onChange={e => handleChange('name', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Cadence</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(CADENCE_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => prefillDates(k)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                form.cadence === k
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Début *</label>
          <input
            type="date"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            value={form.start_date}
            onChange={e => handleChange('start_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fin *</label>
          <input
            type="date"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            value={form.end_date}
            onChange={e => handleChange('end_date', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="Objectif stratégique du cycle…"
          value={form.description}
          onChange={e => handleChange('description', e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          Annuler
        </button>
        <button
          onClick={() => form.name && form.start_date && form.end_date && onSave(form)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {initial ? 'Mettre à jour' : 'Créer le cycle'}
        </button>
      </div>
    </div>
  )
}

export default function OKRCycleManager({ onCycleSelect }) {
  const { canAdmin, canManageOrg } = useAuth()
  const { data: cycles = [], isLoading } = useOKRCycles()
  const createCycle = useCreateCycle()
  const updateCycle = useUpdateCycle()
  const closeCycle = useCloseCycle()

  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmClose, setConfirmClose] = useState(null)

  async function handleCreate(form) {
    await createCycle.mutateAsync(form)
    setShowCreate(false)
  }

  async function handleUpdate(id, form) {
    await updateCycle.mutateAsync({ id, ...form })
    setEditingId(null)
  }

  async function handleActivate(id) {
    // Désactiver les autres cycles actifs
    await updateCycle.mutateAsync({ id, status: 'active' })
  }

  async function handleClose(id) {
    await closeCycle.mutateAsync(id)
    setConfirmClose(null)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Cycles OKR</h3>
          <p className="text-xs text-gray-400 mt-0.5">{cycles.length} cycle{cycles.length > 1 ? 's' : ''} configuré{cycles.length > 1 ? 's' : ''}</p>
        </div>
        {canManageOrg && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau cycle
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gray-900 border border-indigo-500/30 rounded-xl p-4"
          >
            <h4 className="text-sm font-semibold text-white mb-4">Nouveau cycle OKR</h4>
            <CycleForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des cycles */}
      {cycles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun cycle OKR créé</p>
          {canManageOrg && (
            <button onClick={() => setShowCreate(true)} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
              Créer le premier cycle →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map(cycle => {
            const sc = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.draft
            const isExpanded = expandedId === cycle.id
            const isEditing = editingId === cycle.id
            const daysLeft = Math.ceil((new Date(cycle.end_date) - new Date()) / 86400000)

            return (
              <motion.div
                key={cycle.id}
                layout
                className={`rounded-xl border transition-colors cursor-pointer ${
                  isExpanded
                    ? 'border-indigo-500/40 bg-gray-900/60'
                    : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                }`}
              >
                <div
                  className="flex items-start gap-3 p-4"
                  onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{cycle.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-gray-500">{CADENCE_LABELS[cycle.cadence]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{new Date(cycle.start_date).toLocaleDateString('fr-FR')} → {new Date(cycle.end_date).toLocaleDateString('fr-FR')}</span>
                      {cycle.status === 'active' && daysLeft > 0 && (
                        <span className={daysLeft <= 14 ? 'text-amber-400' : 'text-gray-500'}>
                          {daysLeft}j restants
                        </span>
                      )}
                    </div>
                    {cycle.status === 'active' && <CycleStatsBar cycleId={cycle.id} />}
                  </div>
                  <div className="flex items-center gap-1">
                    {cycle.status === 'active' && (
                      <button
                        onClick={e => { e.stopPropagation(); onCycleSelect?.(cycle) }}
                        className="px-2 py-1 text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded-lg transition-colors"
                      >
                        Sélectionner
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* Détail expandé */}
                <AnimatePresence>
                  {isExpanded && !isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                        {cycle.description && (
                          <p className="text-sm text-gray-400 mb-3">{cycle.description}</p>
                        )}
                        {canManageOrg && (
                          <div className="flex gap-2 flex-wrap">
                            {cycle.status === 'draft' && (
                              <button
                                onClick={() => handleActivate(cycle.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" /> Activer
                              </button>
                            )}
                            {cycle.status === 'active' && (
                              <button
                                onClick={() => setConfirmClose(cycle.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Lock className="w-3.5 h-3.5" /> Clôturer
                              </button>
                            )}
                            {cycle.status === 'closed' && (
                              <button
                                onClick={() => updateCycle.mutate({ id: cycle.id, status: 'archived' })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" /> Archiver
                              </button>
                            )}
                            {cycle.status !== 'closed' && cycle.status !== 'archived' && (
                              <button
                                onClick={() => setEditingId(cycle.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Modifier
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {isExpanded && isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                        <CycleForm
                          initial={cycle}
                          onSave={(form) => handleUpdate(cycle.id, form)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal confirmation clôture */}
      <AnimatePresence>
        {confirmClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-900/40 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Clôturer ce cycle</h4>
                  <p className="text-xs text-gray-400">Cette action est irréversible</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-5">
                Les objectifs non finalisés seront conservés mais le cycle ne sera plus modifiable. Confirmer la clôture ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClose(null)}
                  className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleClose(confirmClose)}
                  className="flex-1 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
                >
                  Clôturer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
