// ============================================================
// APEX RH — ObjectiveDetailPanel.jsx
// Session 10 — Panneau de détail objectif + KR + évaluation
// Session 19 — Fix : passe objectiveId aux mutations link/unlink pour invalidation ciblée
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Edit3, Trash2, Target, TrendingUp,
  Link2, Unlink, GitBranch, User
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useObjective, useUpdateKeyResult, useDeleteKeyResult, useDeleteObjective, useLinkTaskToKr, useUnlinkTaskFromKr, useTasksForLinking } from '../../hooks/useObjectives'
import {
  getLevelInfo, getObjStatusInfo, getScoreColor, formatScore,
  formatScorePercent, canEditObjective, canDeleteObjective, formatDateFr
} from '../../lib/objectiveHelpers'
import KeyResultCard from './KeyResultCard'
import KeyResultForm from './KeyResultForm'
import EvaluationPanel from './EvaluationPanel'

export default function ObjectiveDetailPanel({ objectiveId, onClose, onEdit }) {
  const { profile } = useAuth()
  const { data: objective, isLoading } = useObjective(objectiveId)
  const updateKr = useUpdateKeyResult()
  const deleteKr = useDeleteKeyResult()
  const deleteObj = useDeleteObjective()
  const linkTask = useLinkTaskToKr()
  const unlinkTask = useUnlinkTaskFromKr()
  const { data: allTasks = [] } = useTasksForLinking()

  const [showKrForm, setShowKrForm] = useState(false)
  const [editingKr, setEditingKr] = useState(null)
  const [linkingKrId, setLinkingKrId] = useState(null)

  if (!objectiveId) return null

  const handleUpdateKrValue = async (krId, newValue) => {
    try {
      await updateKr.mutateAsync({ id: krId, updates: { current_value: newValue } })
    } catch (err) {
    }
  }

  const handleDeleteKr = async (kr) => {
    if (!confirm('Supprimer ce Key Result ?')) return
    try {
      await deleteKr.mutateAsync({ id: kr.id, objectiveId: kr.objective_id })
    } catch (err) {
    }
  }

  const handleDeleteObjective = async () => {
    if (!confirm('Supprimer cet objectif et tous ses Key Results ?')) return
    try {
      await deleteObj.mutateAsync(objectiveId)
      onClose()
    } catch (err) {
    }
  }

  // ✅ Session 19 — Ajout objectiveId pour invalidation ciblée du cache
  const handleLinkTask = async (taskId) => {
    if (!linkingKrId) return
    try {
      await linkTask.mutateAsync({ taskId, keyResultId: linkingKrId, objectiveId })
      setLinkingKrId(null)
    } catch (err) {
    }
  }

  // ✅ Session 19 — Idem
  const handleUnlinkTask = async (taskId, krId) => {
    try {
      await unlinkTask.mutateAsync({ taskId, keyResultId: krId, objectiveId })
    } catch (err) {
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl h-full overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #0F0F23 0%, #0A0A1E 100%)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-white/30">Chargement…</div>
          ) : !objective ? (
            <div className="flex items-center justify-center h-64 text-white/30">Objectif introuvable</div>
          ) : (
            <div className="p-6 space-y-6">
              {/* En-tête */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${getLevelInfo(objective.level).color}22` }}
                  >
                    <Target size={20} style={{ color: getLevelInfo(objective.level).color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${getLevelInfo(objective.level).text}`}>
                        {getLevelInfo(objective.level).label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${getObjStatusInfo(objective.status).bg} ${getObjStatusInfo(objective.status).text}`}>
                        {getObjStatusInfo(objective.status).label}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white leading-snug">{objective.title}</h2>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Score global */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">Progression globale</span>
                  <span className="text-2xl font-black" style={{ color: getScoreColor(objective.progress_score) }}>
                    {formatScore(objective.progress_score)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round((objective.progress_score || 0) * 100)}%`,
                      background: `linear-gradient(90deg, ${getScoreColor(objective.progress_score)}, ${getScoreColor(objective.progress_score)}aa)`,
                    }}
                  />
                </div>
                <p className="text-right text-[11px] text-white/20 mt-1">
                  {formatScorePercent(objective.progress_score)}
                </p>
              </div>

              {/* Description */}
              {objective.description && (
                <div>
                  <p className="text-xs text-white/30 mb-1">Description</p>
                  <p className="text-sm text-white/60 leading-relaxed">{objective.description}</p>
                </div>
              )}

              {/* Infos */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <p className="text-white/30 mb-1">Propriétaire</p>
                  <p className="text-white/70 flex items-center gap-1">
                    <User size={12} />
                    {objective.owner ? `${objective.owner.first_name} ${objective.owner.last_name}` : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02]">
                  <p className="text-white/30 mb-1">Période</p>
                  <p className="text-white/70">
                    {objective.period?.name || '—'}
                  </p>
                </div>
                {objective.parent && (
                  <div className="p-3 rounded-lg bg-white/[0.02] col-span-2">
                    <p className="text-white/30 mb-1">Objectif parent</p>
                    <p className="text-white/70 flex items-center gap-1">
                      <GitBranch size={12} />
                      {objective.parent.title}
                    </p>
                  </div>
                )}
              </div>

              {/* Key Results */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    Key Results ({objective.key_results?.length || 0})
                  </h3>
                  {canEditObjective(objective, profile) && (
                    <button
                      onClick={() => { setEditingKr(null); setShowKrForm(true) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      <Plus size={13} /> Ajouter KR
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(objective.key_results || []).map((kr) => (
                    <div key={kr.id}>
                      <KeyResultCard
                        kr={kr}
                        canEdit={canEditObjective(objective, profile)}
                        onEdit={(k) => { setEditingKr(k); setShowKrForm(true) }}
                        onDelete={handleDeleteKr}
                        onUpdateValue={handleUpdateKrValue}
                      />

                      {/* Tâches liées */}
                      {kr.task_key_results?.length > 0 && (
                        <div className="ml-8 mt-1 space-y-1">
                          {kr.task_key_results.map((tkr) => {
                            const task = allTasks.find((t) => t.id === tkr.task_id)
                            return (
                              <div key={tkr.id} className="flex items-center gap-2 text-[11px] text-white/30">
                                <Link2 size={10} className="text-indigo-400" />
                                <span>{task?.title || tkr.task_id}</span>
                                {canEditObjective(objective, profile) && (
                                  <button
                                    onClick={() => handleUnlinkTask(tkr.task_id, kr.id)}
                                    className="p-0.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400"
                                  >
                                    <Unlink size={10} />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Bouton lier tâche */}
                      {canEditObjective(objective, profile) && (
                        <div className="ml-8 mt-1">
                          {linkingKrId === kr.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                onChange={(e) => { if (e.target.value) handleLinkTask(e.target.value) }}
                                className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] focus:outline-none focus:border-indigo-500/50"
                                defaultValue=""
                              >
                                <option value="" className="bg-[#1a1a35]">Choisir une tâche…</option>
                                {allTasks
                                  .filter((t) => !kr.task_key_results?.some((tkr) => tkr.task_id === t.id))
                                  .map((t) => (
                                    <option key={t.id} value={t.id} className="bg-[#1a1a35]">
                                      {t.title}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => setLinkingKrId(null)}
                                className="text-[10px] text-white/30 hover:text-white"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setLinkingKrId(kr.id)}
                              className="flex items-center gap-1 text-[11px] text-white/20 hover:text-indigo-400 transition-colors"
                            >
                              <Link2 size={10} /> Lier une tâche
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Objectifs enfants */}
              {objective.children?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <GitBranch size={14} className="text-violet-400" />
                    Sous-objectifs ({objective.children.length})
                  </h3>
                  <div className="space-y-2">
                    {objective.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-2 h-2 rounded-full" style={{ background: getLevelInfo(child.level).color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{child.title}</p>
                          <p className="text-[10px] text-white/30">
                            {getLevelInfo(child.level).label} · {getObjStatusInfo(child.status).label}
                          </p>
                        </div>
                        <span className="text-xs font-bold" style={{ color: getScoreColor(child.progress_score) }}>
                          {formatScore(child.progress_score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Évaluation */}
              {objective.status === 'en_evaluation' && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Évaluation</h3>
                  <EvaluationPanel objective={objective} />
                </div>
              )}

              {/* Actions */}
              {canEditObjective(objective, profile) && (
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => onEdit?.(objective)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors"
                  >
                    <Edit3 size={13} /> Modifier
                  </button>
                  {canDeleteObjective(objective, profile) && (
                    <button
                      onClick={handleDeleteObjective}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* KR Form Modal */}
          <KeyResultForm
            isOpen={showKrForm}
            onClose={() => { setShowKrForm(false); setEditingKr(null) }}
            objectiveId={objectiveId}
            keyResult={editingKr}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}