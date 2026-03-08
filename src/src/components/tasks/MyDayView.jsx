// APEX RH — MyDayView.jsx
// Vue personnelle "Ma Journée"
// ✅ Session 9 — Corrigé : user→profile pour nom + id
// ✅ Session 19 — Fix isOverdue(task.due_date, task.status)
// ✅ Session 19 bis — Fix isDueSoon(task.due_date, 3, task.status)
// ============================================================
import { useAuth } from '../../contexts/AuthContext'
import TaskStatusBadge from './TaskStatusBadge'
import {
  getPriorityInfo, formatDate, isOverdue, isDueSoon,
  getChecklistProgress, getUserFullName
} from '../../lib/taskHelpers'

export default function MyDayView({ tasks, onTaskClick }) {
  // ✅ FIX Bug 1 : utiliser `profile` qui a first_name, last_name, id, etc.
  const { profile } = useAuth()

  const today = new Date().toISOString().split('T')[0]

  const myTasks = tasks.filter(t =>
    t.task_assignees?.some(a => a.user_id === profile?.id) ||
    t.created_by === profile?.id
  )

  const dueToday = myTasks.filter(t => t.due_date === today)
  const overdue = myTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'terminee')
  const inProgress = myTasks.filter(t => t.status === 'en_cours' && t.due_date !== today)
  const inReview = myTasks.filter(t => t.status === 'en_revue')
  const upcoming = myTasks.filter(t => t.due_date && t.due_date > today && t.status !== 'terminee')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const totalDone = myTasks.filter(t => t.status === 'terminee').length
  const totalActive = myTasks.filter(t => t.status !== 'terminee' && t.status !== 'backlog').length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            {/* ✅ FIX Bug 1 : profile.first_name au lieu de user.first_name */}
            Bonjour, {profile?.first_name || 'Utilisateur'} 👋
          </h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{todayStr}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-400">{totalActive}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">En cours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{totalDone}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Terminées</div>
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <Section title="En retard" icon="⚠" count={overdue.length} accent="red" tasks={overdue} onTaskClick={onTaskClick} />
      )}

      <Section title="Aujourd'hui" icon="🎯" count={dueToday.length} accent="indigo" tasks={dueToday} onTaskClick={onTaskClick} emptyMsg="Aucune tâche prévue pour aujourd'hui" />

      {inReview.length > 0 && (
        <Section title="En attente de validation" icon="⏳" count={inReview.length} accent="violet" tasks={inReview} onTaskClick={onTaskClick} />
      )}

      {inProgress.length > 0 && (
        <Section title="En cours" icon="◉" count={inProgress.length} accent="amber" tasks={inProgress} onTaskClick={onTaskClick} />
      )}

      {upcoming.length > 0 && (
        <Section title="Prochaines échéances" icon="📅" count={upcoming.length} accent="gray" tasks={upcoming} onTaskClick={onTaskClick} />
      )}

      {myTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-base font-medium text-gray-400">Vous n'avez aucune tâche assignée</p>
          <p className="text-sm text-gray-600 mt-1">Profitez-en ou créez vos propres tâches !</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, count, accent, tasks, onTaskClick, emptyMsg }) {
  const accentColors = {
    red:    'text-red-400 bg-red-500/10 border-red-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    gray:   'text-gray-400 bg-white/5 border-white/10',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {count > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${accentColors[accent]}`}>{count}</span>
        )}
      </div>

      {tasks.length === 0 && emptyMsg ? (
        <p className="text-sm text-gray-600 pl-6 italic">{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const pInfo = getPriorityInfo(task.priority)
            const progress = getChecklistProgress(task.task_checklists)
            const taskOverdue = isOverdue(task.due_date, task.status)
            const soon = isDueSoon(task.due_date, 3, task.status)

            return (
              <button
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white/3 border border-white/8 rounded-xl hover:border-indigo-500/30 hover:bg-white/5 transition-all group"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pInfo.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${task.status === 'terminee' ? 'line-through text-gray-500' : 'text-gray-100 group-hover:text-white'}`}>
                      {task.title}
                    </span>
                    <TaskStatusBadge status={task.status} size="xs" />
                  </div>
                  {progress && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${progress.pct}%`, backgroundColor: progress.pct === 100 ? '#10B981' : '#4F46E5' }} />
                      </div>
                      <span className="text-[10px] text-gray-500">{progress.pct}%</span>
                    </div>
                  )}
                </div>
                {task.due_date && (
                  <span className={`text-xs shrink-0 ${taskOverdue ? 'text-red-400 font-medium' : soon ? 'text-amber-400' : 'text-gray-500'}`}>
                    {formatDate(task.due_date)}
                  </span>
                )}
                <svg className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}