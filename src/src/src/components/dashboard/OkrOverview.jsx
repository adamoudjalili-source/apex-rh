// ============================================================
// APEX RH — OkrOverview.jsx
// ✅ Session 12 — Section OKR du dashboard
// ✅ Session 18 — Fix animation (div au lieu de motion.div avec variants)
// ============================================================
import { motion } from 'framer-motion'
import { Target, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const LEVEL_CONFIG = {
  strategique: { label: 'Stratégiques', color: '#C9A227' },
  division: { label: 'Division', color: '#8B5CF6' },
  service: { label: 'Service', color: '#3B82F6' },
  individuel: { label: 'Individuels', color: '#10B981' },
}

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  actif: 'Actif',
  en_evaluation: 'En évaluation',
  valide: 'Validé',
  archive: 'Archivé',
}

// Score color helper
function getScoreColor(score) {
  if (score >= 0.7) return '#10B981'
  if (score >= 0.4) return '#F59E0B'
  return '#EF4444'
}

export default function OkrOverview({ stats, isLoading }) {
  const navigate = useNavigate()

  if (isLoading) return <OkrSkeleton />
  if (!stats) return null

  const scoreDisplay = stats.avgScore > 0 ? (stats.avgScore * 100).toFixed(0) : '—'
  const scoreColor = stats.avgScore > 0 ? getScoreColor(stats.avgScore) : '#4F46E5'

  return (
    <div
      className="rounded-xl p-5 cursor-pointer group hover:-translate-y-0.5 transition-transform duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => navigate('/objectives')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#C9A22715', border: '1px solid #C9A22720' }}
          >
            <Target size={14} className="text-yellow-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Objectifs OKR</h3>
            <p className="text-[10px] text-white/30">
              {stats.periodName || 'Aucune période active'}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
          {stats.total} objectif{stats.total > 1 ? 's' : ''}
        </span>
      </div>

      {stats.total > 0 ? (
        <>
          {/* Score moyen avec jauge circulaire */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"
                />
                <motion.circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.avgScore * 97.4} 97.4`}
                  initial={{ strokeDasharray: '0 97.4' }}
                  animate={{ strokeDasharray: `${stats.avgScore * 97.4} 97.4` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-white">{scoreDisplay}%</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] text-white/30">Score moyen pondéré</p>
              {/* Répartition par niveau */}
              {Object.entries(LEVEL_CONFIG).map(([key, config]) => {
                const count = stats.byLevel?.[key] || 0
                if (count === 0) return null
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
                    <span className="text-[10px] text-white/40 flex-1">{config.label}</span>
                    <span className="text-[10px] text-white/50 font-semibold">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 3 objectifs */}
          <div className="space-y-1.5">
            {stats.objectives
              .sort((a, b) => (b.progress_score || 0) - (a.progress_score || 0))
              .slice(0, 3)
              .map(obj => (
                <div key={obj.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{obj.title}</p>
                  </div>
                  <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(obj.progress_score || 0) * 100}%`,
                        background: getScoreColor(obj.progress_score || 0),
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/40 w-8 text-right font-mono">
                    {((obj.progress_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className="py-6 text-center">
          <Target size={24} className="text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/20">Aucun objectif pour cette période</p>
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

function OkrSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="h-4 w-24 rounded bg-white/5" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-2 w-20 rounded bg-white/5" />
          <div className="h-2 w-16 rounded bg-white/5" />
          <div className="h-2 w-24 rounded bg-white/5" />
        </div>
      </div>
    </div>
  )
}