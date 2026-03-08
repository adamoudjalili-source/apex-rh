// ============================================================
// APEX RH — RecentActivity.jsx
// ✅ Session 12 — Activité récente sur le dashboard
// ✅ Session 18 — Fix animation (div au lieu de motion.div avec variants)
// ============================================================
import { motion } from 'framer-motion'
import { CheckSquare, Target, FolderKanban, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TASK_STATUS_COLOR = {
  backlog: '#6B7280',
  a_faire: '#3B82F6',
  en_cours: '#F59E0B',
  en_revue: '#8B5CF6',
  terminee: '#10B981',
  bloquee: '#EF4444',
}

const OBJ_STATUS_COLOR = {
  brouillon: '#6B7280',
  actif: '#3B82F6',
  en_evaluation: '#F59E0B',
  valide: '#10B981',
  archive: '#6B7280',
}

const PROJ_STATUS_COLOR = {
  planifie: '#6B7280',
  en_cours: '#3B82F6',
  en_pause: '#F59E0B',
  termine: '#10B981',
  annule: '#EF4444',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function RecentActivity({ data, isLoading }) {
  const navigate = useNavigate()

  if (isLoading) return <ActivitySkeleton />
  if (!data) return null

  // Fusionner et trier par updated_at
  const allItems = [
    ...(data.tasks || []).map(t => ({
      type: 'task',
      id: t.id,
      title: t.title,
      status: t.status,
      color: TASK_STATUS_COLOR[t.status] || '#6B7280',
      icon: CheckSquare,
      date: t.updated_at,
      path: '/tasks',
    })),
    ...(data.objectives || []).map(o => ({
      type: 'objective',
      id: o.id,
      title: o.title,
      status: o.status,
      color: OBJ_STATUS_COLOR[o.status] || '#6B7280',
      icon: Target,
      date: o.updated_at,
      path: '/objectives',
    })),
    ...(data.projects || []).map(p => ({
      type: 'project',
      id: p.id,
      title: p.name,
      status: p.status,
      color: PROJ_STATUS_COLOR[p.status] || '#6B7280',
      icon: FolderKanban,
      date: p.updated_at,
      path: '/projects',
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)

  if (allItems.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-sm font-bold text-white mb-4">Activité récente</h3>
        <p className="text-xs text-white/20 text-center py-6">Aucune activité récente</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <h3 className="text-sm font-bold text-white mb-4">Activité récente</h3>

      <div className="space-y-1">
        {allItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] cursor-pointer group transition-colors"
              onClick={() => navigate(item.path)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15` }}
              >
                <Icon size={11} style={{ color: item.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/70 truncate">{item.title}</p>
              </div>

              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: item.color }}
              />

              <span className="text-[9px] text-white/20 flex-shrink-0 w-14 text-right">
                {timeAgo(item.date)}
              </span>

              <ArrowRight size={10} className="text-white/0 group-hover:text-white/30 transition-colors flex-shrink-0" />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="h-4 w-28 rounded bg-white/5 mb-4" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-white/5" />
            <div className="h-3 flex-1 rounded bg-white/5" />
            <div className="h-2 w-10 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  )
}