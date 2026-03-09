// ============================================================
// APEX RH — TaskDetailPanel.jsx
// Panel latéral slide-in style Linear
// Session 9 — Corrigé : user->profile, select styling
// Session 18 — Ajout section Liaisons inter-modules (KR liés + Projets liés)
// Session 19 — Fix handleApprove/handleReject → useUpdateTaskStatus (suppression doublon RPC)
// Session 19 bis — Fix isDueSoon(task.due_date, 3, task.status)
// ✅ Session 24 — Mini-widget log de temps PULSE (Phase F, conditionnel pulse_enabled)
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTask, useUpdateTask, useUpdateTaskStatus, useDeleteTask, useUpdateAssignees, useAllUsers } from '../../hooks/useTasks'
import { useTaskDetailRealtime } from '../../hooks/useTaskRealtime'
import {
  getStatusInfo, getPriorityInfo, TASK_STATUS, TASK_PRIORITY,
  formatDate, isOverdue, isDueSoon, getChecklistProgress,
  getUserFullName, getUserInitials, canValidateTask, canEditTask, canDeleteTask,
  getAllowedStatuses
} from '../../lib/taskHelpers'
import TaskStatusBadge from './TaskStatusBadge'
import TaskChecklist from './TaskChecklist'
import TaskComments from './TaskComments'
import TaskActivityLog from './TaskActivityLog'
import TaskForm from './TaskForm'
// ✅ Session 24 — PULSE : imports conditionnels (mini time-log widget)
import { useAppSettings } from '../../hooks/useSettings'
import { isPulseEnabled, formatMinutes } from '../../lib/pulseHelpers'
import { useTodayLog } from '../../hooks/usePulse'

// ✅ Session 77 — Dépendances + Récurrence + Temps
import TaskDependencyGraph from './TaskDependencyGraph'
import RecurrenceConfig    from './RecurrenceConfig'
import TimeTrackingPanel   from './TimeTrackingPanel'

const TABS = ['Détails', 'Checklists', 'Commentaires', 'Activité', 'Dépendances', 'Récurrence', 'Temps']

// --- Session 18 : Helpers pour les liaisons inter-modules ---
const LEVEL_LABELS = {
  strategique: 'Stratégique',
  division: 'Division',
  service: 'Service',
  individuel: 'Individuel',
}

const LEVEL_COLORS = {
  strategique: '#C9A227',
  division: '#8B5CF6',
  service: '#3B82F6',
  individuel: '#10B981',
}

const PROJECT_STATUS_LABELS = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  en_pause: 'En pause',
  termine: 'Terminé',
  annule: 'Annulé',
}

const PROJECT_STATUS_COLORS = {
  planifie: '#6B7280',
  en_cours: '#3B82F6',
  en_pause: '#F59E0B',
  termine: '#10B981',
  annule: '#EF4444',
}

function getKrScoreColor(score) {
  if (score >= 0.7) return '#10B981'
  if (score >= 0.4) return '#F59E0B'
  return '#EF4444'
}
// --- Fin helpers Session 18 ---

