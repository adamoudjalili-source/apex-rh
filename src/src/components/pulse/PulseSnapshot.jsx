// ============================================================
// APEX RH — PulseSnapshot.jsx
// ✅ Session 24 — Widget dashboard PULSE (Phase F)
// Conditionnel à isPulseEnabled(settings)
// ============================================================
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, Sun, Moon, TrendingUp, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useTodayMorningPlan,
  useTodayLog,
  useTodayScore,
} from '../../hooks/usePulse'
import {
  getScoreColor,
  formatMinutes,
  PULSE_COLORS,
  DAY_STATUS_CONFIG,
  getDayStatus,
} from '../../lib/pulseHelpers'

/**
 * Widget PulseSnapshot pour le Dashboard.
 * À afficher uniquement si isPulseEnabled(settings) === true.
 * Le parent (Dashboard.jsx) est responsable du guard.
 */
export default function PulseSnapshot() {
  const { profile } = useAuth()

  const { data: morningPlan, isLoading: planLoading } = useTodayMorningPlan()
  const { data: dailyLog,    isLoading: logLoading  } = useTodayLog()
  const { data: todayScore,  isLoading: scoreLoading } = useTodayScore()

  const isLoading = planLoading || logLoading || scoreLoading

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5 animate-pulse"
        style={{ background: 'rgba(79,70,229,0.05)', border: '1px solid rgba(79,70,229,0.1)' }}
      >
        <div className="h-4 w-24 rounded bg-white/10 mb-3" />
        <div className="h-8 w-16 rounded bg-white/10" />
      </div>
    )
  }

  const dayStatus = getDayStatus(morningPlan, dailyLog)
  const statusCfg = DAY_STATUS_CONFIG[dayStatus]

  const score      = todayScore?.score_total
  const scoreColor = getScoreColor(score)

  // Temps total loggué aujourd'hui
  const totalMinutes = (dailyLog?.daily_log_entries || [])
    .reduce((sum, e) => sum + (e.time_spent_min || 0), 0)

  // Brief soumis ?
  const briefDone = ['submitted', 'acknowledged'].includes(morningPlan?.status)
  // Journal soumis ?
  const journalDone = ['submitted', 'validated'].includes(dailyLog?.status)

  return (
    <Link to="/tasks" className="block group">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 transition-all duration-150 group-hover:-translate-y-0.5"
        style={{
          background: 'rgba(79,70,229,0.05)',
          border:     '1px solid rgba(79,70,229,0.12)',
        }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(79,70,229,0.15)' }}
            >
              <Activity size={15} className="text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-white/70">PULSE</span>
          </div>
          <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
        </div>

        {/* Score principal */}
        <div className="flex items-end justify-between mb-4">
          <div>
            {score != null ? (
              <>
                <p
                  className="text-4xl font-black leading-none"
                  style={{ color: scoreColor }}
                >
                  {score}
                </p>
                <p className="text-xs text-white/30 mt-1">Score du jour</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-white/20">—</p>
                <p className="text-xs text-white/25 mt-1">Pas encore calculé</p>
              </>
            )}
          </div>

          {/* Score décomposé mini */}
          {todayScore && (
            <div className="flex flex-col gap-1 items-end">
              <MiniScoreBar label="D" value={todayScore.score_delivery}   color={PULSE_COLORS.delivery} />
              <MiniScoreBar label="Q" value={todayScore.score_quality}    color={PULSE_COLORS.quality} />
              <MiniScoreBar label="R" value={todayScore.score_regularity} color={PULSE_COLORS.regularity} />
              <MiniScoreBar label="B" value={todayScore.score_bonus}      color={PULSE_COLORS.bonus} />
            </div>
          )}
        </div>

        {/* Statut journée */}
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{ background: `${statusCfg.color}10` }}
        >
          <div className="flex items-center gap-3">
            {/* Brief */}
            <StatusDot
              icon={<Sun size={11} />}
              done={briefDone}
              label="Brief"
              color={PULSE_COLORS.warning}
            />
            <div className="w-px h-4 bg-white/10" />
            {/* Journal */}
            <StatusDot
              icon={<Moon size={11} />}
              done={journalDone}
              label="Journal"
              color={PULSE_COLORS.success}
            />
          </div>

          {/* Temps loggué */}
          {totalMinutes > 0 && (
            <span className="text-xs text-white/40">
              {formatMinutes(totalMinutes)}
            </span>
          )}
        </div>

        {/* Message contextuel */}
        <p className="text-xs mt-2.5" style={{ color: `${statusCfg.color}90` }}>
          {statusCfg.label}
        </p>
      </motion.div>
    </Link>
  )
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────
function MiniScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-white/30 w-3">{label}</span>
      <div className="w-12 h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value || 0}%`, background: color }}
        />
      </div>
      <span className="text-[9px] text-white/40 w-5 text-right">
        {(value || 0).toFixed(0)}
      </span>
    </div>
  )
}

function StatusDot({ icon, done, label, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center`}
        style={{
          background: done ? `${color}20` : 'rgba(255,255,255,0.05)',
          color:      done ? color : 'rgba(255,255,255,0.2)',
        }}
      >
        {icon}
      </div>
      <span className={`text-[10px] ${done ? 'text-white/60' : 'text-white/20'}`}>
        {label}
      </span>
    </div>
  )
}
