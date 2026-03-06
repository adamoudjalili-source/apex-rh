// ============================================================
// APEX RH — TaskChecklist.jsx
// ============================================================
import { useState } from 'react'
import { useChecklistMutations } from '../../hooks/useTasks'
import { getChecklistProgress } from '../../lib/taskHelpers'

export default function TaskChecklist({ task }) {
  const { addChecklist, addItem, toggleItem, deleteItem, deleteChecklist } = useChecklistMutations(task.id)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newItemText, setNewItemText] = useState({})
  const [addingItem, setAddingItem] = useState({})

  const checklists = task.task_checklists || []
  const progress = getChecklistProgress(checklists)

  async function handleAddChecklist() {
    if (!newChecklistTitle.trim()) return
    await addChecklist.mutateAsync(newChecklistTitle.trim())
    setNewChecklistTitle('')
    setAddingChecklist(false)
  }

  async function handleAddItem(checklistId) {
    const text = newItemText[checklistId]
    if (!text?.trim()) return
    await addItem.mutateAsync({ checklistId, content: text.trim() })
    setNewItemText(prev => ({ ...prev, [checklistId]: '' }))
    setAddingItem(prev => ({ ...prev, [checklistId]: false }))
  }

  return (
    <div className="space-y-4">
      {/* Progress global */}
      {progress && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0">{progress.done}/{progress.total}</span>
        </div>
      )}

      {/* Checklists */}
      {checklists
        .sort((a, b) => a.position - b.position)
        .map(checklist => (
          <div key={checklist.id} className="space-y-2">
            {/* Header checklist */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-sm font-medium text-gray-200">{checklist.title}</span>
              </div>
              <button
                onClick={() => deleteChecklist.mutate(checklist.id)}
                className="text-gray-600 hover:text-red-400 transition-colors text-xs"
              >
                Supprimer
              </button>
            </div>

            {/* Items */}
            <div className="space-y-1 ml-6">
              {(checklist.task_checklist_items || [])
                .sort((a, b) => a.position - b.position)
                .map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleItem.mutate({ itemId: item.id, isDone: !item.is_done })}
                      className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${
                        item.is_done
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-600 hover:border-emerald-500'
                      }`}
                    >
                      {item.is_done && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`text-sm flex-1 ${item.is_done ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                      {item.content}
                    </span>
                    <button
                      onClick={() => deleteItem.mutate(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

              {/* Ajouter un item */}
              {addingItem[checklist.id] ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded border border-gray-600 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={newItemText[checklist.id] || ''}
                    onChange={e => setNewItemText(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddItem(checklist.id)
                      if (e.key === 'Escape') setAddingItem(prev => ({ ...prev, [checklist.id]: false }))
                    }}
                    placeholder="Nouvel élément..."
                    className="flex-1 text-sm bg-transparent border-b border-indigo-500 text-white placeholder-gray-500 focus:outline-none pb-0.5"
                  />
                  <button onClick={() => handleAddItem(checklist.id)} className="text-indigo-400 text-xs hover:text-indigo-300">
                    OK
                  </button>
                  <button
                    onClick={() => setAddingItem(prev => ({ ...prev, [checklist.id]: false }))}
                    className="text-gray-500 text-xs hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingItem(prev => ({ ...prev, [checklist.id]: true }))}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un élément
                </button>
              )}
            </div>
          </div>
        ))}

      {/* Nouvelle checklist */}
      {addingChecklist ? (
        <div className="flex items-center gap-2 border border-indigo-500/30 rounded-lg px-3 py-2 bg-indigo-500/5">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <input
            autoFocus
            type="text"
            value={newChecklistTitle}
            onChange={e => setNewChecklistTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddChecklist()
              if (e.key === 'Escape') { setAddingChecklist(false); setNewChecklistTitle('') }
            }}
            placeholder="Nom de la checklist..."
            className="flex-1 text-sm bg-transparent text-white placeholder-gray-500 focus:outline-none"
          />
          <button onClick={handleAddChecklist} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500">OK</button>
          <button onClick={() => { setAddingChecklist(false); setNewChecklistTitle('') }} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAddingChecklist(true)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une checklist
        </button>
      )}
    </div>
  )
}