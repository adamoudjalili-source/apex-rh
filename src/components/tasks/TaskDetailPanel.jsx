// ============================================================
// APEX RH — TaskDetailPanel.jsx  ·  S127
// Shell : header + onglets primaires/secondaires
// Primaires  (toujours visibles) : Détails · Commentaires · Temps
// Secondaires (menu "···")       : Checklists · Fichiers · Activité · Dépendances · Récurrence
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { useAuth }              from '../../contexts/AuthContext'
import { useTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks'
import { useTaskDetailRealtime } from '../../hooks/useTaskRealtime'
import { getPriorityInfo, canValidateTask, canEditTask, canDeleteTask, getAllowedStatuses } from '../../lib/taskHelpers'
import { TASK_STATUS }          from '../../lib/taskHelpers'
import TaskStatusBadge          from './TaskStatusBadge'
import TaskForm                 from './TaskForm'
import TaskDetailTabDetails     from './TaskDetailTabDetails'
import TaskDetailTabComments    from './TaskDetailTabComments'
import TaskChecklist            from './TaskChecklist'
import TaskActivityLog          from './TaskActivityLog'
import TaskDependencyGraph      from './TaskDependencyGraph'
import RecurrenceConfig         from './RecurrenceConfig'
import TimeTrackingPanel        from './TimeTrackingPanel'
import TaskAttachments          from './TaskAttachments'

// Onglets primaires : toujours visibles dans la barre
const PRIMARY_TABS = ['Détails', 'Commentaires', 'Temps']
// Onglets secondaires : accessibles via le menu "···"
const SECONDARY_TABS = ['Checklists', 'Fichiers', 'Activité', 'Dépendances', 'Récurrence']

export default function TaskDetailPanel({ taskId, onClose }) {
  const { profile }               = useAuth()
  const { data: task, isLoading } = useTask(taskId)
  const updateStatus              = useUpdateTaskStatus()
  const deleteTask                = useDeleteTask()
  useTaskDetailRealtime(taskId)

  const [activeTab, setActiveTab]       = useState('Détails')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [editing, setEditing]           = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject]     = useState(false)
  const [showDelete, setShowDelete]     = useState(false)
  const moreMenuRef                     = useRef(null)

  // Fermer le menu "···" au clic extérieur
  useEffect(() => {
    function handler(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!taskId) return null

  const canEdit     = task && profile && canEditTask(task, profile)
  const canDelete   = task && profile && canDeleteTask(task, profile)
  const canValidate = task && profile && canValidateTask(task, profile)
  const isSecondary = SECONDARY_TABS.includes(activeTab)

  async function handleApprove() {
    await updateStatus.mutateAsync({ taskId: task.id, newStatus: 'terminee', oldStatus: task.status })
    onClose()
  }
  async function handleReject() {
    if (!rejectReason.trim()) return
    await updateStatus.mutateAsync({ taskId: task.id, newStatus: 'en_cours', oldStatus: task.status, rejectionReason: rejectReason })
    setShowReject(false); setRejectReason(''); onClose()
  }
  async function handleDelete() { await deleteTask.mutateAsync(task.id); onClose() }

  function selectTab(tab) {
    setActiveTab(tab)
    setShowMoreMenu(false)
  }

  // Badge count par onglet
  function tabBadge(tab) {
    if (!task) return null
    if (tab === 'Commentaires' && task.task_comments?.length > 0)  return task.task_comments.length
    if (tab === 'Fichiers'     && task.task_attachments?.length > 0) return task.task_attachments.length
    return null
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-[#0F0F23] border-l border-white/10 z-50 flex flex-col shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {task && <TaskStatusBadge status={task.status} />}
            {task && <span className={`text-xs font-medium ${getPriorityInfo(task.priority).textClass}`}>{getPriorityInfo(task.priority).icon} {getPriorityInfo(task.priority).label}</span>}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">✏ Modifier</button>
            )}
            {canDelete && (
              <button onClick={() => setShowDelete(true)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white transition-colors rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !task ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Tâche introuvable</div>
        ) : editing ? (
          <div className="flex-1 overflow-y-auto px-6 py-4"><TaskForm task={task} onClose={() => setEditing(false)} /></div>
        ) : (
          <>
            {/* Titre + description */}
            <div className="px-6 py-4 border-b border-white/5 shrink-0">
              <h2 className="text-lg font-semibold text-white mb-1">{task.title}</h2>
              {task.description && <p className="text-sm text-gray-400 leading-relaxed">{task.description}</p>}
              {task.rejection_reason && task.status === 'en_cours' && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 text-xs mt-0.5">⚠</span>
                  <div><p className="text-xs font-medium text-red-400">Tâche refusée</p><p className="text-xs text-red-300/70 mt-0.5">{task.rejection_reason}</p></div>
                </div>
              )}
            </div>

            {/* Workflow validation */}
            {(canValidate || canEdit) && (
              <div className="px-6 py-3 border-b border-white/5 shrink-0 flex flex-wrap items-center gap-2">
                {canEdit && task.status === 'en_cours' && (
                  <button onClick={() => updateStatus.mutate({ taskId: task.id, newStatus: 'en_revue', oldStatus: task.status })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">Soumettre pour validation</button>
                )}
                {canValidate && task.status === 'en_revue' && (
                  <>
                    <button onClick={handleApprove} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">✓ Approuver</button>
                    <button onClick={() => setShowReject(true)} className="px-3 py-1.5 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors">✕ Refuser</button>
                  </>
                )}
                {canEdit && (() => {
                  const allowed = getAllowedStatuses(task, profile)
                  if (!allowed.length) return null
                  return (
                    <select value={task.status} onChange={e => updateStatus.mutateAsync({ taskId: task.id, newStatus: e.target.value, oldStatus: task.status })}
                      className="ml-auto px-2.5 py-1.5 text-xs bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500">
                      <option value={task.status} className="bg-[#1a1a35]">{TASK_STATUS[task.status]?.label || task.status}</option>
                      {allowed.map(k => <option key={k} value={k} className="bg-[#1a1a35]">{TASK_STATUS[k]?.label || k}</option>)}
                    </select>
                  )
                })()}
              </div>
            )}

            {/* Barre d'onglets : primaires + menu "···" */}
            <div className="flex items-center border-b border-white/10 shrink-0 px-6 overflow-x-auto">
              {PRIMARY_TABS.map(tab => {
                const badge = tabBadge(tab)
                return (
                  <button key={tab} onClick={() => selectTab(tab)}
                    className={`px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                    {tab}
                    {badge && <span className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded-full">{badge}</span>}
                  </button>
                )
              })}

              {/* Menu "···" onglets secondaires */}
              <div className="relative ml-auto shrink-0" ref={moreMenuRef}>
                <button onClick={() => setShowMoreMenu(v => !v)}
                  className={`flex items-center gap-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${isSecondary ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                  {isSecondary ? activeTab : '···'}
                  {isSecondary && tabBadge(activeTab) && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded-full">{tabBadge(activeTab)}</span>
                  )}
                  <svg className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-[#1a1a35] border border-white/10 rounded-xl shadow-xl z-10 min-w-[160px] py-1">
                    {SECONDARY_TABS.map(tab => {
                      const badge = tabBadge(tab)
                      return (
                        <button key={tab} onClick={() => selectTab(tab)}
                          className={`w-full text-left flex items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === tab ? 'text-indigo-400' : 'text-gray-400'}`}>
                          {tab}
                          {badge && <span className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded-full">{badge}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Contenu onglet actif */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'Détails'      && <TaskDetailTabDetails task={task} profile={profile} canEdit={canEdit} />}
              {activeTab === 'Commentaires' && <TaskDetailTabComments taskId={task.id} />}
              {activeTab === 'Temps'        && <TimeTrackingPanel taskId={task.id} estimatedMinutes={task.estimated_minutes} />}
              {activeTab === 'Checklists'   && <TaskChecklist task={task} />}
              {activeTab === 'Fichiers'     && <TaskAttachments taskId={task.id} canUpload={canEdit} />}
              {activeTab === 'Activité'     && <TaskActivityLog taskId={task.id} />}
              {activeTab === 'Dépendances'  && <TaskDependencyGraph taskId={task.id} task={task} />}
              {activeTab === 'Récurrence'   && <RecurrenceConfig taskId={task.id} />}
            </div>
          </>
        )}
      </div>

      {/* Modale refus */}
      {showReject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="bg-[#1a1a35] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h3 className="text-base font-semibold text-white mb-1">Refuser la tâche</h3>
            <p className="text-sm text-gray-400 mb-4">Indiquez le motif du refus.</p>
            <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motif..." rows={3}
              className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowReject(false); setRejectReason('') }} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-40">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale suppression */}
      {showDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="bg-[#1a1a35] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <h3 className="text-base font-semibold text-white mb-2">Supprimer la tâche ?</h3>
            <p className="text-sm text-gray-400 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
