// ============================================================
// APEX RH — GanttMini.jsx
// Timeline Gantt 4 semaines — SVG natif
// Session 77 — Dépendances + récurrence + charge
// ============================================================
import { useState, useMemo } from 'react'
import { useGanttData } from '../../hooks/useTasks'

const STATUS_COLOR = {
  a_faire:  '#6B7280',
  en_cours: '#3B82F6',
  en_revue: '#A78BFA',
  terminee: '#10B981',
  bloquee:  '#EF4444',
  annulee:  '#374151',
}

const STATUS_LABEL = {
  a_faire:  'À faire',
  en_cours: 'En cours',
  en_revue: 'En revue',
  terminee: 'Terminée',
  bloquee:  'Bloquée',
  annulee:  'Annulée',
}

const PRIORITY_DOT = {
  critique: '#EF4444',
  urgente:  '#F59E0B',
  normale:  '#6B7280',
  basse:    '#374151',
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const ROW_H = 36
const LEFT = 160
const DAY_W = 22
const HEADER_H = 44
const TOTAL_DAYS = 28

export default function GanttMini() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [filter, setFilter] = useState('all')
  const [hovered, setHovered] = useState(null)

  const startDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    d.setHours(0, 0, 0, 0)
    return d
  }, [weekOffset])

  const endDate = useMemo(() => addDays(startDate, TOTAL_DAYS), [startDate])

  const { data: rawTasks = [], isLoading } = useGanttData(
    startDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(0, 10)
  )

  const tasks = useMemo(() => {
    if (filter === 'all') return rawTasks
    return rawTasks.filter(t => t.status === filter)
  }, [rawTasks, filter])

  // Génère les jours de la timeline
  const days = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i))
  }, [startDate])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = diffDays(startDate, today)

  const svgW = LEFT + TOTAL_DAYS * DAY_W + 2
  const svgH = HEADER_H + Math.max(tasks.length, 1) * ROW_H + 20

  // Semaines regroupées pour l'en-tête
  const weeks = useMemo(() => {
    const ws = []
    for (let i = 0; i < TOTAL_DAYS; i += 7) {
      ws.push({ start: i, label: `Sem. ${formatDate(addDays(startDate, i))}` })
    }
    return ws
  }, [startDate])

  const barForTask = (task) => {
    const taskStart = new Date(task.start_date || startDate)
    const taskEnd = task.due_date ? new Date(task.due_date) : addDays(taskStart, 3)
    const startOff = Math.max(0, diffDays(startDate, taskStart))
    const endOff = Math.min(TOTAL_DAYS, diffDays(startDate, taskEnd) + 1)
    const width = Math.max(endOff - startOff, 1) * DAY_W - 2
    const x = LEFT + startOff * DAY_W + 1
    return { x, width, startOff, endOff }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 4)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">◀◀</button>
          <button onClick={() => setWeekOffset(w => w - 1)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">◀</button>
          <span className="text-sm text-gray-300 font-medium min-w-40 text-center">
            {formatDate(startDate)} — {formatDate(endDate)}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">▶</button>
          <button onClick={() => setWeekOffset(0)} className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 border border-indigo-500/20 rounded-lg transition-all ml-1">
            Auj.
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {['all', 'en_cours', 'a_faire', 'en_revue', 'bloquee'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                filter === s
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Tout' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0f0c1d]">
        <svg width={svgW} height={svgH} className="block" style={{ minWidth: svgW }}>
          {/* En-tête semaines */}
          {weeks.map(w => (
            <g key={w.start}>
              <rect
                x={LEFT + w.start * DAY_W} y={0}
                width={7 * DAY_W} height={22}
                fill="white" fillOpacity={0.02}
                stroke="white" strokeOpacity={0.04} strokeWidth={1}
              />
              <text
                x={LEFT + w.start * DAY_W + 7 * DAY_W / 2} y={14}
                textAnchor="middle" fontSize={9} fill="#6B7280"
              >
                {w.label}
              </text>
            </g>
          ))}

          {/* En-tête jours */}
          {days.map((d, i) => {
            const isToday = diffDays(startDate, d) === todayOffset
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            return (
              <g key={i}>
                <rect
                  x={LEFT + i * DAY_W} y={22}
                  width={DAY_W} height={HEADER_H - 22}
                  fill={isToday ? '#6366F1' : isWeekend ? 'white' : 'transparent'}
                  fillOpacity={isToday ? 0.2 : isWeekend ? 0.03 : 0}
                />
                <text
                  x={LEFT + i * DAY_W + DAY_W / 2} y={37}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isToday ? '#A5B4FC' : isWeekend ? '#4B5563' : '#6B7280'}
                  fontWeight={isToday ? 700 : 400}
                >
                  {d.getDate()}
                </text>
              </g>
            )
          })}

          {/* Colonnes verticales fond */}
          {days.map((d, i) => {
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            if (!isWeekend) return null
            return (
              <rect
                key={i}
                x={LEFT + i * DAY_W} y={HEADER_H}
                width={DAY_W} height={svgH - HEADER_H}
                fill="white" fillOpacity={0.015}
              />
            )
          })}

          {/* Ligne Aujourd'hui */}
          {todayOffset >= 0 && todayOffset < TOTAL_DAYS && (
            <line
              x1={LEFT + todayOffset * DAY_W + DAY_W / 2} y1={HEADER_H}
              x2={LEFT + todayOffset * DAY_W + DAY_W / 2} y2={svgH - 4}
              stroke="#6366F1" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.7}
            />
          )}

          {/* Lignes de fond des tâches */}
          {tasks.map((_, i) => (
            <rect
              key={i}
              x={0} y={HEADER_H + i * ROW_H}
              width={svgW} height={ROW_H}
              fill={i % 2 === 0 ? 'transparent' : 'white'}
              fillOpacity={0.015}
            />
          ))}

          {/* Tâches */}
          {tasks.length === 0 ? (
            <text x={svgW / 2} y={HEADER_H + 40} textAnchor="middle" fontSize={12} fill="#6B7280">
              Aucune tâche dans cette période
            </text>
          ) : tasks.map((task, i) => {
            const y = HEADER_H + i * ROW_H
            const { x, width } = barForTask(task)
            const color = STATUS_COLOR[task.status] || '#6B7280'
            const isHovered = hovered === task.id

            return (
              <g key={task.id} onMouseEnter={() => setHovered(task.id)} onMouseLeave={() => setHovered(null)}>
                {/* Nom tâche */}
                <text
                  x={LEFT - 8} y={y + 22}
                  textAnchor="end" fontSize={11}
                  fill={isHovered ? '#E5E7EB' : '#9CA3AF'}
                >
                  {task.title?.length > 18 ? task.title.slice(0, 17) + '…' : task.title}
                </text>

                {/* Point priorité */}
                <circle
                  cx={LEFT - 75} cy={y + 18}
                  r={3.5}
                  fill={PRIORITY_DOT[task.priority] || '#6B7280'}
                  opacity={0.8}
                />

                {/* Barre */}
                <rect
                  x={x} y={y + 8}
                  width={width} height={ROW_H - 18}
                  rx={5}
                  fill={color}
                  fillOpacity={isHovered ? 0.9 : 0.6}
                  stroke={color}
                  strokeOpacity={0.8}
                  strokeWidth={1}
                />

                {/* Label dans barre si assez large */}
                {width > 50 && (
                  <text
                    x={x + width / 2} y={y + 19}
                    textAnchor="middle" fontSize={9}
                    fill="white" fillOpacity={0.9}
                  >
                    {task.title?.length > Math.floor(width / 7)
                      ? task.title.slice(0, Math.floor(width / 7) - 1) + '…'
                      : task.title}
                  </text>
                )}

                {/* Tooltip hover */}
                {isHovered && (
                  <g transform={`translate(${Math.min(x + width / 2 - 60, svgW - 130)}, ${y - 52})`}>
                    <rect width={120} height={44} rx={8} fill="#1E1B4B" stroke={color} strokeWidth={1} opacity={0.97} />
                    <text x={8} y={14} fontSize={10} fill="#E5E7EB" fontWeight={600}>
                      {task.title?.slice(0, 16)}
                    </text>
                    <text x={8} y={26} fontSize={9} fill={color}>{STATUS_LABEL[task.status]}</text>
                    <text x={8} y={38} fontSize={9} fill="#6B7280">
                      {task.due_date ? `Échéance : ${formatDate(task.due_date)}` : 'Pas d\'échéance'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Séparation colonne noms */}
          <line
            x1={LEFT} y1={0}
            x2={LEFT} y2={svgH}
            stroke="white" strokeOpacity={0.07} strokeWidth={1}
          />
        </svg>
      </div>

      {/* Légende statuts */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLOR[k], opacity: 0.7 }} />
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}
