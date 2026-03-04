// ============================================================
// APEX RH — TasksOverview.jsx
// ✅ Session 12 — Section tâches du dashboard
// ✅ Session 18 — Fix animation (div au lieu de motion.div avec variants)
// ✅ Session 21 — Bug fix : stats.thisWeek → stats.createdThisWeek
// ============================================================
import { motion } from 'framer-motion'
import { CheckSquare, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG = {
  backlog:   { label: 'Backlog',   color: '#6B7280' },
  a_faire:   { label: 'À faire',   color: '#3B82F6' },
  en_cours:  { label: 'En cours',  color: '#F59E0B' },
  en_revue:  { label: 'En revue',  color: '#8B5CF6' },
  terminee:  { label: 'Terminée',  color: '#10B981' },
}

export default function TasksOverview({ stats, isLoading }) {
  const navigate = useNavigate()

  if (isLoading) return <TasksSkeleton />
  if (!stats) return null

  const maxCount = Math.max(...Object.values(stats.byStatus || {}), 1)

  return (
    <div
      className="rounded-xl p-5 cursor-pointer group hover:-translate-y-0.5 transition-transform duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => navigate('/tasks')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#3B82F615', border: '1px solid #3B82F620' }}
          >
            <CheckSquare size={14} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Tâches</h3>
            <p className="text-[10px] text-white/30">{stats.total} total</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats.overdue > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle size={9} /> {stats.overdue} en retard
            </span>
          )}
          {stats.dueToday > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <Clock size={9} /> {stats.dueToday} aujourd'hui
            </span>
          )}
        </div>
      </div>

      {/* Barre de complétion */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-white/30">Taux de complétion</span>
          <span className="text-xs font-bold text-emerald-400">{stats.completionRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #10B981, #34D399)' }}
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionRate}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>

      {/* Mini graphique par statut */}
      <div className="space-y-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = stats.byStatus?.[key] || 0
          const pct = (count / maxCount) * 100
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 w-16">{config.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <span className="text-[10px] text-white/50 font-semibold w-5 text-right">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Tendance — BUG FIX Session 21 : stats.createdThisWeek (et non stats.thisWeek) */}
      {stats.createdThisWeek > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
          <TrendingUp size={10} className="text-emerald-400" />
          <span className="text-[10px] text-white/30">
            +{stats.createdThisWeek} cette semaine
          </span>
        </div>
      )}
    </div>
  )
}

function TasksSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="h-4 w-16 rounded bg-white/5" />
      </div>
      <div className="h-2 rounded-full bg-white/5 mb-4" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-12 rounded bg-white/5" />
            <div className="h-2 flex-1 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
