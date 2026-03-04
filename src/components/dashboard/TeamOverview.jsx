// ============================================================
// APEX RH — TeamOverview.jsx
// ✅ Session 12 — Statistiques équipe (managers uniquement)
// ✅ Session 18 — Fix animation (div au lieu de motion.div avec variants)
// ============================================================
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ROLE_CONFIG = {
  administrateur: { label: 'Administrateurs', color: '#EF4444' },
  directeur: { label: 'Directeurs', color: '#C9A227' },
  chef_division: { label: 'Chefs de Division', color: '#8B5CF6' },
  chef_service: { label: 'Chefs de Service', color: '#3B82F6' },
  collaborateur: { label: 'Collaborateurs', color: '#10B981' },
}

export default function TeamOverview({ stats, isLoading, isAdmin }) {
  const navigate = useNavigate()

  if (isLoading) return <TeamSkeleton />
  if (!stats || stats.total === 0) return null

  const maxCount = Math.max(...Object.values(stats.byRole || {}), 1)

  return (
    <div
      className={`rounded-xl p-5 group ${isAdmin ? 'cursor-pointer hover:-translate-y-0.5 transition-transform duration-200' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => isAdmin ? navigate('/admin/users') : null}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#10B98115', border: '1px solid #10B98120' }}
          >
            <Users size={14} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Équipe</h3>
            <p className="text-[10px] text-white/30">{stats.total} membre{stats.total > 1 ? 's' : ''} actif{stats.total > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Répartition par rôle */}
      <div className="space-y-2">
        {Object.entries(ROLE_CONFIG).map(([key, config]) => {
          const count = stats.byRole?.[key] || 0
          if (count === 0) return null
          const pct = (count / maxCount) * 100

          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 w-24 truncate">{config.label}</span>
              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <span className="text-[10px] text-white/50 font-semibold w-6 text-right">{count}</span>
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-end">
          <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Gérer les utilisateurs →
          </span>
        </div>
      )}
    </div>
  )
}

function TeamSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="h-4 w-16 rounded bg-white/5" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-3 rounded-full bg-white/5" />
        ))}
      </div>
    </div>
  )
}