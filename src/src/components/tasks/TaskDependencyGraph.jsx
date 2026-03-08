// ============================================================
// APEX RH — TaskDependencyGraph.jsx
// Graphe SVG des dépendances inter-tâches
// Session 77 — Dépendances + récurrence + charge
// ============================================================
import { useState, useMemo } from 'react'
import { useTaskDependencies, useCreateDependency, useDeleteDependency, useTasks } from '../../hooks/useTasks'
import { getStatusInfo, getPriorityInfo } from '../../lib/taskHelpers'

const STATUS_COLORS = {
  a_faire: '#6B7280',
  en_cours: '#3B82F6',
  en_revue: '#A78BFA',
  terminee: '#10B981',
  bloquee: '#EF4444',
  annulee: '#374151',
}

function Arrow({ x1, y1, x2, y2, color = '#4B5563', dashed = false }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return null
  const ux = dx / len
  const uy = dy / len
  const ex = x2 - ux * 14
  const ey = y2 - uy * 14
  const perp1x = -uy * 5
  const perp1y = ux * 5
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={ex} y2={ey}
        stroke={color} strokeWidth={1.5}
        strokeDasharray={dashed ? '5,3' : undefined}
        strokeOpacity={0.7}
      />
      <polygon
        points={`${x2},${y2} ${ex + perp1x},${ey + perp1y} ${ex - perp1x},${ey - perp1y}`}
        fill={color} fillOpacity={0.8}
      />
    </g>
  )
}

