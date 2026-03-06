// ============================================================
// APEX RH — ObjectiveCard.jsx
// Session 10 — Carte objectif avec KR et progression
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronRight, Plus, Edit3, Trash2, Eye,
  GitBranch, User
} from 'lucide-react'
import {
  getLevelInfo, getObjStatusInfo, getScoreColor, formatScore,
  formatScorePercent, canEditObjective, canDeleteObjective
} from '../../lib/objectiveHelpers'
import { useAuth } from '../../contexts/AuthContext'
import KeyResultCard from './KeyResultCard'

export default function ObjectiveCard({
  objective,
  onEdit,
  onDelete,
  onViewDetail,
  onAddKr,
  onEditKr,
  onDeleteKr,
  onUpdateKrValue,
  childCount = 0,
}) {
  const { profile } = useAuth()
  const [expanded, setExpanded] = useState(false)

  const level = getLevelInfo(objective.level)
  const status = getObjStatusInfo(objective.status)
  const scoreColor = getScoreColor(objective.progress_score)
  const pct = Math.round((objective.progress_score || 0) * 100)
  const krs = objective.key_results || []
  const ownerName = objective.owner
    ? `${objective.owner.first_name} ${objective.owner.last_name}`
    : '—'

  const userCanEdit = canEditObjective(objective, profile)
  const userCanDelete = canDeleteObjective(objective, profile)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-200 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* En-tête de l'objectif */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Indicateur de niveau */}
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0 mt-1"
            style={{ background: level.color }}
          />

          <div className="flex-1 min-w-0">
            {/* Ligne 1 : badges + actions */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${level.bg} ${level.text} ${level.border} border`}
                >
                  {level.icon} {level.label}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>
                {childCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/20">
                    <GitBranch size={10} /> {childCount} sous-obj.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {onViewDetail && (
                  <button onClick={() => onViewDetail(objective)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-indigo-400 transition-colors"
                    title="Voir le détail">
                    <Eye size={14} />
                  </button>
                )}
                {userCanEdit && onEdit && (
                  <button onClick={() => onEdit(objective)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                    <Edit3 size={14} />
                  </button>
                )}
                {userCanDelete && onDelete && (
                  <button onClick={() => onDelete(objective)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Titre */}
            <h3 className="text-sm font-semibold text-white mb-2 leading-snug">
              {objective.title}
            </h3>

            {/* Score + barre */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)` }}
                />
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: scoreColor }}>
                {formatScore(objective.progress_score)}
              </span>
              <span className="text-[11px] text-white/20 flex-shrink-0">
                ({formatScorePercent(objective.progress_score)})
              </span>
            </div>

            {/* Propriétaire + parent */}
            <div className="flex items-center gap-4 text-[11px] text-white/30">
              <span className="flex items-center gap-1">
                <User size={10} /> {ownerName}
              </span>
              {objective.parent?.title && (
                <span className="flex items-center gap-1 text-white/15">
                  ↑ {objective.parent.title}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Key Results */}
      {(krs.length > 0 || userCanEdit) && (
        <div className="border-t border-white/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>{krs.length} Key Result{krs.length !== 1 ? 's' : ''}</span>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4 space-y-2 overflow-hidden"
              >
                {krs.map((kr) => (
                  <KeyResultCard
                    key={kr.id}
                    kr={kr}
                    canEdit={userCanEdit}
                    onEdit={onEditKr}
                    onDelete={onDeleteKr}
                    onUpdateValue={onUpdateKrValue}
                  />
                ))}

                {userCanEdit && onAddKr && (
                  <button
                    onClick={() => onAddKr(objective.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 text-xs text-white/30 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                  >
                    <Plus size={13} />
                    Ajouter un Key Result
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
