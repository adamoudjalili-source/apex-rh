// ============================================================
// APEX RH — TeamDayView.jsx
// ✅ Session 22 — Vue équipe du jour (manager) PULSE (Phase B)
// ============================================================

// 1. React hooks
import { useState } from 'react'
// 2. Librairies externes
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, CheckCircle2, AlertCircle, XCircle,
  Clock, Users, Eye, ChevronRight, RefreshCw
} from 'lucide-react'
// 5. Hooks projet
import { useTeamDailyLogs, useTeamDayStats } from '../../hooks/useManagerReview'
// 6. Helpers
import {
  PULSE_COLORS,
  formatDateFr,
  getTodayString,
  formatMinutes,
} from '../../lib/pulseHelpers'

/**
 * Vue équipe du jour — résumé des briefs et journaux.
 *
 * Props :
 *   date            {string}   — YYYY-MM-DD (default: aujourd'hui)
 *   onSelectLog     {fn}       — callback quand un manager clique sur un log pour l'évaluer
 *   teamMembers     {array}    — liste des membres de l'équipe (useTeamMembers())
 */
export default function TeamDayView({ date, onSelectLog, teamMembers = [] }) {
  const targetDate = date || getTodayString()
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'validated' | 'missing'

  const { data: logs = [], isLoading, refetch, isRefetching } = useTeamDailyLogs(targetDate)
  const { data: stats } = useTeamDayStats(targetDate)

  // ─── Construire la liste complète des agents ───────────────
  // Pour chaque membre connu, on cherche son log du jour
  const logsMap = Object.fromEntries(logs.map(l => [l.user_id, l]))

  // Regrouper : membres avec log + membres sans log
  const membersWithStatus = teamMembers
    .filter(m => m.role !== 'administrateur')
    .map(m => ({
      ...m,
      log: logsMap[m.id] || null,
    }))

  // Filtre
  const filtered = membersWithStatus.filter(m => {
    if (filter === 'all') return true
    if (filter === 'pending') return m.log?.status === 'submitted'
    if (filter === 'validated') return m.log?.status === 'validated'
    if (filter === 'missing') return !m.log || m.log.status === 'draft'
    return true
  })

  const pendingCount = membersWithStatus.filter(m => m.log?.status === 'submitted').length

  return (
    <div className="space-y-4">
      {/* En-tête stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Briefs soumis"
          value={stats?.briefsSubmitted || 0}
          total={stats?.total || teamMembers.length}
          color={PULSE_COLORS.warning}
          icon={<Sun size={14} />}
        />
        <StatCard
          label="Journaux soumis"
          value={stats?.logsSubmitted || 0}
          total={stats?.total || teamMembers.length}
          color={PULSE_COLORS.primary}
          icon={<Moon size={14} />}
        />
        <StatCard
          label="Validés"
          value={stats?.logsValidated || 0}
          total={stats?.logsSubmitted || 0}
          color={PULSE_COLORS.success}
          icon={<CheckCircle2 size={14} />}
        />
        <StatCard
          label="En attente"
          value={pendingCount}
          total={stats?.total || teamMembers.length}
          color={PULSE_COLORS.danger}
          icon={<AlertCircle size={14} />}
          highlight={pendingCount > 0}
        />
      </div>

      {/* Filtres + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[
            { key: 'all',       label: 'Tous' },
            { key: 'pending',   label: `En attente (${pendingCount})` },
            { key: 'validated', label: 'Validés' },
            { key: 'missing',   label: 'Manquants' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.key
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={filter === f.key
                ? { background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.3)' }
                : { background: 'transparent', border: '1px solid transparent' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <RefreshCw size={12} className={isRefetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Liste des agents */}
      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <AgentRow
                  member={member}
                  onEvaluate={member.log?.status === 'submitted' ? () => onSelectLog?.(member.log) : null}
                  onView={member.log ? () => onSelectLog?.(member.log) : null}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────

function StatCard({ label, value, total, color, icon, highlight }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: highlight ? `${color}10` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${highlight ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-black text-white leading-none">{value}</span>
        <span className="text-xs text-white/30 mb-0.5">/ {total}</span>
      </div>
      {/* Mini barre */}
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function AgentRow({ member, onEvaluate, onView }) {
  const log = member.log
  const brief = log?.morning_plan

  const getLogStatus = () => {
    if (!log) return { label: 'Aucun journal', color: PULSE_COLORS.neutral, icon: <Clock size={12} /> }
    const map = {
      draft:     { label: 'En cours', color: PULSE_COLORS.neutral, icon: <Clock size={12} /> },
      submitted: { label: 'À évaluer', color: PULSE_COLORS.warning, icon: <AlertCircle size={12} /> },
      validated: { label: 'Validé', color: PULSE_COLORS.success, icon: <CheckCircle2 size={12} /> },
      rejected:  { label: 'Rejeté', color: PULSE_COLORS.danger, icon: <XCircle size={12} /> },
    }
    return map[log.status] || map.draft
  }

  const getBriefStatus = () => {
    if (!brief) return { label: 'Pas de brief', color: PULSE_COLORS.neutral }
    if (brief.status === 'submitted') return { label: 'Brief soumis', color: PULSE_COLORS.success }
    return { label: 'Brief en cours', color: PULSE_COLORS.warning }
  }

  const logStatus = getLogStatus()
  const briefStatus = getBriefStatus()

  // Calcul temps total si log disponible
  const totalTime = log?.daily_log_entries?.reduce((s, e) => s + (e.time_spent_min || 0), 0) || 0

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-4"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${log?.status === 'submitted' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
      >
        {member.first_name?.[0]}{member.last_name?.[0]}
      </div>

      {/* Nom + service */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">
          {member.first_name} {member.last_name}
        </p>
        <p className="text-xs text-white/30">
          {member.services?.name || member.divisions?.name || member.role || '—'}
        </p>
      </div>

      {/* Indicateurs Brief + Journal */}
      <div className="flex items-center gap-3">
        {/* Brief */}
        <div className="flex items-center gap-1.5">
          <Sun size={11} style={{ color: briefStatus.color }} />
          <span className="text-[10px] hidden sm:block" style={{ color: briefStatus.color }}>
            {briefStatus.label}
          </span>
        </div>

        {/* Séparateur */}
        <div className="w-px h-3 bg-white/10" />

        {/* Journal */}
        <div className="flex items-center gap-1.5">
          <span style={{ color: logStatus.color }}>{logStatus.icon}</span>
          <span className="text-[10px] hidden sm:block" style={{ color: logStatus.color }}>
            {logStatus.label}
          </span>
        </div>

        {/* Temps */}
        {totalTime > 0 && (
          <>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[10px] text-white/30">{formatMinutes(totalTime)}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onEvaluate && (
          <button
            onClick={onEvaluate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            Évaluer
          </button>
        )}
        {onView && !onEvaluate && (
          <button
            onClick={onView}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors"
            title="Voir le journal"
          >
            <Eye size={14} />
          </button>
        )}
        {!onView && !onEvaluate && (
          <div className="p-1.5">
            <ChevronRight size={14} className="text-white/10" />
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className="rounded-xl h-14 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        />
      ))}
    </div>
  )
}

function EmptyState({ filter }) {
  const messages = {
    all:       { title: 'Aucun agent trouvé', sub: 'L\'équipe n\'a pas encore soumis de journaux.' },
    pending:   { title: 'Aucun journal en attente', sub: 'Tous les journaux ont été évalués 🎉' },
    validated: { title: 'Aucun journal validé', sub: 'Les évaluations ne sont pas encore faites.' },
    missing:   { title: 'Aucun manquant', sub: 'Tous les membres ont soumis leur journal ✓' },
  }
  const msg = messages[filter] || messages.all

  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Users size={28} className="text-white/10 mx-auto mb-2" />
      <p className="text-sm font-medium text-white/40">{msg.title}</p>
      <p className="text-xs text-white/20 mt-1">{msg.sub}</p>
    </div>
  )
}
