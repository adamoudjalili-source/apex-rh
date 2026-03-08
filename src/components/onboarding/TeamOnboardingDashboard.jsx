// ============================================================
// APEX RH — TeamOnboardingDashboard.jsx  ·  Session 75
// Tableau de suivi manager — alertes retard
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, AlertCircle, CheckCircle2, Clock,
  TrendingUp, ChevronRight, User, Calendar,
} from 'lucide-react'
import { useTeamOnboardingProgress } from '../../hooks/useOnboarding'
import { useUsersList }              from '../../hooks/useSettings'

// Calcul du taux de complétion et infos retard
function computeProgress(assignment) {
  const completions = assignment.onboarding_step_completions || []
  const total     = completions.length
  const completed = completions.filter(c => c.status === 'completed').length
  const skipped   = completions.filter(c => c.status === 'skipped').length
  const pct       = total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0

  const startDate = assignment.start_date ? new Date(assignment.start_date) : null
  const overdue   = completions.filter(c => {
    if (c.status !== 'pending' || !startDate) return false
    // On n'a pas les step details ici, on utilise le status si overdue est déjà calculé
    return c.status === 'overdue'
  }).length

  return { total, completed, skipped, pct, overdue }
}

// ─── Carte collaborateur ──────────────────────────────────────
function MemberCard({ assignment }) {
  const user     = assignment.users || {}
  const template = assignment.onboarding_templates || {}
  const { total, completed, pct, overdue } = computeProgress(assignment)

  const barColor = overdue > 0 ? '#EF4444'
    : pct >= 100 ? '#10B981'
    : pct >= 50  ? '#6366F1'
    : '#F59E0B'

  const startDate = assignment.start_date
    ? new Date(assignment.start_date).toLocaleDateString('fr-FR')
    : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl"
      style={{
        background: overdue > 0 ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${overdue > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.15)' }}>
          <User size={16} className="text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white text-sm truncate">
              {user.full_name || 'Collaborateur'}
            </span>
            <span className="text-sm font-bold text-white flex-shrink-0">{pct}%</span>
          </div>

          <p className="text-xs text-white/40 truncate mt-0.5">{template.name || '—'}</p>

          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <Calendar size={9} /> {startDate}
            </span>
            <span className="text-[10px] text-white/30">{completed}/{total} étapes</span>
            {overdue > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
                <AlertCircle size={9} /> {overdue} en retard
              </span>
            )}
            {pct === 100 && (
              <span className="text-[10px] text-emerald-400 font-semibold">✓ Terminé</span>
            )}
          </div>

          {/* Barre de progression */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: barColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function TeamOnboardingDashboard() {
  const { data: assignments = [], isLoading } = useTeamOnboardingProgress()
  const [filter, setFilter] = useState('all') // all | overdue | inprogress | done

  const enriched = assignments.map(a => ({
    ...a,
    _progress: computeProgress(a),
  }))

  const filtered = enriched.filter(a => {
    if (filter === 'overdue')    return a._progress.overdue > 0
    if (filter === 'inprogress') return a._progress.pct > 0 && a._progress.pct < 100 && a._progress.overdue === 0
    if (filter === 'done')       return a._progress.pct === 100
    return true
  })

  // KPIs
  const total     = enriched.length
  const withDelay = enriched.filter(a => a._progress.overdue > 0).length
  const done      = enriched.filter(a => a._progress.pct === 100).length
  const avgPct    = total > 0
    ? Math.round(enriched.reduce((s, a) => s + a._progress.pct, 0) / total)
    : 0

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  if (total === 0) return (
    <div className="text-center py-12 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
      <Users size={36} className="mx-auto text-white/15 mb-3" />
      <p className="text-white/40">Aucun parcours dans votre équipe</p>
      <p className="text-white/25 text-xs mt-1">Les parcours assignés à vos collaborateurs apparaîtront ici</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'En cours',    value: total,     color: '#6366F1', icon: Clock },
          { label: 'En retard',   value: withDelay, color: '#EF4444', icon: AlertCircle },
          { label: 'Terminés',    value: done,      color: '#10B981', icon: CheckCircle2 },
          { label: 'Taux moyen',  value: `${avgPct}%`, color: '#F59E0B', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-3 rounded-xl text-center"
            style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
            <Icon size={16} className="mx-auto mb-1" style={{ color }} />
            <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-white/40">{label}</p>
          </div>
        ))}
      </div>

      {/* Alertes retard */}
      {withDelay > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              {withDelay} collaborateur{withDelay > 1 ? 's' : ''} avec des étapes en retard
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Pensez à relancer ces collaborateurs pour qu'ils complètent leurs étapes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all',        label: `Tous (${total})` },
          { id: 'overdue',    label: `En retard (${withDelay})` },
          { id: 'inprogress', label: 'En cours' },
          { id: 'done',       label: `Terminés (${done})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id ? 'text-indigo-300' : 'text-white/40 hover:text-white/60'
            }`}
            style={{ background: filter === f.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-center text-white/30 text-sm py-6">Aucun parcours dans ce filtre</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <MemberCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  )
}