function TaskNode({ task, x, y, isMain = false, onRemove }) {
  const color = STATUS_COLORS[task.status] || '#6B7280'
  const w = 160, h = 52
  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`}>
      <rect
        width={w} height={h} rx={10}
        fill={isMain ? '#312E81' : '#1E1B4B'}
        stroke={isMain ? '#6366F1' : color}
        strokeWidth={isMain ? 2 : 1}
        opacity={0.95}
      />
      <circle cx={14} cy={h / 2} r={5} fill={color} />
      <foreignObject x={22} y={6} width={w - 32} height={h - 12}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ color: '#E5E7EB', fontSize: 11, fontWeight: isMain ? 700 : 500,
            lineHeight: '1.3', wordBreak: 'break-word', maxHeight: 40, overflow: 'hidden' }}>
          {task.title}
        </div>
      </foreignObject>
      {onRemove && (
        <g onClick={onRemove} style={{ cursor: 'pointer' }} transform={`translate(${w - 14}, 6)`}>
          <circle r={7} fill="#EF4444" fillOpacity={0.2} />
          <text x={0} y={4} textAnchor="middle" fontSize={10} fill="#EF4444">×</text>
        </g>
      )}
    </g>
  )
}

export default function TaskDependencyGraph({ taskId, task }) {
  const { data: deps, isLoading } = useTaskDependencies(taskId)
  const { data: allTasks = [] } = useTasks({})
  const createDep = useCreateDependency()
  const deleteDep = useDeleteDependency()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [depType, setDepType] = useState('blocks')

  const positions = useMemo(() => {
    if (!deps) return {}
    const pts = {}
    const cx = 280, cy = 160

    // Tâche principale au centre
    pts[taskId] = { x: cx, y: cy }

    // Tâches dont dépend la tâche principale (à gauche)
    const upstream = deps.dependsOn || []
    upstream.forEach((d, i) => {
      const total = upstream.length
      const yOffset = (i - (total - 1) / 2) * 70
      pts[d.depends_on_id] = { x: cx - 220, y: cy + yOffset }
    })

    // Tâches bloquées par la tâche principale (à droite)
    const downstream = deps.blockedBy || []
    downstream.forEach((d, i) => {
      const total = downstream.length
      const yOffset = (i - (total - 1) / 2) * 70
      pts[d.task_id] = { x: cx + 220, y: cy + yOffset }
    })

    return pts
  }, [deps, taskId])

  const svgHeight = useMemo(() => {
    if (!deps) return 200
    const total = Math.max(
      (deps.dependsOn?.length || 0),
      (deps.blockedBy?.length || 0),
      1
    )
    return Math.max(200, total * 70 + 80)
  }, [deps])

  const availableTasks = allTasks.filter(t =>
    t.id !== taskId &&
    !deps?.dependsOn?.some(d => d.depends_on_id === t.id) &&
    !deps?.blockedBy?.some(d => d.task_id === t.id)
  )

  const handleAdd = async () => {
    if (!selectedTaskId) return
    await createDep.mutateAsync({
      taskId,
      dependsOnId: depType === 'blocks' ? selectedTaskId : selectedTaskId,
      dependencyType: depType,
    })
    setShowAdd(false)
    setSelectedTaskId('')
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Chargement…</div>
  }

  const hasNothing = !deps?.dependsOn?.length && !deps?.blockedBy?.length

  return (
    <div className="space-y-4">
      {/* Légende + action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-8 border-t border-dashed border-gray-400"></div>
            <span>Dépend de</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 border-t border-solid border-violet-400"></div>
            <span>Bloque</span>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg transition-all"
        >
          + Ajouter dépendance
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl flex-wrap">
          <select
            value={depType}
            onChange={e => setDepType(e.target.value)}
            className="bg-[#1a1635] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5"
          >
            <option value="blocks">Bloque une tâche</option>
            <option value="related">Liée à</option>
          </select>
          <select
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            className="flex-1 bg-[#1a1635] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 min-w-0"
          >
            <option value="">— Choisir une tâche</option>
            {availableTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedTaskId || createDep.isPending}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded-lg transition-all"
          >
            {createDep.isPending ? '…' : 'Ajouter'}
          </button>
          <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-gray-300 text-xs">
            Annuler
          </button>
        </div>
      )}

      {/* Graphe SVG */}
      {hasNothing ? (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm gap-2">
          <span className="text-2xl">🔗</span>
          <span>Aucune dépendance — cette tâche est indépendante</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0f0c1d]">
          <svg
            width="560"
            height={svgHeight}
            className="block"
            style={{ minWidth: '100%' }}
          >
            {/* Labels colonnes */}
            <text x={70} y={20} fontSize={10} fill="#6B7280" textAnchor="middle">Dépend de</text>
            <text x={280} y={20} fontSize={10} fill="#A78BFA" textAnchor="middle">Cette tâche</text>
            <text x={490} y={20} fontSize={10} fill="#6B7280" textAnchor="middle">Bloquées</text>

            {/* Flèches dépends-on */}
            {deps?.dependsOn?.map(d => {
              const from = positions[d.depends_on_id]
              const to = positions[taskId]
              if (!from || !to) return null
              return (
                <Arrow
                  key={d.id}
                  x1={from.x + 80} y1={from.y}
                  x2={to.x - 80} y2={to.y}
                  color={d.dependency_type === 'related' ? '#6B7280' : '#F59E0B'}
                  dashed={d.dependency_type === 'related'}
                />
              )
            })}

            {/* Flèches bloquées-par */}
            {deps?.blockedBy?.map(d => {
              const from = positions[taskId]
              const to = positions[d.task_id]
              if (!from || !to) return null
              return (
                <Arrow
                  key={d.id}
                  x1={from.x + 80} y1={from.y}
                  x2={to.x - 80} y2={to.y}
                  color="#8B5CF6"
                  dashed={d.dependency_type === 'related'}
                />
              )
            })}

            {/* Nœuds dépends-on */}
            {deps?.dependsOn?.map(d => {
              const pos = positions[d.depends_on_id]
              if (!pos) return null
              return (
                <TaskNode
                  key={d.id}
                  task={d.task}
                  x={pos.x} y={pos.y}
                  onRemove={() => deleteDep.mutate({ depId: d.id, taskId, dependsOnId: d.depends_on_id })}
                />
              )
            })}

            {/* Nœud principal */}
            {positions[taskId] && (
              <TaskNode
                task={task}
                x={positions[taskId].x}
                y={positions[taskId].y}
                isMain
              />
            )}

            {/* Nœuds bloqués */}
            {deps?.blockedBy?.map(d => {
              const pos = positions[d.task_id]
              if (!pos) return null
              return (
                <TaskNode
                  key={d.id}
                  task={d.task}
                  x={pos.x} y={pos.y}
                  onRemove={() => deleteDep.mutate({ depId: d.id, taskId: d.task_id, dependsOnId: taskId })}
                />
              )
            })}
          </svg>
        </div>
      )}

      {/* Résumé texte */}
      {!hasNothing && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="text-amber-400 font-semibold mb-1">
              Attend ({deps?.dependsOn?.length || 0})
            </div>
            {deps?.dependsOn?.map(d => (
              <div key={d.id} className="text-gray-300 truncate">{d.task?.title}</div>
            ))}
          </div>
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
            <div className="text-violet-400 font-semibold mb-1">
              Débloque ({deps?.blockedBy?.length || 0})
            </div>
            {deps?.blockedBy?.map(d => (
              <div key={d.id} className="text-gray-300 truncate">{d.task?.title}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
