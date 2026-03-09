// ============================================================
// APEX RH — src/components/offboarding/OffboardingStats.jsx
// Session 68 — Stats : taux completion, motifs, eNPS sortie
// ============================================================
import { motion } from 'framer-motion'
import { TrendingUp, Users, CheckSquare, Star, Heart, BarChart2 } from 'lucide-react'
import { useOffboardingStats, EXIT_REASON_LABELS } from '../../hooks/useOffboarding'
import StatCard from '../ui/StatCard'


function DonutChart({ data, total }) {
  if (total === 0) return null
  let offset = 0
  const r = 40, circ = 2 * Math.PI * r
  const colors = ['#6366F1', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6']

  return (
    <div className="flex items-center gap-6">
      <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90 flex-shrink-0">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={12}/>
        {data.map(({ pct }, i) => {
          const dashArr  = (pct / 100) * circ
          const el = (
            <circle key={i} cx={50} cy={50} r={r} fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={12}
              strokeDasharray={`${dashArr} ${circ - dashArr}`}
              strokeDashoffset={circ - offset}
              strokeLinecap="butt"/>
          )
          offset += dashArr
          return el
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map(({ label, count, pct }, i) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }}/>
            <span className="text-white/50 truncate">{label}</span>
            <span className="text-white/70 font-medium ml-auto pl-2">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OffboardingStats() {
  const { data: stats, isLoading } = useOffboardingStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
        ))}
      </div>
    )
  }

  const reasonData = Object.entries(stats?.reasonCounts || {})
    .map(([key, count]) => ({
      label: EXIT_REASON_LABELS[key] || key,
      count,
      pct: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const enpsColor = stats?.exitEnps === null ? '#6B7280'
    : stats.exitEnps >= 50 ? '#10B981'
    : stats.exitEnps >= 0  ? '#F59E0B'
    : '#EF4444'

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Processus total"     value={stats?.total}            color="#6366F1"/>
        <StatCard icon={TrendingUp} label="En cours"            value={stats?.inProgress}       color="#F59E0B" sub="offboardings actifs"/>
        <StatCard icon={CheckSquare} label="Taux complétion"    value={stats?.completionRate != null ? `${stats.completionRate}%` : '—'} color="#10B981" sub="tâches checklist"/>
        <StatCard icon={Star}       label="Score satisfaction"  value={stats?.avgScore ? `${stats.avgScore}/10` : '—'} color="#F59E0B" sub={`${stats?.interviewCount || 0} entretien(s)`}/>
      </div>

      {/* eNPS sortie */}
      {stats?.exitEnps !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: `${enpsColor}08`, border: `1px solid ${enpsColor}20` }}>
          <Heart size={20} style={{ color: enpsColor }}/>
          <div>
            <p className="text-xs text-white/40">eNPS sortie (recommandation)</p>
            <p className="text-2xl font-bold" style={{ color: enpsColor }}>
              {stats.exitEnps > 0 ? '+' : ''}{stats.exitEnps}
            </p>
          </div>
          <div className="ml-auto text-xs text-white/30">
            <p>{stats.exitEnps >= 50 ? '✓ Excellent' : stats.exitEnps >= 0 ? '~ Neutre' : '⚠ Attention'}</p>
          </div>
        </motion.div>
      )}

      {/* Motifs de départ */}
      {reasonData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-indigo-400"/>
            <span className="text-sm font-medium text-white/70">Motifs de départ</span>
          </div>
          <DonutChart data={reasonData} total={stats?.total || 0}/>
        </motion.div>
      )}
    </div>
  )
}
