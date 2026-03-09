// ============================================================
// APEX RH — ObjectiveCascade.jsx
// Session 10 — Vue en cascade (arbre) des objectifs
// ============================================================
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { getLevelInfo, getScoreColor, formatScore, LEVEL_ORDER } from '../../lib/objectiveHelpers'

export default function ObjectiveCascade({ objectives = [], onSelect }) {
  // Construire l'arbre
  const tree = useMemo(() => {
    const map = new Map()
    objectives.forEach((o) => map.set(o.id, { ...o, children: [] }))

    const roots = []
    objectives.forEach((o) => {
      if (o.parent_objective_id && map.has(o.parent_objective_id)) {
        map.get(o.parent_objective_id).children.push(map.get(o.id))
      } else {
        roots.push(map.get(o.id))
      }
    })

    // Trier : par level puis par titre
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        const la = LEVEL_ORDER.indexOf(a.level)
        const lb = LEVEL_ORDER.indexOf(b.level)
        if (la !== lb) return la - lb
        return a.title.localeCompare(b.title, 'fr')
      })
      nodes.forEach((n) => sortNodes(n.children))
    }
    sortNodes(roots)
    return roots
  }, [objectives])

  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-white/20 text-sm">
        Aucun objectif pour cette période
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tree.map((node) => (
        <CascadeNode key={node.id} node={node} depth={0} onSelect={onSelect} />
      ))}
    </div>
  )
}

function CascadeNode({ node, depth, onSelect }) {
  const level = getLevelInfo(node.level)
  const scoreColor = getScoreColor(node.progress_score)
  const pct = Math.round((node.progress_score || 0) * 100)
  const krsCount = node.key_results?.length || 0

  const ownerName = node.owner
    ? `${node.owner.first_name} ${node.owner.last_name}`
    : '—'

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.05 }}
        onClick={() => onSelect?.(node)}
        className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-all duration-200 border border-transparent hover:border-white/5"
      >
        {/* Indicateur vertical */}
        {depth > 0 && (
          <div className="flex items-center gap-1 text-white/10">
            <span className="text-xs">└</span>
          </div>
        )}

        {/* Dot niveau */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 ring-2"
          style={{
            background: level.color,
            ringColor: `${level.color}33`,
            boxShadow: `0 0 8px ${level.color}44`,
          }}
        />

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${level.text}`}>
              {level.label}
            </span>
            <span className="text-white/10">·</span>
            <span className="text-[10px] text-white/20">{ownerName}</span>
          </div>
          <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
            {node.title}
          </p>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: scoreColor }}
            />
          </div>
          <span className="text-xs font-bold min-w-[32px] text-right" style={{ color: scoreColor }}>
            {formatScore(node.progress_score)}
          </span>
          <span className="text-[10px] text-white/15 min-w-[24px]">
            {krsCount} KR
          </span>
        </div>
      </motion.div>

      {/* Enfants */}
      {node.children?.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <CascadeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
