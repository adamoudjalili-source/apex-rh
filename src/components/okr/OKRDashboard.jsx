// ============================================================
// APEX RH — OKRDashboard.jsx
// Session 78 — Tableau de bord cycle OKR : stats + KR at-risk + tendances
// ============================================================
import { useMemo } from 'react'
import { Target, TrendingUp, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { useOKRCycleStats, useCurrentCycle, useOKRAlignmentTree } from '../../hooks/useOkrCycles'

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-400', bg = 'bg-indigo-900/20' }) {
  return (
    <div className={`rounded-xl border border-gray-800 p-4 ${bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
    </div>
  )
}

// SVG horizontal bar chart for levels
function LevelBars({ byLevel }) {
  if (!byLevel) return null
  const entries = Object.entries(byLevel)
  const LEVEL_LABELS = {
    strategique: 'Stratégique',
    direction: 'Direction',
    division: 'Division',
    service: 'Service',
    individuel: 'Individuel',
  }
  const LEVEL_COLORS = {
    strategique: '#818cf8',
    direction: '#a78bfa',
    division: '#34d399',
    service: '#60a5fa',
    individuel: '#fb923c',
  }

  return (
    <div className="space-y-3">
      {entries.map(([level, data]) => {
        const progress = data.avg_progress || 0
        const color = LEVEL_COLORS[level] || '#6b7280'
        return (
          <div key={level}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">{LEVEL_LABELS[level] || level} <span className="text-gray-500">({data.count})</span></span>
              <span style={{ color }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%`, background: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// SVG donut pour score global
function DonutChart({ value = 0, size = 100 }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(value, 100) / 100) * circ
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{Math.round(value)}%</span>
        <span className="text-xs text-gray-400">global</span>
      </div>
    </div>
  )
}

function AtRiskList({ nodes = [] }) {
  const atRisk = useMemo(() =>
    nodes.filter(n => (n.progress_score || 0) < 30 && n.status === 'actif')
      .sort((a, b) => (a.progress_score || 0) - (b.progress_score || 0))
      .slice(0, 5),
    [nodes]
  )

  if (atRisk.length === 0) return (
    <div className="flex items-center gap-2 text-green-400 text-sm py-3">
      <CheckCircle className="w-4 h-4" />
      <span>Aucun objectif en risque critique</span>
    </div>
  )

  return (
    <div className="space-y-2">
      {atRisk.map(node => (
        <div key={node.id} className="flex items-center gap-3 bg-rose-900/10 border border-rose-500/20 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{node.title}</p>
            {node.owner_name && <p className="text-xs text-gray-500">{node.owner_name}</p>}
          </div>
          <span className="text-rose-400 font-bold text-sm flex-shrink-0">
            {Math.round(node.progress_score || 0)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export default function OKRDashboard({ cycleId }) {
  const { data: cycle } = useCurrentCycle()
  const activeCycleId = cycleId || cycle?.id
  const { data: stats, isLoading: statsLoading } = useOKRCycleStats(activeCycleId)
  const { data: nodes = [] } = useOKRAlignmentTree(activeCycleId)

  const daysInfo = useMemo(() => {
    if (!cycle) return null
    const now = new Date()
    const start = new Date(cycle.start_date)
    const end = new Date(cycle.end_date)
    const total = (end - start) / 86400000
    const elapsed = (now - start) / 86400000
    const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100)
    const remaining = Math.ceil((end - now) / 86400000)
    return { pct, remaining, total: Math.round(total) }
  }, [cycle])

  if (!activeCycleId) return (
    <div className="text-center py-16 text-gray-500">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Aucun cycle OKR actif</p>
    </div>
  )

  if (statsLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const avgProgress = stats?.avg_progress || 0

  return (
    <div className="space-y-6">
      {/* Cycle en cours */}
      {cycle && (
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Cycle actif</span>
              <h3 className="text-xl font-bold text-white mt-0.5">{cycle.name}</h3>
              {cycle.description && <p className="text-sm text-gray-400 mt-1">{cycle.description}</p>}
            </div>
            <DonutChart value={avgProgress} />
          </div>

          {daysInfo && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Progression temporelle</span>
                <span>
                  {daysInfo.remaining > 0 ? `${daysInfo.remaining}j restants` : 'Terminé'}
                  {' · '}{daysInfo.total}j au total
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${daysInfo.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Target}
          label="Objectifs"
          value={stats?.total_objectives ?? '—'}
          sub={`${stats?.completed_count ?? 0} finalisés`}
          color="text-indigo-400"
          bg="bg-indigo-900/20"
        />
        <StatCard
          icon={TrendingUp}
          label="Key Results"
          value={stats?.total_key_results ?? '—'}
          sub="au total"
          color="text-violet-400"
          bg="bg-violet-900/20"
        />
        <StatCard
          icon={AlertTriangle}
          label="KR en risque"
          value={stats?.at_risk_count ?? 0}
          sub="confidence at_risk"
          color={stats?.at_risk_count > 0 ? 'text-rose-400' : 'text-green-400'}
          bg={stats?.at_risk_count > 0 ? 'bg-rose-900/20' : 'bg-green-900/20'}
        />
        <StatCard
          icon={CheckCircle}
          label="Progression moy."
          value={`${Math.round(avgProgress)}%`}
          sub="tous les objectifs"
          color={avgProgress >= 70 ? 'text-green-400' : avgProgress >= 40 ? 'text-amber-400' : 'text-rose-400'}
          bg="bg-gray-800/60"
        />
      </div>

      {/* Graphe par niveau + At Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progression par niveau */}
        {stats?.by_level && (
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Progression par niveau
            </h4>
            <LevelBars byLevel={stats.by_level} />
          </div>
        )}

        {/* Objectifs en risque */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Objectifs critiques
            {stats?.at_risk_count > 0 && (
              <span className="ml-auto text-xs bg-rose-900/40 text-rose-400 px-2 py-0.5 rounded-full">
                {stats.at_risk_count} KR at-risk
              </span>
            )}
          </h4>
          <AtRiskList nodes={nodes} />
        </div>
      </div>
    </div>
  )
}
