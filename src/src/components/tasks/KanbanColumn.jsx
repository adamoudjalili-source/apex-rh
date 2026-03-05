// ============================================================
// APEX RH — KanbanColumn.jsx
// ============================================================
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'
import { getStatusInfo } from '../../lib/taskHelpers'
import Modal from '../ui/Modal'
import TaskForm from './TaskForm'

export default function KanbanColumn({ column, tasks, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const statusInfo = getStatusInfo(column.id)
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header colonne */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusInfo.color }}
          />
          <span className="text-sm font-semibold text-gray-300">{column.label}</span>
          <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
          title={`Ajouter dans ${column.label}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Dropzone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 rounded-xl transition-all duration-200 p-2 space-y-2 ${
          isOver
            ? 'bg-indigo-500/10 border-2 border-dashed border-indigo-500/50'
            : 'bg-white/3 border border-white/5'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <div key={task.id} className="relative pl-1">
              <KanbanCard
                task={task}
                onClick={() => onTaskClick(task.id)}
              />
            </div>
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={`flex items-center justify-center h-20 text-xs text-gray-600 ${isOver ? 'text-indigo-400' : ''}`}>
            {isOver ? 'Déposer ici' : 'Aucune tâche'}
          </div>
        )}
      </div>

      {/* Modale ajout rapide */}
      {showAddModal && (
        <Modal title={`Nouvelle tâche — ${column.label}`} onClose={() => setShowAddModal(false)}>
          <TaskForm defaultStatus={column.id} onClose={() => setShowAddModal(false)} />
        </Modal>
      )}
    </div>
  )
}