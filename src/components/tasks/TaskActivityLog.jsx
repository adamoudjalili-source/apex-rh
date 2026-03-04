// ============================================================
// APEX RH — TaskActivityLog.jsx
// ============================================================
import { useTaskActivity } from '../../hooks/useTasks'
import { ACTION_LABELS, TASK_STATUS, TASK_PRIORITY, getUserFullName } from '../../lib/taskHelpers'

export default function TaskActivityLog({ taskId }) {
  const { data: activities = [], isLoading } = useTaskActivity(taskId)

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  function renderValue(action, value) {
    if (!value) return null
    if (action === 'status_changed' || action === 'approved' || action === 'rejected') {
      const info = TASK_STATUS[value]
      if (info) return (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${info.bg} ${info.text}`}>
          {info.label}
        </span>
      )
    }
    if (action === 'priority_changed') {
      const info = TASK_PRIORITY[value]
      if (info) return <span className={`text-xs font-medium ${info.textClass}`}>{info.icon} {info.label}</span>
    }
    return <span className="text-xs text-gray-300">{value}</span>
  }

  function getActionIcon(action) {
    const icons = {
      created: '🎯',
      status_changed: '🔄',
      assigned: '👤',
      unassigned: '👤',
      priority_changed: '⚡',
      due_date_changed: '📅',
      title_changed: '✏️',
      approved: '✅',
      rejected: '❌',
      checklist_added: '☑️',
      comment_added: '💬',
    }
    return icons[action] || '•'
  }

  if (isLoading) return <div className="text-xs text-gray-500">Chargement...</div>
  if (activities.length === 0) return <p className="text-sm text-gray-500 italic">Aucune activité enregistrée.</p>

  return (
    <div className="space-y-3">
      {activities.map((activity, i) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] shrink-0">
              {getActionIcon(activity.action)}
            </div>
            {i < activities.length - 1 && (
              <div className="w-px flex-1 bg-white/5 mt-1" />
            )}
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-gray-200">
                {getUserFullName(activity.users)}
              </span>
              <span className="text-gray-500">
                {ACTION_LABELS[activity.action] || activity.action}
              </span>
              {activity.old_value && (
                <>
                  {renderValue(activity.action, activity.old_value)}
                  <span className="text-gray-600">→</span>
                </>
              )}
              {activity.new_value && renderValue(activity.action, activity.new_value)}
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">
              {formatTime(activity.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}