export default function TaskDetailPanel({ taskId, onClose }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: task, isLoading } = useTask(taskId)
  const { data: allUsers = [] } = useAllUsers()
  const updateTask = useUpdateTask()
  const updateStatus = useUpdateTaskStatus()
  const deleteTask = useDeleteTask()
  const updateAssignees = useUpdateAssignees()

  useTaskDetailRealtime(taskId)

  // ✅ Session 24 — PULSE time-log widget (conditionnel)
  const { data: appSettings } = useAppSettings()
  const pulseActive = isPulseEnabled(appSettings)
  const { data: todayLog } = useTodayLog()

  const [activeTab, setActiveTab] = useState('Détails')
  const [editing, setEditing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingAssignees, setEditingAssignees] = useState(false)
  const [tempAssignees, setTempAssignees] = useState([])

  useEffect(() => {
    if (task) setTempAssignees(task.task_assignees?.map(a => a.user_id) || [])
  }, [task])

  if (!taskId) return null

  async function handleStatusChange(newStatus) {
    if (!task || !profile) return
    const allowed = getAllowedStatuses(task, profile)
    if (!allowed.includes(newStatus)) return
    await updateStatus.mutateAsync({
      taskId: task.id,
      newStatus,
      oldStatus: task.status,
    })
  }

  // ✅ Session 19 — Utilise useUpdateTaskStatus au lieu d'un appel RPC direct
  // Avantages : optimistic update Kanban, invalidation complète du cache, paramètres RPC corrects
  async function handleApprove() {
    try {
      await updateStatus.mutateAsync({
        taskId: task.id,
        newStatus: 'terminee',
        oldStatus: task.status,
      })
      onClose()
    } catch (err) {
    }
  }

  // ✅ Session 19 — Même fix pour le refus
  async function handleReject() {
    if (!rejectReason.trim()) return
    try {
      await updateStatus.mutateAsync({
        taskId: task.id,
        newStatus: 'en_cours',
        oldStatus: task.status,
        rejectionReason: rejectReason,
      })
      setShowRejectModal(false)
      setRejectReason('')
      onClose()
    } catch (err) {
    }
  }

  async function handleDelete() {
    await deleteTask.mutateAsync(task.id)
    onClose()
  }

  async function handleSaveAssignees() {
    await updateAssignees.mutateAsync({ taskId: task.id, newAssigneeIds: tempAssignees })
    setEditingAssignees(false)
  }

  const canEdit = task && profile && canEditTask(task, profile)
  const canDelete = task && profile && canDeleteTask(task, profile)
  const canValidate = task && profile && canValidateTask(task, profile)
  const progress = task ? getChecklistProgress(task.task_checklists) : null
  const overdue = task?.due_date ? isOverdue(task.due_date, task.status) : false
  const dueSoon = task?.due_date ? isDueSoon(task.due_date, 3, task.status) : false

  // Session 18 — Données inter-modules
  const linkedKrs = task?.linked_key_results || []
  const linkedProjects = task?.linked_projects || []
  const hasLinks = linkedKrs.length > 0 || linkedProjects.length > 0

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-[#0F0F23] border-l border-white/10 z-50 flex flex-col shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {task && <TaskStatusBadge status={task.status} />}
            {task && (
              <span className={`text-xs font-medium ${getPriorityInfo(task.priority).textClass}`}>
                {getPriorityInfo(task.priority).icon} {getPriorityInfo(task.priority).label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-white transition-colors rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !task ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Tâche introuvable</div>
        ) : editing ? (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TaskForm task={task} onClose={() => setEditing(false)} />
          </div>
        ) : (
          <>
            {/* Titre + description */}
            <div className="px-6 py-4 border-b border-white/5 shrink-0">
              <h2 className="text-lg font-semibold text-white mb-1">{task.title}</h2>
              {task.description && (
                <p className="text-sm text-gray-400 leading-relaxed">{task.description}</p>
              )}
              {task.rejection_reason && task.status === 'en_cours' && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-red-400">Tâche refusée</p>
                    <p className="text-xs text-red-300/70 mt-0.5">{task.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions workflow */}
            {(canValidate || canEdit) && (
              <div className="px-6 py-3 border-b border-white/5 shrink-0 flex flex-wrap items-center gap-2">
                {canEdit && task.status === 'en_cours' && (
                  <button
                    onClick={() => handleStatusChange('en_revue')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Soumettre pour validation
                  </button>
                )}
                {canValidate && task.status === 'en_revue' && (
                  <>
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approuver
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Refuser
                    </button>
                  </>
                )}
                {!canValidate && task.status === 'en_revue' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-violet-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-violet-300">En attente de validation par votre responsable</span>
                  </div>
                )}
                {task.status === 'terminee' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-emerald-300">Tâche validée et terminée</span>
                  </div>
                )}
                {canEdit && (() => {
                  const allowed = getAllowedStatuses(task, profile)
                  if (allowed.length === 0) return null
                  return (
                    <select
                      value={task.status}
                      onChange={e => updateStatus.mutateAsync({ taskId: task.id, newStatus: e.target.value, oldStatus: task.status })}
                      className="ml-auto px-2.5 py-1.5 text-xs bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={task.status} className="bg-[#1a1a35] text-gray-200">
                        {TASK_STATUS[task.status]?.label || task.status}
                      </option>
                      {allowed.map(k => (
                        <option key={k} value={k} className="bg-[#1a1a35] text-gray-200">
                          {TASK_STATUS[k]?.label || k}
                        </option>
                      ))}
                    </select>
                  )
                })()}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-white/10 shrink-0 px-6">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab}
                  {tab === 'Commentaires' && task.task_comments?.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-white/10 rounded-full">
                      {task.task_comments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'Détails' && (
                <div className="space-y-5">
                  {/* Métadonnées */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <MetaField label="Créé par">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
                          {getUserInitials(task.creator)}
                        </div>
                        <span className="text-sm text-gray-300">{getUserFullName(task.creator)}</span>
                      </div>
                    </MetaField>
                    <MetaField label="Statut"><TaskStatusBadge status={task.status} /></MetaField>
                    <MetaField label="Priorité">
                      <span className={`text-sm font-medium ${getPriorityInfo(task.priority).textClass}`}>
                        {getPriorityInfo(task.priority).icon} {getPriorityInfo(task.priority).label}
                      </span>
                    </MetaField>
                    <MetaField label="Échéance">
                      {task.due_date ? (
                        <span className={`text-sm font-medium ${overdue ? 'text-red-400' : dueSoon ? 'text-amber-400' : 'text-gray-300'}`}>
                          {overdue && '⚠ '}{formatDate(task.due_date)}
                        </span>
                      ) : <span className="text-sm text-gray-500">—</span>}
                    </MetaField>
                    <MetaField label="Date début">
                      <span className="text-sm text-gray-300">{task.start_date ? formatDate(task.start_date) : '—'}</span>
                    </MetaField>
                    <MetaField label="Heures estimées">
                      <span className="text-sm text-gray-300">{task.estimated_hours ? `${task.estimated_hours}h` : '—'}</span>
                    </MetaField>
                    {task.services && <MetaField label="Service"><span className="text-sm text-gray-300">{task.services.name}</span></MetaField>}
                    {task.divisions && <MetaField label="Division"><span className="text-sm text-gray-300">{task.divisions.name}</span></MetaField>}
                  </div>

                  {/* Progression checklist */}
                  {progress && (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Progression checklist</span>
                        <span className="text-xs font-medium text-gray-300">{progress.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{progress.done} / {progress.total} éléments complétés</p>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* Session 18 — SECTION LIAISONS INTER-MODULES                  */}
                  {/* ============================================================ */}
                  {hasLinks && (
                    <div className="space-y-3">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">
                        Liaisons inter-modules
                      </span>

                      {/* Résultats clés (KR) liés */}
                      {linkedKrs.length > 0 && (
                        <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                          <div className="flex items-center gap-2 mb-2.5">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-xs font-semibold text-white">
                              Résultats clés liés ({linkedKrs.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {linkedKrs.map(kr => (
                              <div
                                key={kr.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors cursor-pointer group"
                                onClick={() => {
                                  if (kr.objective?.id) {
                                    onClose()
                                    navigate('/objectives')
                                  }
                                }}
                              >
                                {/* Indicateur niveau objectif */}
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: LEVEL_COLORS[kr.objective?.level] || '#6B7280' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-white/70 font-medium truncate">
                                    {kr.title}
                                  </p>
                                  {kr.objective && (
                                    <p className="text-[10px] text-white/30 truncate">
                                      {LEVEL_LABELS[kr.objective.level] || kr.objective.level} : {kr.objective.title}
                                    </p>
                                  )}
                                </div>
                                {/* Barre de progression KR */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.round((kr.score || 0) * 100)}%`,
                                        background: getKrScoreColor(kr.score || 0),
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="text-[10px] font-mono font-bold w-8 text-right"
                                    style={{ color: getKrScoreColor(kr.score || 0) }}
                                  >
                                    {Math.round((kr.score || 0) * 100)}%
                                  </span>
                                </div>
                                {/* Flèche navigation */}
                                <svg className="w-3 h-3 text-white/10 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projets liés */}
                      {linkedProjects.length > 0 && (
                        <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                          <div className="flex items-center gap-2 mb-2.5">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="text-xs font-semibold text-white">
                              Projets liés ({linkedProjects.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {linkedProjects.map(proj => (
                              <div
                                key={proj.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors cursor-pointer group"
                                onClick={() => {
                                  onClose()
                                  navigate('/projects')
                                }}
                              >
                                {/* Pastille statut */}
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: PROJECT_STATUS_COLORS[proj.status] || '#6B7280' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-white/70 font-medium truncate">
                                    {proj.name}
                                  </p>
                                  <p className="text-[10px] text-white/30">
                                    {PROJECT_STATUS_LABELS[proj.status] || proj.status}
                                  </p>
                                </div>
                                {/* Barre progression projet */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                      style={{ width: `${proj.progress || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-white/40 w-8 text-right">
                                    {proj.progress || 0}%
                                  </span>
                                </div>
                                <svg className="w-3 h-3 text-white/10 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* FIN SECTION LIAISONS INTER-MODULES */}

                  {/* Assignés */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assignés</span>
                      {canEdit && (
                        <button onClick={() => setEditingAssignees(!editingAssignees)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                          {editingAssignees ? 'Annuler' : 'Modifier'}
                        </button>
                      )}
                    </div>
                    {editingAssignees ? (
                      <div className="space-y-2">
                        <div className="max-h-40 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
                          {allUsers.map(u => (
                            <label key={u.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${tempAssignees.includes(u.id) ? 'bg-indigo-500/20' : 'hover:bg-white/5'}`}>
                              <input type="checkbox" checked={tempAssignees.includes(u.id)} onChange={() => setTempAssignees(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} className="accent-indigo-500" />
                              <span className="text-sm text-gray-300">{getUserFullName(u)}</span>
                            </label>
                          ))}
                        </div>
                        <button onClick={handleSaveAssignees} className="w-full py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Enregistrer</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {task.task_assignees?.length === 0 ? (
                          <span className="text-sm text-gray-500">Aucun assigné</span>
                        ) : task.task_assignees?.map(a => (
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
                </div>
              )}
              {/* ✅ Session 24 — Mini-widget PULSE : temps loggué aujourd'hui */}
              {activeTab === 'Détails' && pulseActive && todayLog && (
                <PulseTimeWidget taskId={task?.id} todayLog={todayLog} />
              )}
              {activeTab === 'Checklists' && <TaskChecklist task={task} />}
              {activeTab === 'Commentaires' && <TaskComments taskId={task.id} />}
              {activeTab === 'Activité' && <TaskActivityLog taskId={task.id} />}
              {/* ✅ S77 */}
              {activeTab === 'Dépendances' && (
                <TaskDependencyGraph taskId={task.id} task={task} />
              )}
              {activeTab === 'Récurrence' && (
                <RecurrenceConfig taskId={task.id} />
              )}
              {activeTab === 'Temps' && (
                <TimeTrackingPanel taskId={task.id} estimatedMinutes={task.estimated_minutes} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal refus */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="bg-[#1a1a35] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h3 className="text-base font-semibold text-white mb-1">Refuser la tâche</h3>
            <p className="text-sm text-gray-400 mb-4">Indiquez le motif du refus.</p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Motif du refus..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowRejectModal(false); setRejectReason('') }} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-40">Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="bg-[#1a1a35] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <h3 className="text-base font-semibold text-white mb-2">Supprimer la tâche ?</h3>
            <p className="text-sm text-gray-400 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MetaField({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

// ─── MINI-WIDGET PULSE LOG DE TEMPS ─────────────────────────
// ✅ Session 24 — Phase F : mini-widget temps loggué sur cette tâche
// Conditionnel à isPulseEnabled — ne modifie rien dans le module Tâches
function PulseTimeWidget({ taskId, todayLog }) {
  if (!taskId || !todayLog) return null

  const entries = (todayLog.daily_log_entries || []).filter(e => e.task_id === taskId)
  if (!entries.length) return null

  const totalMin = entries.reduce((sum, e) => sum + (e.time_spent_min || 0), 0)
  const lastEntry = entries[entries.length - 1]

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'rgba(79,70,229,0.06)',
        border: '1px solid rgba(79,70,229,0.12)',
      }}
    >
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
        style={{ background: 'rgba(79,70,229,0.15)' }}
      >
        ⏱
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-indigo-300/70 font-medium">PULSE — Aujourd'hui</p>
        <p className="text-sm font-semibold text-white/80">
          {formatMinutes(totalMin)} loggué{entries.length > 1 ? ` (${entries.length} entrées)` : ''}
        </p>
        {lastEntry?.task_status && (
          <p className="text-[10px] text-white/30 mt-0.5 capitalize">
            Statut : {lastEntry.task_status.replace('_', ' ')}
          </p>
        )}
      </div>
    </div>
  )
}
