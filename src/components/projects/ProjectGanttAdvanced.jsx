// ============================================================
// APEX RH — ProjectGanttAdvanced.jsx
// Session 79 — Gantt 3 mois SVG natif : multi-projets, jalons, dépendances
// ============================================================
import { useState, useMemo, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Diamond, Circle, RefreshCw, Filter,
} from 'lucide-react'
import { useProjectsGantt } from '../../hooks/useProjects'
import { TASK_STATUS } from '../../utils/constants'

// ─── Helpers ───────────────────────────────────────────────
function addMonths(date, n) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function eachDayOfInterval(start, end) {
  const days = []
  const cur = startOfDay(start)
  const last = startOfDay(end)
  while (cur <= last) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

const STATUS_COLORS = {
  a_faire: '#6B7280',
  en_cours: '#3B82F6',
  en_revue: '#8B5CF6',
  termine: '#10B981',
  annule: '#EF4444',
}

const PROJECT_PALETTE = [
  '#6366F1', '#F59E0B', '#10B981', '#3B82F6', '#EC4899',
  '#8B5CF6', '#14B8A6', '#F97316', '#84CC16', '#EF4444',
]

const DAY_W_MIN = 16
const DAY_W_MAX = 60
const ROW_H = 28
const LABEL_W = 180
const HEADER_H = 48

// ─── MiniProgressBar inside task bar ─────────────────────
function TaskBar({ x, y, w, task, color, dayW }) {
  if (w < 2) return null
  const radius = 3
  const label = dayW > 25 && w > 50 ? task.title : ''

  return (
    <g>
      <rect
        x={x} y={y + 4} width={w} height={ROW_H - 10}
        rx={radius} ry={radius}
        fill={color}
        opacity={task.status === 'annule' ? 0.35 : 0.85}
      />
      {/* Stripe pour TASK_STATUS.TERMINE */}
      {task.status === TASK_STATUS.TERMINE && (
        <rect
          x={x} y={y + 4} width={w} height={ROW_H - 10}
          rx={radius} ry={radius}
          fill="url(#done-pattern)"
          opacity={0.3}
        />
      )}
      {label && (
        <text
          x={x + 5} y={y + ROW_H / 2 + 1}
          fill="white" fontSize={10} dominantBaseline="middle"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label.length > 18 ? label.slice(0, 16) + '…' : label}
        </text>
      )}
    </g>
  )
}

