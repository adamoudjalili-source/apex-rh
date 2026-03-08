// ============================================================
// APEX RH — PulseBoard.jsx
// Session 101 — Phase C RBAC : nouveau composant natif usePermission V2
// Tableau de bord Performance PULSE — classement équipe + vue perso
// Guard : can('pulse', 'board', 'read') — tous les utilisateurs
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lock, BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import { useAuth }        from '../../contexts/AuthContext'
import {
  useTeamScoreHistory,
  useUserScoreHistory,
  buildLeaderboard,
  getPeriodDates,
} from '../../hooks/usePerformanceScores'
import {
  getScoreColor,
  getScoreLabel,
  PULSE_COLORS,
} from '../../lib/pulseHelpers'
import ScoreCard  from './ScoreCard'
import ScoreBar   from './ScoreBar'

// ─── Types de périodes ────────────────────────────────────────
const PERIODS = [
  { key: 'week',    label: 'Semaine' },
  { key: 'month',   label: 'Mois'   },
  { key: 'quarter', label: '3 mois' },
]

// ─── Access Denied ────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={20} className="text-rose-400" />
      </div>
      <p className="text-white/40 text-sm text-center max-w-xs">
        Accès restreint — droits insuffisants
      </p>
    </div>
  )
}

// ─── Stat Card compacte ───────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color }}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-xs text-white/30 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function PulseBoard() {
  const { can, scope } = usePermission()
  const { profile }    = useAuth()

  const [period, setPeriod]         = useState('month')
  const [selectedUser, setSelectedUser] = useState(null)

  // Guard RBAC
  if (!can('pulse', 'board', 'read')) return <AccessDenied />

  const isManager = can('pulse', 'team', 'read')

  const { startDate, endDate } = useMemo(() => getPeriodDates(period), [period])

  const { data: teamScores = [], isLoading: teamLoading } = useTeamScoreHistory(startDate, endDate)
  const { data: myScores = [],   isLoading: myLoading   } = useUserScoreHistory(
    isManager ? (selectedUser?.userId || null) : profile?.id,
    startDate,
    endDate
  )

  const leaderboard = useMemo(() => buildLeaderboard(teamScores), [teamScores])
  const isLoading   = teamLoading || myLoading

  const teamStats = useMemo(() => {
    if (!leaderboard.length) return null
    const n = leaderboard.length
    return {
      avgTotal:      Math.round(leaderboard.reduce((s, u) => s + u.avgTotal, 0) / n),
      topScore:      leaderboard[0]?.avgTotal || 0,
      topName:       leaderboard[0] ? `${leaderboard[0].firstName} ${leaderboard[0].lastName}` : '—',
      agentsAbove70: leaderboard.filter(u => u.avgTotal >= 70).length,
      agentsBelow40: leaderboard.filter(u => u.avgTotal < 40).length,
      total: n,
    }
  }, [leaderboard])

  const myEntry = !isManager
    ? leaderboard.find(u => u.userId === profile?.id) || null
    : null

  return (
    <div className="space-y-5">

      {/* Sélecteur période */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-white">
            {isManager ? 'Classement équipe' : 'Mon score PULSE'}
          </span>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setSelectedUser(null) }}
              className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
              style={{
                background: period === p.key ? PULSE_COLORS.primary : 'transparent',
                color: period === p.key ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Vue Manager */}
          {isManager && (
            <>
              {teamStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Score moyen"
                    value={teamStats.avgTotal}
                    color={getScoreColor(teamStats.avgTotal)}
                    sub={getScoreLabel(teamStats.avgTotal)}
                  />
                  <StatCard
                    label="Meilleur score"
                    value={teamStats.topScore}
                    color={getScoreColor(teamStats.topScore)}
                    sub={teamStats.topName}
                  />
                  <StatCard
                    label="Agents ≥ 70"
                    value={teamStats.agentsAbove70}
                    color={PULSE_COLORS.success}
                    sub={`sur ${teamStats.total}`}
                  />
                  <StatCard
                    label="Agents < 40"
                    value={teamStats.agentsBelow40}
                    color={teamStats.agentsBelow40 > 0 ? PULSE_COLORS.danger : PULSE_COLORS.success}
                    sub="zone critique"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Classement */}
                <div className="space-y-2">
                  <p className="text-xs text-white/30 px-1 uppercase tracking-wider">
                    {leaderboard.length} agent{leaderboard.length > 1 ? 's' : ''}
                  </p>
                  {leaderboard.length === 0 ? (
                    <div
                      className="rounded-xl p-8 flex flex-col items-center justify-center gap-3 h-40"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
                    >
                      <BarChart2 size={24} className="text-white/15" />
                      <p className="text-sm text-white/25">Aucun score sur cette période</p>
                    </div>
                  ) : leaderboard.map(user => (
                    <motion.div
                      key={user.userId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <ScoreCard
                        {...user}
                        compact
                        selected={selectedUser?.userId === user.userId}
                        onClick={() => setSelectedUser(
                          selectedUser?.userId === user.userId ? null : user
                        )}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Détail sélectionné */}
                <div>
                  {selectedUser ? (
                    <motion.div
                      key={selectedUser.userId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <ScoreCard {...selectedUser} />
                      <div
                        className="rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">
                          Dimensions
                        </p>
                        <div className="space-y-3">
                          <ScoreBar score={selectedUser.avgDelivery}   label="Livraison"  color={PULSE_COLORS.delivery}   weight="40%" compact />
                          <ScoreBar score={selectedUser.avgQuality}    label="Qualité"    color={PULSE_COLORS.quality}    weight="30%" compact />
                          <ScoreBar score={selectedUser.avgRegularity} label="Régularité" color={PULSE_COLORS.regularity} weight="20%" compact />
                          <ScoreBar score={selectedUser.avgBonus}      label="Bonus OKR"  color={PULSE_COLORS.bonus}      weight="10%" compact />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div
                      className="rounded-xl p-8 flex flex-col items-center justify-center gap-3 h-64"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
                    >
                      <BarChart2 size={24} className="text-white/15" />
                      <p className="text-sm text-white/25">
                        Sélectionnez un agent pour voir ses détails
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Vue Collaborateur */}
          {!isManager && (
            <div className="space-y-4">
              {myEntry ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ScoreCard {...myEntry} />
                  <div
                    className="rounded-xl p-5 space-y-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <p className="text-xs text-white/40 uppercase tracking-wider">
                      Mes dimensions
                    </p>
                    <div className="space-y-3">
                      <ScoreBar score={myEntry.avgDelivery}   label="Livraison"  color={PULSE_COLORS.delivery}   weight="40%" />
                      <ScoreBar score={myEntry.avgQuality}    label="Qualité"    color={PULSE_COLORS.quality}    weight="30%" />
                      <ScoreBar score={myEntry.avgRegularity} label="Régularité" color={PULSE_COLORS.regularity} weight="20%" />
                      <ScoreBar score={myEntry.avgBonus}      label="Bonus OKR"  color={PULSE_COLORS.bonus}      weight="10%" />
                    </div>
                  </div>
                </div>
              ) : myScores.length === 0 ? (
                <div
                  className="rounded-xl p-8 flex flex-col items-center justify-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
                >
                  <TrendingUp size={24} className="text-white/15" />
                  <p className="text-sm text-white/25 text-center max-w-xs">
                    Aucun score sur cette période. Soumettez vos journaux pour générer vos scores.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  )
}
