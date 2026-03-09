// ============================================================
// APEX RH — OKRCascadeView.jsx
// Session 78 — Vue cascade stratégique → individuel (SVG + divs)
// ============================================================
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Target, TrendingUp, Circle } from 'lucide-react'
import { useOKRAlignmentTree } from '../../hooks/useOkrCycles'

const LEVEL_CONFIG = {
  strategique: { label: 'Stratégique', color: '#818cf8', bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', dot: '#6366f1' },
  direction:   { label: 'Direction',   color: '#a78bfa', bg: 'bg-violet-900/30', border: 'border-violet-500/40', dot: '#8b5cf6' },
  division:    { label: 'Division',    color: '#34d399', bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', dot: '#10b981' },
  service:     { label: 'Service',     color: '#60a5fa', bg: 'bg-blue-900/30',   border: 'border-blue-500/40',   dot: '#3b82f6' },
  individuel:  { label: 'Individuel',  color: '#fb923c', bg: 'bg-orange-900/30', border: 'border-orange-500/40', dot: '#f97316' },
}

const STATUS_COLORS = {
  actif:    '#22c55e',
  en_cours: '#f59e0b',
  valide:   '#6366f1',
  archive:  '#6b7280',
}

function ProgressRing({ value = 0, size = 32, stroke = 3 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(value, 100) / 100) * circ
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#374151" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

function OKRNode({ node, depth, expandedIds, onToggle, children }) {
  const lc = LEVEL_CONFIG[node.level] || LEVEL_CONFIG.individuel
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.child_count > 0
  const progress = node.progress_score || 0

  return (
    <div className="relative">
      {/* Connecteur vertical */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 border-l border-dashed border-gray-700"
          style={{ left: `${(depth - 1) * 28 + 10}px` }}
        />
      )}

      <div
        className="relative"
        style={{ marginLeft: `${depth * 28}px` }}
      >
        {/* Connecteur horizontal */}
        {depth > 0 && (
          <div
            className="absolute top-5 -left-[18px] w-4 border-t border-dashed border-gray-700"
          />
        )}

        <motion.div
          layout
          className={`group flex items-start gap-3 p-3 rounded-xl border mb-2 cursor-pointer transition-all hover:shadow-lg ${lc.bg} ${lc.border}`}
          onClick={() => hasChildren && onToggle(node.id)}
        >
          {/* Toggle */}
          <div className="flex-shrink-0 mt-0.5">
            {hasChildren ? (
              <button className="text-gray-400 hover:text-white transition-colors">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <Circle className="w-4 h-4 text-gray-600" />
            )}
          </div>

          {/* Progress ring */}
          <div className="flex-shrink-0 relative">
            <ProgressRing value={progress} />
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
              {Math.round(progress)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ color: lc.color, background: `${lc.dot}20` }}>
                {lc.label}
              </span>
              {node.status && (
                <span className="text-xs text-gray-500 capitalize">{node.status}</span>
              )}
            </div>
            <p className="text-sm font-medium text-white mt-0.5 leading-snug">{node.title}</p>
            {node.owner_name && (
              <p className="text-xs text-gray-500 mt-0.5">{node.owner_name}</p>
            )}
          </div>

          {/* Badge enfants */}
          {hasChildren && (
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded-full">
              {node.child_count}
            </span>
          )}
        </motion.div>
      </div>

      {/* Enfants */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function buildTree(nodes) {
  const map = new Map(nodes.map(n => [n.id, { ...n, children: [] }]))
  const roots = []
  for (const node of map.values()) {
    if (node.parent_objective_id && map.has(node.parent_objective_id)) {
      map.get(node.parent_objective_id).children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function renderTree(nodes, depth, expandedIds, onToggle) {
  return nodes.map(node => (
    <OKRNode
      key={node.id}
      node={node}
      depth={depth}
      expandedIds={expandedIds}
      onToggle={onToggle}
    >
      {node.children?.length > 0 && renderTree(node.children, depth + 1, expandedIds, onToggle)}
    </OKRNode>
  ))
}

export default function OKRCascadeView({ cycleId }) {
  const { data: nodes = [], isLoading } = useOKRAlignmentTree(cycleId)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [filterLevel, setFilterLevel] = useState('')

  const tree = useMemo(() => {
    const filtered = filterLevel ? nodes.filter(n => n.level === filterLevel || !filterLevel) : nodes
    return buildTree(filtered)
  }, [nodes, filterLevel])

  function toggleNode(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll() {
    setExpandedIds(new Set(nodes.map(n => n.id)))
  }
  function collapseAll() {
    setExpandedIds(new Set())
  }

  // Stats par niveau
  const levelStats = useMemo(() => {
    const stats = {}
    for (const node of nodes) {
      if (!stats[node.level]) stats[node.level] = { count: 0, avgProgress: 0, total: 0 }
      stats[node.level].count++
      stats[node.level].total += (node.progress_score || 0)
    }
    for (const k of Object.keys(stats)) {
      stats[k].avgProgress = Math.round(stats[k].total / stats[k].count)
    }
    return stats
  }, [nodes])

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!cycleId) return (
    <div className="text-center py-16 text-gray-500">
      <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Sélectionnez un cycle OKR pour visualiser la cascade</p>
    </div>
  )

  if (nodes.length === 0) return (
    <div className="text-center py-16 text-gray-500">
      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Aucun objectif aligné dans ce cycle</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats niveaux */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(LEVEL_CONFIG).map(([level, lc]) => {
          const stat = levelStats[level]
          if (!stat) return null
          return (
            <button
              key={level}
              onClick={() => setFilterLevel(filterLevel === level ? '' : level)}
              className={`p-2 rounded-xl border text-center transition-all ${
                filterLevel === level ? `${lc.bg} ${lc.border}` : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
              }`}
            >
              <div className="text-lg font-bold text-white">{stat.count}</div>
              <div className="text-xs" style={{ color: lc.color }}>{lc.label}</div>
              <div className="text-xs text-gray-500">{stat.avgProgress}%</div>
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{nodes.length} objectifs · {tree.length} racines</p>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Tout déplier
          </button>
          <span className="text-gray-700">·</span>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* Arbre */}
      <div className="space-y-0">
        {renderTree(tree, 0, expandedIds, toggleNode)}
      </div>
    </div>
  )
}
