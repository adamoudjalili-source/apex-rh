// APEX RH — ListView.jsx
// ✅ Session 19 — Fix isOverdue(task.due_date, task.status)
// ✅ Session 19 bis — Fix isDueSoon(task.due_date, 3, task.status)
// ============================================================
import { useState } from 'react'
import TaskStatusBadge from './TaskStatusBadge'
import {
  getPriorityInfo, formatDate, isOverdue, isDueSoon,
  getUserInitials, getUserFullName, TASK_STATUS, TASK_PRIORITY
} from '../../lib/taskHelpers'

const COLS = [
  { key: 'title',    label: 'Tâche',       sortable: true },
  { key: 'status',   label: 'Statut',      sortable: true },
  { key: 'priority', label: 'Priorité',    sortable: true },
  { key: 'due_date', label: 'Échéance',    sortable: true },
  { key: 'assignees',label: 'Assignés',    sortable: false },
  { key: 'service',  label: 'Service',     sortable: false },
  { key: 'progress', label: 'Progression', sortable: false },
]

export default function ListView({ tasks, onTaskClick }) {
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(new Set())

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map(t => t.id)))
  }

  const sorted = [...tasks].sort((a, b) => {
    let va = a[sortKey] || ''
    let vb = b[sortKey] || ''
    if (sortKey === 'status') { va = Object.keys(TASK_STATUS).indexOf(a.status); vb = Object.keys(TASK_STATUS).indexOf(b.status) }
    if (sortKey === 'priority') { va = Object.keys(TASK_PRIORITY).indexOf(a.priority); vb = Object.keys(TASK_PRIORITY).indexOf(b.priority) }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function getProgress(task) {
    const checklists = task.task_checklists || []
    const all = checklists.flatMap(cl => cl.task_checklist_items || [])
    if (!all.length) return null
    const done = all.filter(i => i.is_done).length
    return { done, total: all.length, pct: Math.round((done / all.length) * 100) }
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">Aucune tâche trouvée</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/3">
            <th className="w-8 px-3 py-3">
              <input
                type="checkbox"
                checked={selected.size === tasks.length && tasks.length > 0}
                onChange={toggleAll}
                className="accent-indigo-500"
              />
            </th>
            {COLS.map(col => (
              <th
                key={col.key}
                className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer hover:text-gray-300 select-none' : ''
                }`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-indigo-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map(task => {
            const pInfo = getPriorityInfo(task.priority)
            const overdue = isOverdue(task.due_date, task.status)
            const dueSoon = isDueSoon(task.due_date, 3, task.status)
            const progress = getProgress(task)
            const assignees = task.task_assignees || []

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className={`cursor-pointer transition-colors hover:bg-white/5 ${
                  selected.has(task.id) ? 'bg-indigo-500/5' : ''
                }`}
              >
                {/* Checkbox */}
                <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleSelect(task.id) }}>
                  <input
                    type="checkbox"
                    checked={selected.has(task.id)}
                    onChange={() => {}}
                    className="accent-indigo-500"
                  />
                </td>

                {/* Titre */}
                <td className="px-3 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: pInfo.color }}
                    />
                    <span className={`font-medium truncate ${
                      task.status === 'terminee' ? 'line-through text-gray-500' : 'text-gray-100'
                    }`}>
                      {task.title}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-600 truncate mt-0.5 ml-3.5">{task.description}</p>
                  )}
                </td>

                {/* Statut */}
                <td className="px-3 py-3">
                  <TaskStatusBadge status={task.status} />
                </td>

                {/* Priorité */}
                <td className="px-3 py-3">
                  <span className={`text-xs font-medium ${pInfo.textClass}`}>
                    {pInfo.icon} {pInfo.label}
                  </span>
                </td>

                {/* Échéance */}
                <td className="px-3 py-3">
                  {task.due_date ? (
                    <span className={`text-xs ${
                      overdue ? 'text-red-400 font-medium' :
                      dueSoon ? 'text-amber-400' :
                      'text-gray-400'
                    }`}>
                      {overdue && '⚠ '}{formatDate(task.due_date)}
                    </span>
                  ) : <span className="text-gray-600">—</span>}
                </td>

                {/* Assignés */}
                <td className="px-3 py-3">
                  {assignees.length === 0 ? (
                    <span className="text-gray-600 text-xs">—</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1">
                        {assignees.slice(0, 3).map(a => (
                          <div
                            key={a.id}
                            title={getUserFullName(a.users)}
                            className="w-6 h-6 rounded-full bg-indigo-600 border-2 border-[#0F0F23] flex items-center justify-center text-[9px] font-bold text-white"
                          >
                            {getUserInitials(a.users)}
                          </div>
                        ))}
                      </div>
                      {assignees.length > 3 && (
                        <span className="text-xs text-gray-500">+{assignees.length - 3}</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Service */}
                <td className="px-3 py-3">
                  {task.services ? (
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      {task.services.name}
                    </span>
                  ) : <span className="text-gray-600">—</span>}
                </td>

                {/* Progression */}
                <td className="px-3 py-3">
                  {progress ? (
                    <div className="flex items-center gap-2 min-w-20">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progress.pct}%`,
                            backgroundColor: progress.pct === 100 ? '#10B981' : '#4F46E5'
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0">{progress.pct}%</span>
                    </div>
                  ) : <span className="text-gray-600 text-xs">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/10 bg-white/2 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {selected.size > 0 ? `${selected.size} sélectionné(s)` : `${tasks.length} tâche(s)`}
        </span>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Tout désélectionner
          </button>
        )}
      </div>
    </div>
  )
}