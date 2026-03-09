// APEX RH — KanbanCard.jsx
// ✅ S9   : `relative` pour barre priorité
// ✅ S19  : Fix isOverdue + isDueSoon
// ✅ S125 : tags + pièces jointes
// ✅ S127 : tags colorés (task_tag_links) + badge SLA
// ============================================================
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getPriorityInfo, formatDateShort, isOverdue, isDueSoon,
  getChecklistProgress, getUserInitials, getSLAStatus
} from '../../lib/taskHelpers'

export default function KanbanCard({ task, onClick }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priorityInfo     = getPriorityInfo(task.priority)
  const progress         = getChecklistProgress(task.task_checklists)
  const overdue          = isOverdue(task.due_date, task.status)
  const dueSoon          = isDueSoon(task.due_date, 3, task.status)
  const sla              = getSLAStatus(task)
  const assignees        = task.task_assignees || []
  const commentCount     = task.task_comments?.length || 0
  const attachmentCount  = task.task_attachments?.length || 0
  const tags             = task.task_tag_links?.map(l => l.task_tags).filter(Boolean) || []

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative bg-[#16162a] border rounded-xl p-3.5 cursor-pointer transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 ${
        isDragging ? 'shadow-2xl shadow-indigo-500/20 rotate-1 scale-105 z-50' : ''
      } ${
        task.priority === 'urgente' ? 'border-red-500/30' :
        task.priority === 'haute'   ? 'border-amber-500/20' :
        'border-white/8'
      }`}
    >
      {/* Barre priorité */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full opacity-60"
        style={{ backgroundColor: priorityInfo.color }}
      />

      {/* SLA breach — fine barre rouge en haut */}
      {sla?.status === 'breach' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 rounded-t-xl" />
      )}
      {sla?.status === 'warning' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-xl" />
      )}

      {/* Titre */}
      <p className="text-sm font-medium text-gray-100 leading-snug mb-2 pr-1 pl-2 group-hover:text-white transition-colors">
        {task.title}
      </p>

      {/* Tags colorés (task_tag_links → task_tags) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 pl-2">
          {tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
              style={{
                backgroundColor: tag.color + '20',
                borderColor:     tag.color + '50',
                color:           tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Service (si pas de tags) */}
      {tags.length === 0 && task.services && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded mb-2 ml-2">
          {task.services.name}
        </span>
      )}

      {/* Checklist progress */}
      {progress && (
        <div className="flex items-center gap-2 mb-2 pl-2">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress.pct}%`,
                backgroundColor: progress.pct === 100 ? '#10B981' : '#4F46E5'
              }}
            />
          </div>
          <span className="text-[10px] text-gray-500 shrink-0">{progress.done}/{progress.total}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pl-2">
        {/* Date + SLA */}
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`text-[10px] flex items-center gap-1 ${
              overdue ? 'text-red-400' : dueSoon ? 'text-amber-400' : 'text-gray-500'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDateShort(task.due_date)}
            </span>
          )}
          {sla && sla.status !== 'ok' && (
            <span className={`text-[10px] font-medium ${sla.status === 'breach' ? 'text-red-400' : 'text-amber-400'}`}>
              {sla.status === 'breach' ? '⚡SLA' : `⚡${sla.hoursLeft}h`}
            </span>
          )}
        </div>

        {/* Icônes + assignés */}
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {attachmentCount}
            </span>
          )}
          <span className={`text-[11px] font-bold ${priorityInfo.textClass}`}>
            {priorityInfo.icon}
          </span>
          {assignees.length > 0 && (
            <div className="flex -space-x-1">
              {assignees.slice(0, 3).map(a => (
                <div
                  key={a.id}
                  title={`${a.users?.first_name} ${a.users?.last_name}`}
                  className="w-5 h-5 rounded-full bg-indigo-600 border border-[#16162a] flex items-center justify-center text-[8px] font-bold text-white"
                >
                  {getUserInitials(a.users)}
                </div>
              ))}
              {assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-gray-700 border border-[#16162a] flex items-center justify-center text-[8px] text-gray-300">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
