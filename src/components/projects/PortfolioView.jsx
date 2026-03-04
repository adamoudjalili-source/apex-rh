// ============================================================
// APEX RH — PortfolioView.jsx
// Session 11 — Vue portefeuille projets (groupé par statut)
// ============================================================
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Users, Calendar, FolderKanban } from 'lucide-react'
import {
  PROJECT_STATUS, getProjectStatusInfo, getProjectPriorityInfo,
  formatBudget, getProgressColor, getUserFullName, formatDateFr,
} from '../../lib/projectHelpers'

const STATUS_ORDER = ['en_cours', 'planifie', 'en_pause', 'termine', 'annule']

export default function PortfolioView({ projects, onSelect }) {
  // Grouper par statut
  const grouped = useMemo(() => {
    const groups = {}
    STATUS_ORDER.forEach((s) => { groups[s] = [] })
    projects.forEach((p) => {
      if (groups[p.status]) groups[p.status].push(p)
      else groups[p.status] = [p]
    })
    return groups
  }, [projects])

  // Stats globales
  const stats = useMemo(() => {
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const totalCost = projects.reduce((s, p) => s + (p.budget_spent || 0), 0)
    const avgProgress = projects.length
      ? projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length
      : 0
    const totalMembers = new Set(projects.flatMap((p) => p.project_members?.map((m) => m.user_id) || [])).size
    return { totalBudget, totalCost, avgProgress, totalMembers }
  }, [projects])

  return (
    <div className="space-y-6">
      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PortfolioStat
          icon={FolderKanban} label="Projets" value={projects.length} color="#4F46E5"
        />
        <PortfolioStat
          icon={TrendingUp} label="Progression moy."
          value={`${Math.round(stats.avgProgress)}%`}
          color={getProgressColor(stats.avgProgress)}
        />
        <PortfolioStat
          icon={DollarSign} label="Budget total"
          value={formatBudget(stats.totalBudget)}
          color="#C9A227"
        />
        <PortfolioStat
          icon={Users} label="Personnes impliquées"
          value={stats.totalMembers} color="#10B981"
        />
      </div>

      {/* Colonnes par statut */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATUS_ORDER.map((status) => {
          const items = grouped[status] || []
          const info = getProjectStatusInfo(status)

          return (
            <div key={status} className="space-y-2">
              {/* Header colonne */}
              <div className="flex items-center gap-2 px-2 py-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: info.color }}
                />
                <span className="text-xs font-semibold text-white/60">{info.label}</span>
                <span className="text-[10px] text-white/20 ml-auto">{items.length}</span>
              </div>

              {/* Cartes */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-[10px] text-white/10">
                    Aucun projet
                  </div>
                ) : (
                  items.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => onSelect(p)}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <p className="text-[11px] font-semibold text-white/80 flex-1 line-clamp-2">
                          {p.name}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium flex-shrink-0 ${getProjectPriorityInfo(p.priority).bg} ${getProjectPriorityInfo(p.priority).text}`}>
                          {getProjectPriorityInfo(p.priority).label}
                        </span>
                      </div>

                      {/* Barre progression */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${p.progress || 0}%`,
                              background: getProgressColor(p.progress || 0),
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-mono" style={{ color: getProgressColor(p.progress || 0) }}>
                          {Math.round(p.progress || 0)}%
                        </span>
                      </div>

                      {/* Méta */}
                      <div className="flex items-center gap-2 text-[9px] text-white/20">
                        {p.owner && (
                          <span className="flex items-center gap-0.5">
                            <Users size={8} /> {getUserFullName(p.owner)}
                          </span>
                        )}
                        {p.end_date && (
                          <span className="flex items-center gap-0.5 ml-auto">
                            <Calendar size={8} /> {formatDateFr(p.end_date)}
                          </span>
                        )}
                      </div>

                      {/* Budget */}
                      {p.budget > 0 && (
                        <div className="text-[9px] text-amber-400/40">
                          {formatBudget(p.budget)}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PortfolioStat({ icon: Icon, label, value, color }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] text-white/30">{label}</span>
      </div>
      <p className="text-lg font-black text-white" style={{ color }}>{value}</p>
    </div>
  )
}
