// ============================================================
// APEX RH — components/compensation/CompensationDashboardEnrichi.jsx
// S74 — Dashboard Compensation enrichi
// KPIs révisions + évolution masse salariale + distribution
// ============================================================
import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import {
  useRevisionStats, useCyclesProgress, useCompensationCycles,
  useOrgCompensationStats, formatSalary, formatSalaryShort,
  REVIEW_WORKFLOW_STATUS_LABELS, REVIEW_WORKFLOW_STATUS_COLORS
} from '../../hooks/useCompensation'

// ─── Carte KPI ────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon: Icon, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold" style={{ color }}>{value}</div>
          <div className="text-xs text-white/40 mt-1">{label}</div>
          {sub && <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: color + '18', border: `1px solid ${color}30` }}>
            <Icon size={16} style={{ color }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Barre SVG horizontale avec animation ────────────────────
function AnimatedBar({ label, value, max, color, isCFA = true }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-white/40 w-28 truncate text-right">{label}</div>
      <div className="flex-1 rounded-full overflow-hidden h-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: color }} />
      </div>
      <div className="text-xs font-semibold text-white/70 w-20 text-right">
        {isCFA ? formatSalaryShort(value) : value}
      </div>
    </div>
  )
}

// ─── Jauge statut révisions (mini) ───────────────────────────
function RevisionStatusBreakdown({ stats }) {
  if (!stats) return null
  const items = [
    { key: 'nb_soumis',          label: 'Soumis',         color: '#F59E0B' },
    { key: 'nb_valide_manager',  label: 'Validé mgr.',    color: '#3B82F6' },
    { key: 'nb_valide_rh',       label: 'Validé RH',      color: '#8B5CF6' },
    { key: 'nb_applique',        label: 'Appliqué',       color: '#10B981' },
    { key: 'nb_refuse',          label: 'Refusé',         color: '#EF4444' },
  ].filter(i => stats[i.key] > 0)

  const total = items.reduce((s, i) => s + stats[i.key], 0)

  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-xs font-semibold text-white/50 mb-3">Répartition des révisions</h3>
      {total === 0 ? (
        <p className="text-xs text-white/25 text-center py-3">Aucune révision enregistrée</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <AnimatedBar key={item.key}
              label={item.label}
              value={stats[item.key]}
              max={total}
              color={item.color}
              isCFA={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Cycles en cours ─────────────────────────────────────────
function ActiveCycles({ cycles, progress }) {
  const active = cycles.filter(c => c.status === 'en_cours')
  if (active.length === 0) return null

  const progressById = Object.fromEntries((progress ?? []).map(p => [p.cycle_id, p]))

  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-xs font-semibold text-white/50 mb-3">Cycles en cours</h3>
      <div className="flex flex-col gap-3">
        {active.map(cycle => {
          const prog = progressById[cycle.id]
          const pct = prog?.pct_valides ?? 0
          return (
            <div key={cycle.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/70">{cycle.name}</span>
                <span className="text-xs font-semibold" style={{ color: '#6366F1' }}>{pct}% validé</span>
              </div>
              <div className="rounded-full overflow-hidden h-1.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                  style={{ background: '#6366F1' }} />
              </div>
              {prog && (
                <div className="flex gap-3 mt-1 text-[10px] text-white/30">
                  <span>{prog.total_reviews} révisions</span>
                  <span>·</span>
                  <span style={{ color: '#10B981' }}>{prog.nb_appliques} appliquées</span>
                  {cycle.budget_envelope > 0 && (
                    <>
                      <span>·</span>
                      <span>Budget: {formatSalaryShort(prog.budget_engage)} / {formatSalaryShort(cycle.budget_envelope)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function CompensationDashboardEnrichi() {
  const { can } = usePermission()
  const canAdmin = can('compensation', 'admin', 'read')
  const { data: stats }      = useRevisionStats()
  const { data: cycles = [] } = useCompensationCycles()
  const { data: progress = [] } = useCyclesProgress()
  const { data: orgStats }   = useOrgCompensationStats?.() ?? {}

  const pending = (stats?.nb_soumis ?? 0) + (stats?.nb_valide_manager ?? 0)

  return (
    <div className="flex flex-col gap-4">

      {/* KPIs révisions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total révisions"  value={stats?.total ?? 0}            color="#6366F1" icon={TrendingUp}   delay={0}    />
        <KPICard label="En attente"       value={pending}                       color="#F59E0B" icon={Clock}        delay={0.05}
          sub={pending > 0 ? 'Action requise' : undefined} />
        <KPICard label="Appliquées"       value={stats?.nb_applique ?? 0}       color="#10B981" icon={CheckCircle}  delay={0.1}  />
        <KPICard label="Hausse moyenne"   value={`+${(stats?.avg_increase_pct ?? 0).toFixed(1)}%`} color="#8B5CF6" icon={DollarSign} delay={0.15} />
      </div>

      {/* Alerte révisions en attente */}
      {pending > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={16} style={{ color: '#FCD34D' }} />
          <div className="text-xs" style={{ color: '#FCD34D' }}>
            <span className="font-semibold">{pending} révision{pending > 1 ? 's' : ''}</span>{' '}
            en attente de validation — accédez à l'onglet <strong>Révisions</strong> pour les traiter.
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Répartition par statut */}
        <RevisionStatusBreakdown stats={stats} />

        {/* Cycles actifs */}
        {cycles.some(c => c.status === 'en_cours') ? (
          <ActiveCycles cycles={cycles} progress={progress} />
        ) : (
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-xs font-semibold text-white/50 mb-3">Cycles de révision</h3>
            <div className="text-center py-4">
              <p className="text-xs text-white/25">Aucun cycle actif</p>
              <p className="text-[10px] text-white/15 mt-1">Créez un cycle dans l'onglet Cycles</p>
            </div>
          </div>
        )}
      </div>

      {/* Budget total engagé par cycle */}
      {progress.length > 0 && (
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-xs font-semibold text-white/50 mb-3">Budget engagé par cycle</h3>
          <div className="flex flex-col gap-2">
            {progress
              .filter(p => p.budget_engage > 0)
              .sort((a, b) => b.budget_engage - a.budget_engage)
              .slice(0, 5)
              .map(p => {
                const max = p.budget_envelope > 0 ? p.budget_envelope : p.budget_engage
                const over = p.budget_envelope > 0 && p.budget_engage > p.budget_envelope
                return (
                  <AnimatedBar key={p.cycle_id}
                    label={`${p.name} (${p.year})`}
                    value={p.budget_engage}
                    max={max}
                    color={over ? '#EF4444' : '#10B981'}
                    isCFA={true} />
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
