// ============================================================
// APEX RH — OKRTreeView.jsx
// Session 50 — Vue arborescente SVG des OKR (cascade parent-enfant)
// SVG pur — pas de recharts
// ============================================================
import { useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, ChevronDown, ChevronRight, GitBranch, AlertCircle } from 'lucide-react'
import { OBJECTIVE_LEVELS, LEVEL_ORDER, getScoreColor, formatScore } from '../../lib/objectiveHelpers'
import EmptyState from '../ui/EmptyState'

// ─── Helpers ─────────────────────────────────────────────────

function buildTree(objectives) {
  const map = new Map()
  const roots = []

  objectives.forEach(o => map.set(o.id, { ...o, children: [] }))

  map.forEach(node => {
    const parentId = node.parent_id || node.parent_objective_id
    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function flattenTree(nodes, depth = 0) {
  const result = []
  nodes.forEach(node => {
    result.push({ ...node, depth })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  })
  return result
}

// ─── Nœud OKR individuel ────────────────────────────────────

function OKRNode({ node, isExpanded, onToggle, onSelect, isSelected, depth }) {
  const info = OBJECTIVE_LEVELS[node.level] || OBJECTIVE_LEVELS.individuel
  const score = node.progress_score ?? 0
  const pct = Math.round(score * 100)
  const scoreColor = getScoreColor(score)
  const hasChildren = node.children?.length > 0
  const indentPx = depth * 28

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: depth * 0.04 }}
      className={`group relative flex items-stretch cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-indigo-500/10 border-l-2 border-indigo-500'
          : 'border-l-2 border-transparent hover:bg-white/[0.03]'
      }`}
      style={{ paddingLeft: indentPx + 16 }}
      onClick={() => onSelect(node)}
    >
      {/* Ligne de connexion verticale */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 pointer-events-none"
          style={{ left: indentPx - 12 }}
        >
          <svg width="16" height="100%" className="overflow-visible">
            <line x1="8" y1="0" x2="8" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <line x1="8" y1="50%" x2="16" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Toggle expand */}
      <div className="flex items-center py-3 pr-2">
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
            className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <div className="w-5 h-5" />
        )}
      </div>

      {/* Icône niveau */}
      <div className="flex items-center py-3 pr-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: `${info.color}18`, border: `1px solid ${info.color}30` }}
        >
          <span>{info.icon}</span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 py-3 pr-4 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/85 truncate leading-tight">
              {node.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ color: info.color, background: `${info.color}18` }}
              >
                {info.label}
              </span>
              {node.owner && (
                <span className="text-[10px] text-white/30">
                  {node.owner.first_name} {node.owner.last_name}
                </span>
              )}
              {hasChildren && (
                <span className="text-[10px] text-white/25">
                  {node.children.length} enfant{node.children.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-end shrink-0 gap-1">
            <span className="text-sm font-bold" style={{ color: scoreColor }}>
              {formatScore(score)}
            </span>
            <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: scoreColor }}
              />
            </div>
          </div>
        </div>

        {/* Alerte désalignement */}
        {node.alignment_gap != null && Math.abs(node.alignment_gap) > 0.15 && (
          <div className="flex items-center gap-1 mt-1.5">
            <AlertCircle size={11} className="text-amber-400" />
            <span className="text-[10px] text-amber-400/70">
              Désalignement détecté ({Math.round(Math.abs(node.alignment_gap) * 100)}%)
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Composant principal ─────────────────────────────────────

export default function OKRTreeView({ objectives = [], onSelectObjective }) {
  const [expanded, setExpanded] = useState(new Set())
  const [selected, setSelected] = useState(null)

  const tree = useMemo(() => buildTree(objectives), [objectives])

  // Auto-expand niveau 1
  useEffect(() => {
    const rootIds = new Set(tree.map(n => n.id))
    setExpanded(rootIds)
  }, [objectives])

  // Collect visible nodes
  const visibleNodes = useMemo(() => {
    function collect(nodes, depth = 0) {
      const result = []
      nodes.forEach(node => {
        result.push({ ...node, depth })
        if (expanded.has(node.id) && node.children?.length) {
          result.push(...collect(node.children, depth + 1))
        }
      })
      return result
    }
    return collect(tree)
  }, [tree, expanded])

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelect = (node) => {
    setSelected(node.id)
    onSelectObjective?.(node)
  }

  if (objectives.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Aucun OKR à afficher"
        description="Créez des objectifs et liez-les entre eux pour visualiser l'arbre de cascade."
      />
    )
  }

  // Stats de la cascade
  const totalRoots = tree.length
  const totalNodes = objectives.length
  const avgScore = objectives.reduce((s, o) => s + (o.progress_score || 0), 0) / totalNodes
  const alignedCount = objectives.filter(o => !o.parent_id && o.children?.length === 0).length

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'OKR racines', value: totalRoots, color: '#C9A227' },
          { label: 'Total nœuds', value: totalNodes, color: '#4F46E5' },
          { label: 'Score moyen', value: formatScore(avgScore), color: getScoreColor(avgScore) },
        ].map(stat => (
          <div key={stat.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <p className="text-[11px] text-white/30 mb-1">{stat.label}</p>
            <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Légende niveaux */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {LEVEL_ORDER.map(lvl => {
          const info = OBJECTIVE_LEVELS[lvl]
          const count = objectives.filter(o => o.level === lvl).length
          if (!count) return null
          return (
            <div key={lvl} className="flex items-center gap-1.5">
              <span className="text-sm">{info.icon}</span>
              <span className="text-[11px] text-white/40">{info.label}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: `${info.color}18`, color: info.color }}
              >
                {count}
              </span>
            </div>
          )
        })}

        {/* Boutons expand/collapse all */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setExpanded(new Set(objectives.map(o => o.id)))}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            Tout déplier
          </button>
          <button
            onClick={() => setExpanded(new Set())}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* Arbre */}
      <div className="rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/[0.04]"
        style={{ background: 'rgba(255,255,255,0.015)' }}>
        <AnimatePresence initial={false}>
          {visibleNodes.map(node => (
            <OKRNode
              key={node.id}
              node={node}
              depth={node.depth}
              isExpanded={expanded.has(node.id)}
              onToggle={toggleExpand}
              onSelect={handleSelect}
              isSelected={selected === node.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