export default function ProjectGanttAdvanced() {
  const today = startOfDay(new Date())
  const [windowStart, setWindowStart] = useState(() => {
    const d = new Date(today)
    d.setDate(1)
    return d
  })
  const [dayW, setDayW] = useState(24)
  const [expandedProjects, setExpandedProjects] = useState({})
  const [filterStatus, setFilterStatus] = useState('')
  const scrollRef = useRef(null)

  const windowEnd = useMemo(() => {
    const d = addMonths(windowStart, 3)
    d.setDate(d.getDate() - 1)
    return d
  }, [windowStart])

  const startStr = windowStart.toISOString().slice(0, 10)
  const endStr = windowEnd.toISOString().slice(0, 10)

  const { data: ganttData, isLoading, refetch } = useProjectsGantt(startStr, endStr)
  const projects = ganttData?.projects || []

  const days = useMemo(() => eachDayOfInterval(windowStart, windowEnd), [windowStart, windowEnd])
  const totalW = days.length * dayW

  // Helper: position X d'une date sur le Gantt
  const dateToX = (dateStr) => {
    if (!dateStr) return null
    const d = startOfDay(new Date(dateStr))
    const diff = Math.floor((d - windowStart) / (1000 * 60 * 60 * 24))
    return LABEL_W + diff * dayW
  }

  // Groupement des mois pour l'en-tête
  const monthGroups = useMemo(() => {
    const groups = []
    let cur = null
    days.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (cur?.key !== key) {
        cur = { key, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), startIdx: i, count: 1 }
        groups.push(cur)
      } else {
        cur.count++
      }
    })
    return groups
  }, [days])

  // Rows à rendre
  const rows = useMemo(() => {
    const result = []
    projects
      .filter((p) => !filterStatus || p.status === filterStatus)
      .forEach((proj, pi) => {
        const color = PROJECT_PALETTE[pi % PROJECT_PALETTE.length]
        const isExpanded = expandedProjects[proj.id] !== false // expanded by default
        result.push({ type: 'project', proj, color, pi })
        if (isExpanded) {
          proj.tasks?.forEach((task) => {
            result.push({ type: 'task', task, proj, color })
          })
          proj.milestones?.forEach((ms) => {
            result.push({ type: 'milestone', ms, proj, color })
          })
        }
      })
    return result
  }, [projects, expandedProjects, filterStatus])

  const svgH = HEADER_H + rows.length * ROW_H + 20

  const toggleProject = (projId) => {
    setExpandedProjects((prev) => ({ ...prev, [projId]: !(prev[projId] !== false) }))
  }

  const todayX = dateToX(today.toISOString().slice(0, 10))

  return (
    <div className="space-y-3">
      {/* Barre de contrôle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowStart((d) => addMonths(d, -3))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">
            {windowStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            {' → '}
            {windowEnd.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setWindowStart((d) => addMonths(d, 3))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre statut */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value=TASK_STATUS.EN_COURS>En cours</option>
            <option value="planifie">Planifié</option>
            <option value="en_attente">En attente</option>
            <option value=TASK_STATUS.TERMINE>Terminé</option>
          </select>

          <button
            onClick={() => setDayW((w) => Math.max(DAY_W_MIN, w - 4))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            title="Dézoomer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/40 w-8 text-center">{dayW}px</span>
          <button
            onClick={() => setDayW((w) => Math.min(DAY_W_MAX, w + 4))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            title="Zoomer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={refetch}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
            <span className="text-xs text-white/50 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Diamond className="w-3 h-3 text-amber-400" />
          <span className="text-xs text-white/50">Jalon</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 border-l border-dashed border-blue-400" />
          <span className="text-xs text-white/50">Aujourd'hui</span>
        </div>
      </div>

      {/* Gantt SVG */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-white/40 text-sm">
          Chargement du Gantt…
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 rounded-xl border border-dashed border-white/10">
          <p className="text-sm text-white/40">Aucun projet dans cette période</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f1117]"
        >
          <svg
            width={LABEL_W + totalW}
            height={svgH}
            style={{ display: 'block', minWidth: LABEL_W + totalW }}
          >
            <defs>
              <pattern id="done-pattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="white" strokeWidth={2} />
              </pattern>
              <clipPath id="timeline-clip">
                <rect x={LABEL_W} y={0} width={totalW} height={svgH} />
              </clipPath>
            </defs>

            {/* ── En-tête mois ── */}
            {monthGroups.map((mg) => (
              <g key={mg.key}>
                <rect
                  x={LABEL_W + mg.startIdx * dayW}
                  y={0}
                  width={mg.count * dayW}
                  height={24}
                  fill="rgba(255,255,255,0.04)"
                  stroke="rgba(255,255,255,0.06)"
                />
                <text
                  x={LABEL_W + mg.startIdx * dayW + 6}
                  y={15}
                  fill="rgba(255,255,255,0.5)"
                  fontSize={11}
                  fontWeight={600}
                  style={{ textTransform: 'capitalize' }}
                >
                  {mg.label}
                </text>
              </g>
            ))}

            {/* ── En-tête jours ── */}
            {days.map((d, i) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const isToday = d.toDateString() === today.toDateString()
              return (
                <g key={i}>
                  {isWeekend && (
                    <rect
                      x={LABEL_W + i * dayW} y={0}
                      width={dayW} height={svgH}
                      fill="rgba(255,255,255,0.015)"
                    />
                  )}
                  <text
                    x={LABEL_W + i * dayW + dayW / 2}
                    y={38}
                    textAnchor="middle"
                    fill={isToday ? '#3B82F6' : isWeekend ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)'}
                    fontSize={9}
                    fontWeight={isToday ? 700 : 400}
                  >
                    {dayW >= 18 ? d.getDate() : ''}
                  </text>
                </g>
              )
            })}

            {/* ── Ligne "Aujourd'hui" ── */}
            {todayX !== null && todayX >= LABEL_W && todayX <= LABEL_W + totalW && (
              <line
                x1={todayX + dayW / 2} y1={HEADER_H}
                x2={todayX + dayW / 2} y2={svgH}
                stroke="#3B82F6"
                strokeWidth={1.5}
                strokeDasharray="4,3"
                opacity={0.6}
              />
            )}

            {/* ── Lignes séparateur header ── */}
            <line x1={0} y1={24} x2={LABEL_W + totalW} y2={24} stroke="rgba(255,255,255,0.06)" />
            <line x1={0} y1={HEADER_H} x2={LABEL_W + totalW} y2={HEADER_H} stroke="rgba(255,255,255,0.08)" />

            {/* ── Rows ── */}
            {rows.map((row, ri) => {
              const y = HEADER_H + ri * ROW_H

              if (row.type === 'project') {
                const { proj, color } = row
                const isExpanded = expandedProjects[proj.id] !== false
                const taskCount = proj.tasks?.length || 0
                const msCount = proj.milestones?.length || 0

                // Barre de projet (du start_date au end_date)
                const x1 = proj.start_date ? dateToX(proj.start_date) : null
                const x2 = proj.end_date ? dateToX(proj.end_date) : null
                const barX = x1 !== null ? Math.max(LABEL_W, x1) : null
                const barW = barX !== null && x2 !== null ? Math.max(4, x2 - barX + dayW) : null

                return (
                  <g key={`proj-${proj.id}`}>
                    {/* Fond alternation */}
                    <rect x={0} y={y} width={LABEL_W + totalW} height={ROW_H} fill={ri % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'} />

                    {/* Label projet */}
                    <foreignObject x={4} y={y} width={LABEL_W - 8} height={ROW_H}>
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        className="flex items-center gap-1.5 h-full px-1 cursor-pointer group"
                        onClick={() => toggleProject(proj.id)}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="text-xs font-semibold text-white/90 truncate"
                          title={proj.name}
                        >
                          {proj.name}
                        </span>
                        <span className="text-[10px] text-white/30 ml-auto shrink-0">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </foreignObject>

                    {/* Barre projet */}
                    {barX !== null && barW !== null && (
                      <rect
                        x={barX} y={y + 8}
                        width={barW} height={ROW_H - 16}
                        rx={3} fill={color}
                        opacity={0.25}
                      />
                    )}

                    {/* Ligne séparateur */}
                    <line x1={0} y1={y + ROW_H} x2={LABEL_W + totalW} y2={y + ROW_H} stroke="rgba(255,255,255,0.05)" />
                  </g>
                )
              }

              if (row.type === 'task') {
                const { task, proj, color } = row
                const taskColor = STATUS_COLORS[task.status] || color
                const x1 = task.start_date ? dateToX(task.start_date) : null
                const x2 = task.due_date ? dateToX(task.due_date) : null
                const barX = x1 !== null ? Math.max(LABEL_W, x1) : null
                const barW = barX !== null && x2 !== null ? Math.max(4, x2 - barX + dayW) : (barX !== null ? dayW * 3 : null)

                return (
                  <g key={`task-${task.id}`}>
                    <rect x={0} y={y} width={LABEL_W + totalW} height={ROW_H} fill="transparent" />

                    {/* Label tâche */}
                    <foreignObject x={12} y={y} width={LABEL_W - 16} height={ROW_H}>
                      <div xmlns="http://www.w3.org/1999/xhtml" className="flex items-center gap-1 h-full px-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: taskColor }}
                        />
                        <span
                          className="text-[11px] text-white/60 truncate"
                          title={task.title}
                        >
                          {task.title}
                        </span>
                      </div>
                    </foreignObject>

                    {/* Barre tâche */}
                    {barX !== null && barW !== null && (
                      <TaskBar x={barX} y={y} w={barW} task={task} color={taskColor} dayW={dayW} />
                    )}

                    <line x1={0} y1={y + ROW_H} x2={LABEL_W + totalW} y2={y + ROW_H} stroke="rgba(255,255,255,0.03)" />
                  </g>
                )
              }

              if (row.type === 'milestone') {
                const { ms, color } = row
                const msX = ms.due_date ? dateToX(ms.due_date) : null
                const centerX = msX !== null ? msX + dayW / 2 : null

                return (
                  <g key={`ms-${ms.id}`}>
                    <rect x={0} y={y} width={LABEL_W + totalW} height={ROW_H} fill="transparent" />

                    {/* Label jalon */}
                    <foreignObject x={12} y={y} width={LABEL_W - 16} height={ROW_H}>
                      <div xmlns="http://www.w3.org/1999/xhtml" className="flex items-center gap-1 h-full px-1">
                        <Diamond className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-[11px] text-amber-300/80 truncate" title={ms.title}>
                          {ms.title}
                        </span>
                      </div>
                    </foreignObject>

                    {/* Losange SVG pour le jalon */}
                    {centerX !== null && centerX >= LABEL_W && (
                      <g transform={`translate(${centerX}, ${y + ROW_H / 2})`}>
                        <polygon
                          points="0,-7 7,0 0,7 -7,0"
                          fill={ms.is_reached ? '#10B981' : '#F59E0B'}
                          opacity={0.9}
                        />
                        {ms.is_reached && (
                          <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontWeight={700}>✓</text>
                        )}
                      </g>
                    )}

                    <line x1={0} y1={y + ROW_H} x2={LABEL_W + totalW} y2={y + ROW_H} stroke="rgba(255,255,255,0.03)" />
                  </g>
                )
              }

              return null
            })}

            {/* Ligne verticale séparation label/timeline */}
            <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH} stroke="rgba(255,255,255,0.08)" />
          </svg>
        </div>
      )}

      {/* Résumé */}
      {!isLoading && projects.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span>{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{projects.reduce((s, p) => s + (p.tasks?.length || 0), 0)} tâches</span>
          <span>•</span>
          <span>{projects.reduce((s, p) => s + (p.milestones?.length || 0), 0)} jalons</span>
        </div>
      )}
    </div>
  )
}
