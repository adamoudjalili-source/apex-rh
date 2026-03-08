// ============================================================
// APEX RH — KanbanView.jsx
// Drag & drop avec @dnd-kit — state local + verrou post-drop
// ============================================================
import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { KANBAN_COLUMNS, getAllowedStatuses } from '../../lib/taskHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { useUpdateTaskStatus } from '../../hooks/useTasks'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

export default function KanbanView({ tasks, onTaskClick }) {
  const [activeTask, setActiveTask] = useState(null)
  const [localTasks, setLocalTasks] = useState(tasks)
  const { profile } = useAuth()
  const updateStatus = useUpdateTaskStatus()
  const dropLockRef = useRef(false)

  // Synchroniser les tâches locales avec les props
  // SAUF si on vient de drop (verrou actif pendant 2s)
  useEffect(() => {
    if (!dropLockRef.current) {
      setLocalTasks(tasks)
    }
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getTasksByStatus(status) {
    return localTasks
      .filter(t => t.status === status)
      .sort((a, b) => a.position - b.position)
  }

  function handleDragStart({ active }) {
    setActiveTask(localTasks.find(t => t.id === active.id) || null)
  }

  function handleDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over) return

    const draggedTask = localTasks.find(t => t.id === active.id)
    if (!draggedTask) return

    // Déterminer le nouveau statut (drop sur colonne ou sur carte)
    let newStatus = null
    const overColumn = KANBAN_COLUMNS.find(c => c.id === over.id)
    if (overColumn) {
      newStatus = overColumn.id
    } else {
      const overTask = localTasks.find(t => t.id === over.id)
      if (overTask) newStatus = overTask.status
    }

    if (!newStatus || newStatus === draggedTask.status) return

    // Vérifier que la transition est autorisée pour cet utilisateur
    const allowed = getAllowedStatuses(draggedTask, profile)
    if (!allowed.includes(newStatus)) return

    // Activer le verrou — empêche la sync des props pendant 2 secondes
    dropLockRef.current = true

    // Mettre à jour le state local IMMÉDIATEMENT
    setLocalTasks(prev =>
      prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t)
    )

    // Envoyer la mutation à Supabase
    updateStatus.mutate(
      {
        taskId: active.id,
        newStatus: newStatus,
        oldStatus: draggedTask.status,
      },
      {
        onSettled: () => {
          // Relâcher le verrou après que la mutation soit terminée
          setTimeout(() => {
            dropLockRef.current = false
          }, 500)
        },
        onError: () => {
          // Rollback le state local en cas d'erreur
          setLocalTasks(prev =>
            prev.map(t => t.id === active.id ? { ...t, status: draggedTask.status } : t)
          )
          dropLockRef.current = false
        },
      }
    )
  }

  function handleDragOver() {
    // Pas de logique spéciale nécessaire
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-0">
        {KANBAN_COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksByStatus(column.id)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105 opacity-90">
            <KanbanCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}