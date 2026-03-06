// ============================================================
// APEX RH — Board.jsx
// ✅ Session 23 — Performance Board PULSE (Phase C)
// ✅ Session 25 — Phase G : Lien retour /pulse → /tasks (fusion UI)
// ============================================================

// 1. React hooks
import { useState, useMemo } from 'react'
// 2. Librairies externes
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart2, Calendar, ChevronLeft, Download, Users,
  TrendingUp, TrendingDown, Award, Activity, X, Info
} from 'lucide-react'
// 3. React Router
import { Navigate, Link } from 'react-router-dom'
// 4. Contexts
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
// 5. Hooks projet
import {
  useTeamScoreHistory,
  useUserScoreHistory,
  buildLeaderboard,
  getPeriodDates,
} from '../../hooks/usePerformanceScores'
// 6. Helpers
import {
  isPulseEnabled,
  getScoreColor,
  getScoreLabel,
  PULSE_COLORS,
  formatDateFr,
} from '../../lib/pulseHelpers'
// 7. Composants enfants
import ScoreCard from '../../components/pulse/ScoreCard'
import ScoreBar from '../../components/pulse/ScoreBar'
import PerformanceChart from '../../components/pulse/PerformanceChart'

const MANAGER_ROLES = ['administrateur', 'directeur', 'chef_division', 'chef_service']

const PERIODS = [
  { key: 'week',    label: 'Cette semaine' },
  { key: 'month',   label: 'Ce mois'       },
  { key: 'quarter', label: '3 derniers mois' },
]

