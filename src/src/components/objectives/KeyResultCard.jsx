// ============================================================
// APEX RH — KeyResultCard.jsx
// Session 10 — Affichage d'un Key Result
// ============================================================
import { TrendingUp, Edit3, Trash2, Link } from 'lucide-react'
import { getScoreColor, formatKrValue, getKrStatusInfo, formatScore } from '../../lib/objectiveHelpers'

export default function KeyResultCard({ kr, onEdit, onDelete, onUpdateValue, canEdit }) {
  const scoreColor = getScoreColor(kr.score)
  const statusInfo = getKrStatusInfo(kr.status)
  const pct = Math.round((kr.score || 0) * 100)

  return (
    <div className="group relative p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Titre + poids */}
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp size={13} style={{ color: scoreColor }} />
            <p className="text-sm font-medium text-white truncate">{kr.title}</p>
            <span className="text-[10px] text-white/20 flex-shrink-0">
              Poids: {kr.weight}
            </span>
          </div>

          {/* Barre de progression */}
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: scoreColor }}
              />
            </div>
            <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor }}>
              {formatScore(kr.score)}
            </span>
          </div>

          {/* Valeurs */}
          <div className="flex items-center gap-3 text-[11px] text-white/30">
            <span>
              {formatKrValue(kr.current_value, kr.kr_type, kr.unit)} / {formatKrValue(kr.target_value, kr.kr_type, kr.unit)}
            </span>
            <span className={statusInfo.text}>{statusInfo.label}</span>
            {kr.task_key_results?.length > 0 && (
              <span className="flex items-center gap-1 text-indigo-400">
                <Link size={10} />
                {kr.task_key_results.length} tâche{kr.task_key_results.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onUpdateValue && kr.kr_type !== 'binary' && (
              <input
                type="number"
                defaultValue={kr.current_value}
                onBlur={(e) => {
                  const val = Number(e.target.value)
                  if (val !== kr.current_value) onUpdateValue(kr.id, val)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur()
                  }
                }}
                className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs text-center focus:outline-none focus:border-indigo-500/50"
                title="Mettre à jour la valeur"
              />
            )}
            {onEdit && (
              <button onClick={() => onEdit(kr)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                <Edit3 size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(kr)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
