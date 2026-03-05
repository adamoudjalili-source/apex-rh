// ============================================================
// APEX RH — ProjectsOverview.jsx
// ✅ Session 12 — Section projets du dashboard
// ✅ Session 18 — Fix animation (div au lieu de motion.div avec variants)
// ============================================================
import { motion } from 'framer-motion'
import { FolderKanban, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG = {
  planifie: { label: 'Planifié', color: '#6B7280' },
  en_cours: { label: 'En cours', color: '#3B82F6' },
  en_pause: { label: 'En pause', color: '#F59E0B' },
  termine: { label: 'Terminé', color: '#10B981' },
  annule: { label: 'Annulé', color: '#EF4444' },
}

function formatFCFA(amount) {
  if (!amount) return '0'
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`
  return amount.toLocaleString('fr-FR')
}

export default function ProjectsOverview({ stats, isLoading }) {
  const navigate = useNavigate()

  if (isLoading) return <ProjectsSkeleton />
  if (!stats) return null

  return (
    <div
      className="rounded-xl p-5 cursor-pointer group hover:-translate-y-0.5 transition-transform duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => navigate('/projects')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#8B5CF615', border: '1px solid #8B5CF620' }}
          >
            <FolderKanban size={14} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Projets</h3>
            <p className="text-[10px] text-white/30">{stats.total} projet{stats.total > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {stats.total > 0 ? (
        <>
          {/* Progression moyenne */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/30">Progression moyenne</span>
              <span className="text-xs font-bold text-purple-400">{stats.avgProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}
                initial={{ width: 0 }}
                animate={{ width: `${stats.avgProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>

          {/* Répartition par statut */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-0.5 h-8 flex-1 rounded-lg overflow-hidden">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = stats.byStatus?.[key] || 0
                if (count === 0) return null
                const pct = (count / stats.total) * 100
                return (
                  <motion.div
                    key={key}
                    className="h-full"
                    style={{ background: config.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    title={`${config.label}: ${count}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Légende statuts */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = stats.byStatus?.[key] || 0
              if (count === 0) return null
              return (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
                  <span className="text-[10px] text-white/40">{config.label}</span>
                  <span className="text-[10px] text-white/50 font-semibold">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Budget */}
          {stats.totalBudget > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <Wallet size={12} className="text-white/30" />
              <div className="flex-1">
                <p className="text-[10px] text-white/30">Budget total</p>
                <p className="text-xs font-bold text-white">
                  {formatFCFA(stats.totalBudget)} <span className="text-[10px] text-white/30 font-normal">FCFA</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/30">Consommé</p>
                <p className="text-xs font-bold" style={{ color: stats.budgetUsage > 80 ? '#EF4444' : '#10B981' }}>
                  {stats.budgetUsage}%
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-6 text-center">
          <FolderKanban size={24} className="text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/20">Aucun projet actif</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-end">
        <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Voir tout →
        </span>
      </div>
    </div>
  )
}

function ProjectsSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="h-4 w-20 rounded bg-white/5" />
      </div>
      <div className="h-2 rounded-full bg-white/5 mb-4" />
      <div className="h-8 rounded-lg bg-white/5 mb-4" />
      <div className="space-y-1">
        <div className="h-2 w-16 rounded bg-white/5" />
        <div className="h-2 w-24 rounded bg-white/5" />
      </div>
    </div>
  )
}