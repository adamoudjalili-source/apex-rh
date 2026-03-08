// ============================================================
// APEX RH — GanttChart.jsx
// Session 11 — Gantt interactif (drag to move/resize)
// ============================================================
import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Calendar, Diamond, Link2, Unlink } from 'lucide-react'
import {
  useProjectTasks, useUnlinkedTasks,
  useLinkTaskToProject, useUnlinkTaskFromProject,
  useUpdateTaskDates, useUpdateMilestone,
} from '../../hooks/useProjects'
import { getMilestoneStatusInfo, formatDateShort, getUserFullName } from '../../lib/projectHelpers'

const TASK_STATUS_COLORS = {
  a_faire: '#6B7280',
  en_cours: '#3B82F6',
  en_revue: '#8B5CF6',
  termine: '#10B981',
  annule: '#EF4444',
}

const MIN_DAY_WIDTH = 20
const MAX_DAY_WIDTH = 80

export default function GanttChart({ project, milestones = [], canEdit }) {
  const [dayWidth, setDayWidth] = useState(40)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const scrollRef = useRef(null)

  const { data: tasks = [] } = useProjectTasks(project?.id)
  const { data: unlinkedTasks = [] } = useUnlinkedTasks(project?.id)
  const linkTask = useLinkTaskToProject()
  const unlinkTask = useUnlinkTaskFromProject()
  const updateTaskDates = useUpdateTaskDates()
  const updateMs = useUpdateMilestone()

  // ─── Calcul des bornes de la timeline ──────────────────────
  const { ganttStart, ganttEnd, totalDays } = useMemo(() => {
    const dates = []

    if (project?.start_date) dates.push(new Date(project.start_date))
    if (project?.end_date) dates.push(new Date(project.end_date))

    tasks.forEach((t) => {
      if (t.start_date) dates.push(new Date(t.start_date))
      if (t.due_date) dates.push(new Date(t.due_date))
    })
    milestones.forEach((m) => {
      if (m.due_date) dates.push(new Date(m.due_date))
    })

    if (dates.length === 0) {
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 7)
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      return { ganttStart: start, ganttEnd: end, totalDays: 37 }
    }

    const min = new Date(Math.min(...dates))
    const max = new Date(Math.max(...dates))
    // Add padding
    min.setDate(min.getDate() - 7)
    max.setDate(max.getDate() + 14)

    const total = Math.ceil((max - min) / (1000 * 60 * 60 * 24))
    return { ganttStart: min, ganttEnd: max, totalDays: Math.max(total, 30) }
  }, [project, tasks, milestones])

  // ─── Helpers de positionnement ─────────────────────────────
  const dayOffset = useCallback((date) => {
    if (!date) return 0
    return Math.round((new Date(date) - ganttStart) / (1000 * 60 * 60 * 24))
  }, [ganttStart])

  const offsetToDate = useCallback((px) => {
    const days = Math.round(px / dayWidth)
    const d = new Date(ganttStart)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }, [dayWidth, ganttStart])

  // ─── Aujourd'hui ───────────────────────────────────────────
  const todayOffset = dayOffset(new Date())

  // ─── Mois headers ──────────────────────────────────────────
  const monthHeaders = useMemo(() => {
    const headers = []
    const current = new Date(ganttStart)
    let lastMonth = -1

    for (let i = 0; i < totalDays; i++) {
      if (current.getMonth() !== lastMonth) {
        headers.push({
          label: current.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          offset: i,
        })
        lastMonth = current.getMonth()
      }
      current.setDate(current.getDate() + 1)
    }
    return headers
  }, [ganttStart, totalDays])

  // ─── Week lines ────────────────────────────────────────────
  const weekLines = useMemo(() => {
    const lines = []
    const current = new Date(ganttStart)
    for (let i = 0; i < totalDays; i++) {
      if (current.getDay() === 1) lines.push(i) // Lundi
      current.setDate(current.getDate() + 1)
    }
    return lines
  }, [ganttStart, totalDays])

  // ─── Drag state ────────────────────────────────────────────
  const [drag, setDrag] = useState(null)

  const handleMouseDown = (e, item, type, dragType) => {
    e.preventDefault()
    e.stopPropagation()
    setDrag({
      item,
      type, // 'task' | 'milestone'
      dragType, // 'move' | 'resize-right' | 'resize-left'
      startX: e.clientX,
      originalStart: item.start_date,
      originalEnd: item.due_date || item.start_date,
    })
  }

  useEffect(() => {
    if (!drag) return

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - drag.startX
      const deltaDays = Math.round(deltaX / dayWidth)
      if (deltaDays === 0) return

      // On calcule les nouvelles dates pour l'aperçu visuel
      setDrag((prev) => ({ ...prev, deltaDays }))
    }

    const handleMouseUp = async () => {
      const deltaDays = drag.deltaDays || 0
      if (deltaDays !== 0) {
        try {
          if (drag.type === 'task') {
            const addDays = (d, n) => {
              const r = new Date(d)
              r.setDate(r.getDate() + n)
              return r.toISOString().split('T')[0]
            }
            if (drag.dragType === 'move') {
              await updateTaskDates.mutateAsync({
                taskId: drag.item.id,
                startDate: drag.originalStart ? addDays(drag.originalStart, deltaDays) : undefined,
                dueDate: drag.originalEnd ? addDays(drag.originalEnd, deltaDays) : undefined,
                projectId: project.id,
              })
            } else if (drag.dragType === 'resize-right') {
              await updateTaskDates.mutateAsync({
                taskId: drag.item.id,
                dueDate: addDays(drag.originalEnd, deltaDays),
                projectId: project.id,
              })
            } else if (drag.dragType === 'resize-left') {
              await updateTaskDates.mutateAsync({
                taskId: drag.item.id,
                startDate: addDays(drag.originalStart, deltaDays),
                projectId: project.id,
              })
            }
          } else if (drag.type === 'milestone') {
            const addDays = (d, n) => {
              const r = new Date(d)
              r.setDate(r.getDate() + n)
              return r.toISOString().split('T')[0]
            }
            await updateMs.mutateAsync({
              id: drag.item.id,
              updates: { due_date: addDays(drag.item.due_date, deltaDays) },
              projectId: project.id,
            })
          }
        } catch (err) { console.error('Gantt drag error:', err) }
      }
      setDrag(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [drag, dayWidth, project?.id, updateTaskDates, updateMs])

  // ─── Lier / Délier tâche ──────────────────────────────────
  const handleLink = async (taskId) => {
    try {
      await linkTask.mutateAsync({ taskId, projectId: project.id })
    } catch (err) { console.error(err) }
  }

  const handleUnlink = async (taskId) => {
    try {
      await unlinkTask.mutateAsync({ taskId, projectId: project.id })
    } catch (err) { console.error(err) }
  }

  const timelineWidth = totalDays * dayWidth

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar size={14} className="text-indigo-400" />
          Gantt
          <span className="text-[10px] text-white/20 font-normal">
            ({tasks.length} tâches · {milestones.length} jalons)
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setShowLinkModal(!showLinkModal)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <Link2 size={12} /> Lier des tâches
            </button>
          )}
          <button
            onClick={() => setDayWidth(Math.max(MIN_DAY_WIDTH, dayWidth - 10))}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5"
            title="Zoom arrière"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-white/20 font-mono w-8 text-center">{dayWidth}px</span>
          <button
            onClick={() => setDayWidth(Math.min(MAX_DAY_WIDTH, dayWidth + 10))}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5"
            title="Zoom avant"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Modal lien tâches */}
      {showLinkModal && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-[10px] text-white/30 font-medium">Tâches non liées à un projet :</p>
          {unlinkedTasks.length === 0 ? (
            <p className="text-[10px] text-white/15">Aucune tâche disponible</p>
          ) : (
            unlinkedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => handleLink(t.id)}
                  className="px-2 py-1 rounded text-[10px] font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                >
                  + Lier
                </button>
                <span className="text-white/60 truncate">{t.title}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Gantt Chart */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="flex">
          {/* Left panel - labels */}
          <div className="w-[200px] flex-shrink-0 border-r border-white/5">
            {/* Header spacer */}
            <div className="h-12 border-b border-white/5" />

            {/* Task rows */}
            {tasks.map((t) => (
              <div key={t.id} className="h-10 flex items-center gap-2 px-3 border-b border-white/[0.03] group">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: TASK_STATUS_COLORS[t.status] || '#6B7280' }}
                />
                <span className="text-[11px] text-white/60 truncate flex-1">{t.title}</span>
                {canEdit && (
                  <button
                    onClick={() => handleUnlink(t.id)}
                    className="p-0.5 rounded text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Délier"
                  >
                    <Unlink size={10} />
                  </button>
                )}
              </div>
            ))}

            {/* Milestone rows */}
            {milestones.filter((m) => m.due_date).map((m) => (
              <div key={m.id} className="h-10 flex items-center gap-2 px-3 border-b border-white/[0.03]">
                <Diamond size={10} className="text-amber-400/60 flex-shrink-0" />
                <span className="text-[11px] text-amber-400/60 truncate">{m.title}</span>
              </div>
            ))}

            {tasks.length === 0 && milestones.filter((m) => m.due_date).length === 0 && (
              <div className="h-20 flex items-center justify-center text-[10px] text-white/15">
                Liez des tâches pour remplir le Gantt
              </div>
            )}
          </div>

          {/* Right panel - timeline */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: timelineWidth, minHeight: 100 }} className="relative">
              {/* Month headers */}
              <div className="h-12 border-b border-white/5 relative">
                {monthHeaders.map((mh, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center px-2 border-l border-white/5"
                    style={{ left: mh.offset * dayWidth }}
                  >
                    <span className="text-[9px] text-white/20 uppercase tracking-wider font-medium whitespace-nowrap">
                      {mh.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Week lines */}
              {weekLines.map((offset, i) => (
                <div
                  key={i}
                  className="absolute top-12 bottom-0 w-px bg-white/[0.03]"
                  style={{ left: offset * dayWidth }}
                />
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10"
                style={{
                  left: todayOffset * dayWidth,
                  background: 'linear-gradient(180deg, #EF4444, transparent)',
                }}
              >
                <div className="absolute -top-0 -left-2 px-1.5 py-0.5 rounded-b text-[8px] font-bold text-red-400 bg-red-500/10">
                  Auj.
                </div>
              </div>

              {/* Task bars */}
              {tasks.map((t, idx) => {
                if (!t.start_date && !t.due_date) return null

                const startDate = t.start_date || t.due_date
                const endDate = t.due_date || t.start_date
                let left = dayOffset(startDate) * dayWidth
                let width = Math.max((dayOffset(endDate) - dayOffset(startDate) + 1) * dayWidth, dayWidth)

                // Apply drag delta
                if (drag && drag.item.id === t.id && drag.type === 'task') {
                  const delta = (drag.deltaDays || 0) * dayWidth
                  if (drag.dragType === 'move') { left += delta }
                  else if (drag.dragType === 'resize-right') { width += delta }
                  else if (drag.dragType === 'resize-left') { left += delta; width -= delta }
                  width = Math.max(width, dayWidth)
                }

                const color = TASK_STATUS_COLORS[t.status] || '#6B7280'
                const top = 12 + idx * 40

                return (
                  <div
                    key={t.id}
                    className="absolute h-7 rounded-lg flex items-center overflow-hidden group/bar"
                    style={{
                      top: top + 6,
                      left,
                      width,
                      background: `${color}25`,
                      border: `1px solid ${color}40`,
                      cursor: canEdit ? 'grab' : 'default',
                    }}
                    onMouseDown={canEdit ? (e) => handleMouseDown(e, t, 'task', 'move') : undefined}
                  >
                    {/* Progress fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg opacity-30"
                      style={{
                        width: t.status === 'termine' ? '100%' : '0%',
                        background: color,
                      }}
                    />

                    {/* Resize handles */}
                    {canEdit && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover/bar:opacity-100 transition-opacity"
                          style={{ background: `${color}60` }}
                          onMouseDown={(e) => handleMouseDown(e, t, 'task', 'resize-left')}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover/bar:opacity-100 transition-opacity"
                          style={{ background: `${color}60` }}
                          onMouseDown={(e) => handleMouseDown(e, t, 'task', 'resize-right')}
                        />
                      </>
                    )}

                    {/* Label */}
                    {width > 60 && (
                      <span className="px-2 text-[9px] font-medium truncate relative z-10" style={{ color }}>
                        {t.title}
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Milestone diamonds */}
              {milestones.filter((m) => m.due_date).map((m, idx) => {
                let left = dayOffset(m.due_date) * dayWidth
                if (drag && drag.item.id === m.id && drag.type === 'milestone') {
                  left += (drag.deltaDays || 0) * dayWidth
                }

                const top = 12 + tasks.length * 40 + idx * 40
                const statusInfo = getMilestoneStatusInfo(m.status)

                return (
                  <div
                    key={m.id}
                    className="absolute flex items-center"
                    style={{
                      top: top + 8,
                      left: left - 8,
                      cursor: canEdit ? 'grab' : 'default',
                    }}
                    onMouseDown={canEdit ? (e) => handleMouseDown(e, m, 'milestone', 'move') : undefined}
                  >
                    <div
                      className="w-5 h-5 rotate-45 rounded-sm"
                      style={{
                        background: `${statusInfo.color}30`,
                        border: `2px solid ${statusInfo.color}`,
                      }}
                    />
                    {dayWidth > 25 && (
                      <span className="ml-3 text-[9px] text-white/30 whitespace-nowrap">
                        {formatDateShort(m.due_date)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