export default function Board() {
  const { profile } = useAuth()
  const { data: settings, isLoading: settingsLoading } = useAppSettings()

  const [period, setPeriod]         = useState('month')
  const [selectedUser, setSelectedUser] = useState(null) // null = vue globale
  const [viewMode, setViewMode]     = useState('ranking') // 'ranking' | 'analytics'

  const isManager = MANAGER_ROLES.includes(profile?.role)

  // ─── Guards ───────────────────────────────────────────────
  if (!settingsLoading && !isPulseEnabled(settings)) {
    return <Navigate to="/dashboard" replace />
  }

  // ─── Dates de la période ──────────────────────────────────
  const { startDate, endDate } = useMemo(() => getPeriodDates(period), [period])

  // ─── Données équipe (managers) ────────────────────────────
  const {
    data: teamScores = [],
    isLoading: teamLoading,
  } = useTeamScoreHistory(startDate, endDate)

  // ─── Données personnelles (collaborateur) ─────────────────
  const {
    data: myScores = [],
    isLoading: myLoading,
  } = useUserScoreHistory(
    isManager ? (selectedUser?.userId || null) : profile?.id,
    startDate,
    endDate
  )

  // ─── Classement calculé ───────────────────────────────────
  const leaderboard = useMemo(() => buildLeaderboard(teamScores), [teamScores])
  const isLoading   = teamLoading || myLoading

  // ─── Stats équipe ─────────────────────────────────────────
  const teamStats = useMemo(() => {
    if (!leaderboard.length) return null
    const n = leaderboard.length
    return {
      avgTotal:     Math.round(leaderboard.reduce((s, u) => s + u.avgTotal, 0) / n),
      topScore:     leaderboard[0]?.avgTotal || 0,
      agentsAbove70: leaderboard.filter(u => u.avgTotal >= 70).length,
      agentsBelow40: leaderboard.filter(u => u.avgTotal < 40).length,
      total: n,
    }
  }, [leaderboard])

  // ─── Scores pour le graphe (agent sélectionné ou moi) ────
  const chartScores = isManager
    ? (selectedUser
        ? selectedUser.scores
        : [])
    : myScores

  const chartUserName = isManager
    ? (selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : null)
    : `${profile?.first_name} ${profile?.last_name}`

  const myEntry = isManager
    ? null
    : leaderboard.find(u => u.userId === profile?.id) || null

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ─── EN-TÊTE ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/tasks"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <ChevronLeft size={16} className="text-white/50" />
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.2)' }}
          >
            <BarChart2 size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Performance Board
            </h1>
            <p className="text-sm text-white/30">
              {isManager ? 'Classement de votre équipe' : 'Votre évolution personnelle'}
            </p>
          </div>
        </div>

        {/* Sélecteur de période */}
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

      {/* ─── CHARGEMENT ───────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${PULSE_COLORS.primary}40`, borderTopColor: PULSE_COLORS.primary }}
          />
        </div>
      )}

      {!isLoading && (
        <>
          {/* ─── VUE MANAGER ─────────────────────────────── */}
          {isManager && (
            <>
              {/* Stats synthèse */}
              {teamStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Score moyen équipe',
                      value: teamStats.avgTotal,
                      color: getScoreColor(teamStats.avgTotal),
                      sub: getScoreLabel(teamStats.avgTotal),
                    },
                    {
                      label: 'Meilleur score',
                      value: teamStats.topScore,
                      color: getScoreColor(teamStats.topScore),
                      sub: leaderboard[0] ? `${leaderboard[0].firstName} ${leaderboard[0].lastName}` : '—',
                    },
                    {
                      label: 'Agents > 70',
                      value: teamStats.agentsAbove70,
                      color: PULSE_COLORS.success,
                      sub: `sur ${teamStats.total} agents`,
                    },
                    {
                      label: 'Agents < 40',
                      value: teamStats.agentsBelow40,
                      color: teamStats.agentsBelow40 > 0 ? PULSE_COLORS.danger : PULSE_COLORS.success,
                      sub: 'en zone critique',
                    },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p className="text-xs text-white/40 mb-1">{stat.label}</p>
                      <p
                        className="text-2xl font-black tabular-nums"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5">{stat.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Onglets ranking / analytics */}
              <div className="flex items-center gap-2">
                {[
                  { key: 'ranking',   label: 'Classement' },
                  { key: 'analytics', label: 'Analytique' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    className="text-sm px-4 py-2 rounded-xl font-medium transition-all"
                    style={{
                      background: viewMode === tab.key ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.04)',
                      color: viewMode === tab.key ? '#818CF8' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${viewMode === tab.key ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Vue Classement ── */}
              {viewMode === 'ranking' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Colonne gauche : liste */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/30 px-1 uppercase tracking-wider">
                      {leaderboard.length} agents
                    </p>
                    {leaderboard.length === 0 && (
                      <EmptyState message="Aucun score disponible pour cette période" />
                    )}
                    {leaderboard.map(user => (
                      <motion.div
                        key={user.userId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
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

                  {/* Colonne droite : détail agent sélectionné */}
                  <div>
                    {selectedUser ? (
                      <motion.div
                        key={selectedUser.userId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Carte décomposée */}
                        <ScoreCard {...selectedUser} />

                        {/* Graphe évolution */}
                        <PerformanceChart
                          scores={selectedUser.scores}
                          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
                          height={260}
                        />
                      </motion.div>
                    ) : (
                      <div
                        className="rounded-xl p-8 flex flex-col items-center justify-center gap-3 h-64"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px dashed rgba(255,255,255,0.08)',
                        }}
                      >
                        <BarChart2 size={28} className="text-white/15" />
                        <p className="text-sm text-white/25">
                          Sélectionnez un agent pour voir ses détails
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Vue Analytique ── */}
              {viewMode === 'analytics' && (
                <div className="space-y-4">
                  <p className="text-xs text-white/30 px-1 uppercase tracking-wider">
                    Comparaison des dimensions — {leaderboard.length} agents
                  </p>
                  {leaderboard.length === 0 && (
                    <EmptyState message="Aucune donnée analytique disponible" />
                  )}
                  {leaderboard.map(user => (
                    <div
                      key={user.userId}
                      className="rounded-xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {user.rank === 1 ? '🥇 ' : user.rank === 2 ? '🥈 ' : user.rank === 3 ? '🥉 ' : `#${user.rank} `}
                            {user.firstName} {user.lastName}
                          </p>
                          {user.service && (
                            <p className="text-xs text-white/30">{user.service}</p>
                          )}
                        </div>
                        <span
                          className="text-lg font-black tabular-nums"
                          style={{ color: getScoreColor(user.avgTotal) }}
                        >
                          {user.avgTotal}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        <ScoreBar score={user.avgDelivery}   label="Livraison"  color={PULSE_COLORS.delivery}   weight="40%" compact />
                        <ScoreBar score={user.avgQuality}    label="Qualité"    color={PULSE_COLORS.quality}    weight="30%" compact />
                        <ScoreBar score={user.avgRegularity} label="Régularité" color={PULSE_COLORS.regularity} weight="20%" compact />
                        <ScoreBar score={user.avgBonus}      label="Bonus OKR"  color={PULSE_COLORS.bonus}      weight="10%" compact />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── VUE COLLABORATEUR ────────────────────────── */}
          {!isManager && (
            <div className="space-y-4">
              {/* Ma carte de score */}
              {myEntry ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ScoreCard {...myEntry} />
                  <div
                    className="rounded-xl p-5 space-y-4"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <p className="text-xs text-white/40 uppercase tracking-wider">Détail dimensions</p>
                    <div className="space-y-3">
                      <ScoreBar score={myEntry.avgDelivery}   label="Livraison"  color={PULSE_COLORS.delivery}   weight="40%" />
                      <ScoreBar score={myEntry.avgQuality}    label="Qualité"    color={PULSE_COLORS.quality}    weight="30%" />
                      <ScoreBar score={myEntry.avgRegularity} label="Régularité" color={PULSE_COLORS.regularity} weight="20%" />
                      <ScoreBar score={myEntry.avgBonus}      label="Bonus OKR"  color={PULSE_COLORS.bonus}      weight="10%" />
                    </div>
                  </div>
                </div>
              ) : myScores.length === 0 ? (
                <EmptyState message="Aucun score disponible pour cette période. Soumettez vos journaux pour générer des scores." />
              ) : null}

              {/* Graphe évolution */}
              {myScores.length > 0 && (
                <PerformanceChart
                  scores={myScores}
                  userName={`${profile?.first_name} ${profile?.last_name}`}
                  height={280}
                  showDims
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Composant état vide ──────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div
      className="rounded-xl p-8 flex flex-col items-center justify-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.08)',
      }}
    >
      <BarChart2 size={28} className="text-white/15" />
      <p className="text-sm text-white/30 text-center max-w-xs">{message}</p>
    </div>
  )
}
