// ============================================================
// APEX RH — TaskDetailTabDetails.jsx  ·  S125-C
// Onglet Détails : métadonnées + liaisons OKR/Projets + assignés + sous-tâches
// ============================================================
import { useState } from 'react'
import { useNavigate }      from 'react-router-dom'
import { useUpdateAssignees, useAllUsers } from '../../hooks/useTasks'
import { getPriorityInfo, formatDate, isOverdue, isDueSoon,
         getChecklistProgress, getUserFullName, getUserInitials } from '../../lib/taskHelpers'
import TaskStatusBadge  from './TaskStatusBadge'
import TaskTagPicker    from './TaskTagPicker'
import { useAppSettings }      from '../../hooks/useSettings'
import { isPulseEnabled, formatMinutes } from '../../lib/pulseHelpers'
import { useTodayLog }  from '../../hooks/usePulse'

// Helpers OKR / Projets (repris de S18)
const LEVEL_LABELS  = { strategique:'Stratégique', division:'Division', service:'Service', individuel:'Individuel' }
const LEVEL_COLORS  = { strategique:'#C9A227', division:'#8B5CF6', service:'#3B82F6', individuel:'#10B981' }
const PROJ_STATUS_LABELS = { planifie:'Planifié', en_cours:'En cours', en_pause:'En pause', termine:'Terminé', annule:'Annulé' }
const PROJ_STATUS_COLORS = { planifie:'#6B7280', en_cours:'#3B82F6', en_pause:'#F59E0B', termine:'#10B981', annule:'#EF4444' }
function krColor(s) { return s >= 0.7 ? '#10B981' : s >= 0.4 ? '#F59E0B' : '#EF4444' }
function Meta({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

export default function TaskDetailTabDetails({ task, profile, canEdit }) {
  const navigate             = useNavigate()
  const { data: allUsers=[] }= useAllUsers()
  const updateAssignees      = useUpdateAssignees()
  const [editAssignees, setEditAssignees] = useState(false)
  const [tempAssignees, setTempAssignees] = useState(task?.task_assignees?.map(a=>a.user_id)||[])

  const { data: appSettings } = useAppSettings()
  const pulseActive = isPulseEnabled(appSettings)
  const { data: todayLog }    = useTodayLog()

  const overdue   = task?.due_date ? isOverdue(task.due_date, task.status) : false
  const dueSoon   = task?.due_date ? isDueSoon(task.due_date, 3, task.status) : false
  const progress  = task ? getChecklistProgress(task.task_checklists) : null
  const linkedKrs = task?.linked_key_results || []
  const linkedProj= task?.linked_projects    || []

  async function saveAssignees() {
    await updateAssignees.mutateAsync({ taskId: task.id, newAssigneeIds: tempAssignees })
    setEditAssignees(false)
  }

  return (
    <div className="space-y-5">
      {/* Métadonnées */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Meta label="Créé par">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
              {getUserInitials(task.creator)}
            </div>
            <span className="text-sm text-gray-300">{getUserFullName(task.creator)}</span>
          </div>
        </Meta>
        <Meta label="Statut"><TaskStatusBadge status={task.status} /></Meta>
        <Meta label="Priorité">
          <span className={`text-sm font-medium ${getPriorityInfo(task.priority).textClass}`}>
            {getPriorityInfo(task.priority).icon} {getPriorityInfo(task.priority).label}
          </span>
        </Meta>
        <Meta label="Échéance">
          {task.due_date ? (
            <span className={`text-sm font-medium ${overdue ? 'text-red-400' : dueSoon ? 'text-amber-400' : 'text-gray-300'}`}>
              {overdue && '⚠ '}{formatDate(task.due_date)}
            </span>
          ) : <span className="text-sm text-gray-500">—</span>}
        </Meta>
        <Meta label="Date début">
          <span className="text-sm text-gray-300">{task.start_date ? formatDate(task.start_date) : '—'}</span>
        </Meta>
        <Meta label="Heures estimées">
          <span className="text-sm text-gray-300">{task.estimated_hours ? `${task.estimated_hours}h` : '—'}</span>
        </Meta>
        {task.services  && <Meta label="Service"><span className="text-sm text-gray-300">{task.services.name}</span></Meta>}
        {task.divisions && <Meta label="Division"><span className="text-sm text-gray-300">{task.divisions.name}</span></Meta>}
      </div>

      {/* Tags S125 */}
      <div>
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Tags</p>
        <TaskTagPicker taskId={task.id} readOnly={!canEdit} />
      </div>

      {/* Progression checklist */}
      {progress && (
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Progression checklist</span>
            <span className="text-xs font-medium text-gray-300">{progress.pct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width:`${progress.pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{progress.done}/{progress.total} éléments</p>
        </div>
      )}

      {/* Liaisons inter-modules (S18) */}
      {(linkedKrs.length > 0 || linkedProj.length > 0) && (
        <div className="space-y-3">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Liaisons inter-modules</span>

          {linkedKrs.length > 0 && (
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-white">KR liés ({linkedKrs.length})</span>
              </div>
              {linkedKrs.map(kr => (
                <div key={kr.id} onClick={() => navigate('/objectives')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 cursor-pointer mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: LEVEL_COLORS[kr.objective?.level] || '#6B7280' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/70 truncate">{kr.title}</p>
                    {kr.objective && <p className="text-[10px] text-white/30 truncate">{LEVEL_LABELS[kr.objective.level]}: {kr.objective.title}</p>}
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: krColor(kr.score||0) }}>{Math.round((kr.score||0)*100)}%</span>
                </div>
              ))}
            </div>
          )}

          {linkedProj.length > 0 && (
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-white">Projets liés ({linkedProj.length})</span>
              </div>
              {linkedProj.map(proj => (
                <div key={proj.id} onClick={() => navigate('/projects')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 cursor-pointer mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PROJ_STATUS_COLORS[proj.status] || '#6B7280' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/70 truncate">{proj.name}</p>
                    <p className="text-[10px] text-white/30">{PROJ_STATUS_LABELS[proj.status]}</p>
                  </div>
                  <span className="text-[10px] text-white/40">{proj.progress||0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assignés */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assignés</span>
          {canEdit && (
            <button onClick={() => setEditAssignees(!editAssignees)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              {editAssignees ? 'Annuler' : 'Modifier'}
            </button>
          )}
        </div>
        {editAssignees ? (
          <div className="space-y-2">
            <div className="max-h-40 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
              {allUsers.map(u => (
                <label key={u.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${tempAssignees.includes(u.id) ? 'bg-indigo-500/20' : 'hover:bg-white/5'}`}>
                  <input type="checkbox" checked={tempAssignees.includes(u.id)}
                    onChange={() => setTempAssignees(prev => prev.includes(u.id) ? prev.filter(id=>id!==u.id) : [...prev, u.id])}
                    className="accent-indigo-500" />
                  <span className="text-sm text-gray-300">{getUserFullName(u)}</span>
                </label>
              ))}
            </div>
            <button onClick={saveAssignees} className="w-full py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Enregistrer</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!task.task_assignees?.length ? (
              <span className="text-sm text-gray-500">Aucun assigné</span>
            ) : task.task_assignees.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">{getUserInitials(a.users)}</div>
                <span className="text-xs text-gray-300">{getUserFullName(a.users)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sous-tâches */}
      {task.subtasks?.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">Sous-tâches ({task.subtasks.length})</span>
          <div className="space-y-1.5">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg">
                <TaskStatusBadge status={sub.status} size="xs" />
                <span className="text-sm text-gray-300 flex-1">{sub.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PULSE mini-widget (S24 — conditionnel) */}
      {pulseActive && todayLog && (() => {
        const entries = (todayLog.daily_log_entries||[]).filter(e=>e.task_id===task?.id)
        if (!entries.length) return null
        const totalMin = entries.reduce((s,e)=>s+(e.time_spent_min||0), 0)
        return (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background:'rgba(79,70,229,0.06)', border:'1px solid rgba(79,70,229,0.12)' }}>
            <span className="text-sm">⏱</span>
            <div>
              <p className="text-[11px] text-indigo-300/70 font-medium">PULSE — Aujourd'hui</p>
              <p className="text-sm font-semibold text-white/80">{formatMinutes(totalMin)} loggué</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
