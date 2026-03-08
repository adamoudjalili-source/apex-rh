// ============================================================
// APEX RH — src/components/offboarding/OffboardingDashboard.jsx
// Session 85 — Dashboard RH : processus en cours + alertes retard
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Clock, CheckCircle2, Users,
  ChevronRight, Calendar, Zap, RefreshCw,
} from 'lucide-react'
import {
  useOffboardingDashboard,
  useAutoCreateOffboarding,
} from '../../hooks/useOffboardingS85'
import { OFFBOARDING_STATUS_LABELS, EXIT_REASON_LABELS } from '../../hooks/useOffboarding'
import { usePermission } from '../../hooks/usePermission'

// ─── Helpers ─────────────────────────────────────────────────

function urgencyColor(daysUntilExit, overdueCount) {
  if (overdueCount > 0 || (daysUntilExit !== null && daysUntilExit <= 3)) return '#EF4444'
  if (daysUntilExit !== null && daysUntilExit <= 7)  return '#F59E0B'
  return '#10B981'
}

function urgencyLabel(daysUntilExit, overdueCount) {
  if (overdueCount > 0)                                     return `${overdueCount} tâche${overdueCount > 1 ? 's' : ''} en retard`
  if (daysUntilExit === null)                               return 'Date non définie'
  if (daysUntilExit < 0)                                    return `Départ passé (${Math.abs(daysUntilExit)}j)`
  if (daysUntilExit === 0)                                  return 'Dernier jour aujourd\'hui'
  if (daysUntilExit <= 7)                                   return `${daysUntilExit}j restants`
  return `${daysUntilExit}j restants`
}

function progressPct(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

// ─── Carte processus ─────────────────────────────────────────

function ProcessRow({ process, onSelect }) {
  const color   = urgencyColor(process.days_until_exit, process.overdue_tasks)
  const urgency = urgencyLabel(process.days_until_exit, process.overdue_tasks)
  const pct     = progressPct(process.done_tasks, process.total_tasks)
  const isAlert = process.overdue_tasks > 0 || (process.days_until_exit !== null && process.days_until_exit <= 7)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onSelect(process)}
      className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
      style={{
        background: isAlert ? `${color}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isAlert ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
        style={{ background: `${color}20`, color }}>
        {(process.first_name?.[0] || '?')}{(process.last_name?.[0] || '')}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">
            {process.first_name} {process.last_name}
          </span>
          {process.auto_triggered && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}>
              AUTO
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-white/40">
            {EXIT_REASON_LABELS[process.exit_reason] || process.exit_reason || 'Motif non renseigné'}
          </span>
          {process.exit_date && (
            <>
              <span className="text-white/20">•</span>
              <span className="text-xs text-white/40">
                Départ {new Date(process.exit_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progression */}
      <div className="flex-shrink-0 w-24">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/40">{process.done_tasks}/{process.total_tasks}</span>
          <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>

      {/* Urgence */}
      <div className="flex-shrink-0 flex items-center gap-1.5 min-w-[120px] justify-end">
        {isAlert && <AlertTriangle size={12} style={{ color }} />}
        <span className="text-xs font-medium" style={{ color }}>{urgency}</span>
      </div>

      <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
    </motion.div>
  )
}

// ─── KPI Cards ────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
        {sub && <p className="text-[10px] text-white/30">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

export default function OffboardingDashboard({ onSelectProcess }) {
  const { can } = usePermission()
  const canAdmin = can('offboarding', 'team', 'read')
  const { data: processes = [], isLoading, refetch, isFetching } = useOffboardingDashboard()
  const autoCreate = useAutoCreateOffboarding()
  const [filter, setFilter] = useState('all') // 'all' | 'alert' | 'on_track'

  const active    = processes.filter(p => p.status === 'in_progress')
  const alerts    = active.filter(p => p.overdue_tasks > 0 || (p.days_until_exit !== null && p.days_until_exit <= 7))
  const onTrack   = active.filter(p => p.overdue_tasks === 0 && (p.days_until_exit === null || p.days_until_exit > 7))
  const completed = processes.filter(p => p.status === 'completed').length

  const displayed = filter === 'alert'    ? alerts
                  : filter === 'on_track' ? onTrack
                  : active

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Dashboard Offboarding</h2>
          <p className="text-xs text-white/40 mt-0.5">Vue temps réel des départs en cours</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users}        label="En cours"    value={active.length}    color="#6366F1" />
        <KpiCard icon={AlertTriangle} label="Alertes"    value={alerts.length}    color="#EF4444"
          sub={alerts.length > 0 ? 'Action requise' : 'Tout est OK'} />
        <KpiCard icon={Clock}        label="< 7 jours"   value={active.filter(p => p.days_until_exit !== null && p.days_until_exit <= 7).length} color="#F59E0B" />
        <KpiCard icon={CheckCircle2} label="Terminés"    value={completed}        color="#10B981" />
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {[
          { id: 'all',      label: `Tous (${active.length})` },
          { id: 'alert',    label: `Alertes (${alerts.length})` },
          { id: 'on_track', label: `En bonne voie (${onTrack.length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: filter === f.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color:      filter === f.id ? '#818CF8' : 'rgba(255,255,255,0.4)',
              border:     `1px solid ${filter === f.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12"
          style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <CheckCircle2 size={32} className="mx-auto mb-3 text-green-400/50" />
          <p className="text-sm text-white/40">
            {filter === 'alert'
              ? 'Aucune alerte active — tout est sous contrôle'
              : 'Aucun processus d\'offboarding en cours'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {displayed.map(p => (
              <ProcessRow
                key={p.id}
                process={p}
                onSelect={onSelectProcess}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bannière auto-trigger info */}
      {canAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Zap size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-indigo-300">Automatisation active</p>
            <p className="text-xs text-white/40 mt-0.5">
              Chaque nouveau départ enregistré dans la gestion des départs crée automatiquement un processus d'offboarding avec la checklist du template par défaut.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
