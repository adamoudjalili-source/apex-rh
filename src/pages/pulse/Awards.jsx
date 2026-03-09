// ============================================================
// APEX RH — Awards.jsx
// ✅ Session 24 — Page Awards + Hall of Fame PULSE (Phase E)
// ============================================================
import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronLeft, ChevronRight, Award, Star, TrendingUp, AlertCircle, Crown, Check, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { useAppSettings } from '../../hooks/useSettings'
import {
  useMonthlyAwards,
  useHallOfFame,
  useGrantAward,
  useRevokeAward,
  computeAwardCandidates,
  AWARD_TYPES,
  MONTH_NAMES_FR,
  formatAwardMonth,
} from '../../hooks/useAwards'
import { useLeaderboard, useTeamScoreHistory, buildLeaderboard, getPeriodDates } from '../../hooks/usePerformanceScores'
import { isPulseEnabled, PULSE_COLORS } from '../../lib/pulseHelpers'
import { AwardCard } from '../../components/pulse/AwardBadge'

// S69 — MANAGER_ROLES remplacé par canManageTeam

// ─── PAGE PRINCIPALE ─────────────────────────────────────────
export default function Awards() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManageTeam = can('pulse', 'team', 'read')
  const { data: settings, isLoading: settingsLoading } = useAppSettings()

  const isManager = canManageTeam
  const today = new Date()

  const [activeTab, setActiveTab]   = useState('current')   // 'current' | 'halloffame'
  const [viewYear,  setViewYear]    = useState(today.getFullYear())
  const [viewMonth, setViewMonth]   = useState(today.getMonth() + 1) // 1-based

  // Guard PULSE
  if (!settingsLoading && !isPulseEnabled(settings)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.25)' }}
          >
            <Trophy size={22} style={{ color: PULSE_COLORS.gold }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Awards
            </h1>
            <p className="text-sm text-white/30">Reconnaissance · Hall of Fame</p>
          </div>
        </div>

        {/* Onglets */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { id: 'current', label: 'Mois en cours' },
            { id: 'halloffame', label: 'Hall of Fame' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={activeTab === tab.id ? {
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'current' ? (
          <CurrentAwards
            key="current"
            year={viewYear}
            month={viewMonth}
            onPrev={() => {
              if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
              else setViewMonth(m => m - 1)
            }}
            onNext={() => {
              if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
              else setViewMonth(m => m + 1)
            }}
            isManager={isManager}
            currentUserId={profile?.id}
          />
        ) : (
          <HallOfFame key="halloffame" isManager={isManager} currentUserId={profile?.id} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ONGLET MOIS EN COURS ────────────────────────────────────
function CurrentAwards({ year, month, onPrev, onNext, isManager, currentUserId }) {
  const { data: awards = [], isLoading: awardsLoading } = useMonthlyAwards(year, month)
  const grantAward = useGrantAward()
  const revokeAward = useRevokeAward()

  const [grantingType, setGrantingType] = useState(null)
  const [grantSuccess, setGrantSuccess] = useState(null)

  // Leaderboard du mois pour calcul des candidats
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd   = (() => {
    const d = new Date(year, month, 0)
    return d.toISOString().split('T')[0]
  })()

  const { data: monthScores = [], isLoading: scoresLoading } = useTeamScoreHistory(monthStart, monthEnd)

  // Leaderboard du mois précédent
  const prevYear  = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const prevEnd   = (() => {
    const d = new Date(prevYear, prevMonth, 0)
    return d.toISOString().split('T')[0]
  })()
  const { data: prevScores = [] } = useTeamScoreHistory(prevStart, prevEnd)

  const leaderboard     = useMemo(() => buildLeaderboard(monthScores), [monthScores])
  const prevLeaderboard = useMemo(() => buildLeaderboard(prevScores),  [prevScores])

  const candidates = useMemo(
    () => computeAwardCandidates(leaderboard, monthScores, prevLeaderboard),
    [leaderboard, monthScores, prevLeaderboard]
  )

  const isCurrentMonth = (() => {
    const n = new Date()
    return n.getFullYear() === year && n.getMonth() + 1 === month
  })()

  const isPastMonth = !isCurrentMonth && (
    year < new Date().getFullYear() ||
    (year === new Date().getFullYear() && month < new Date().getMonth() + 1)
  )

  const isLoading = awardsLoading || scoresLoading

  async function handleGrant(awardType, candidate) {
    if (!candidate || !isManager) return
    setGrantingType(awardType)
    try {
      await grantAward.mutateAsync({
        userId:        candidate.userId,
        awardType,
        awardYear:     year,
        awardMonth:    month,
        scoreSnapshot: {
          avg_total:     candidate.avgTotal,
          avg_delivery:  candidate.avgDelivery,
          avg_quality:   candidate.avgQuality,
          avg_regularity:candidate.avgRegularity,
          days_count:    candidate.daysCount,
        },
      })
      setGrantSuccess(awardType)
      setTimeout(() => setGrantSuccess(null), 2500)
    } catch (e) {
    } finally {
      setGrantingType(null)
    }
  }

  async function handleRevoke(award) {
    if (!isManager) return
    try {
      await revokeAward.mutateAsync({ awardId: award.id, awardYear: year, awardMonth: month })
    } catch (e) {
    }
  }

  const awardTypes = isManager
    ? ['star_of_month', 'top_delivery', 'most_improved', 'lowest_performer']
    : ['star_of_month', 'top_delivery', 'most_improved']

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="space-y-5"
    >
      {/* Sélecteur de mois */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <ChevronLeft size={15} />
          Mois préc.
        </button>
        <span className="text-base font-bold text-white">
          {formatAwardMonth(year, month)}
        </span>
        <button
          onClick={onNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Mois suiv.
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Données insuffisantes */}
      {!isLoading && leaderboard.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Trophy size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Aucune donnée de performance pour ce mois.</p>
          <p className="text-white/30 text-xs mt-1">Les awards sont calculés à partir des journaux PULSE.</p>
        </div>
      )}

      {/* Grille des awards */}
      {!isLoading && leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {awardTypes.map(type => {
            const config    = AWARD_TYPES[type]
            const existing  = awards.find(a => a.award_type === type)
            const candidate = candidates[type]

            return (
              <AwardSlot
                key={type}
                config={config}
                existing={existing}
                candidate={candidate}
                isManager={isManager}
                isGranting={grantingType === type}
                isSuccess={grantSuccess === type}
                isPastMonth={isPastMonth}
                onGrant={() => handleGrant(type, candidate)}
                onRevoke={() => handleRevoke(existing)}
              />
            )
          })}
        </div>
      )}

      {/* Classement du mois (mini) */}
      {!isLoading && leaderboard.length > 0 && (
        <LeaderboardMini leaderboard={leaderboard} />
      )}
    </motion.div>
  )
}

// ─── SLOT D'UN AWARD ─────────────────────────────────────────
function AwardSlot({ config, existing, candidate, isManager, isGranting, isSuccess, isPastMonth, onGrant, onRevoke }) {
  const hasExisting = !!existing
  const hasCandidate = !!candidate

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: hasExisting ? `${config.color}08` : 'rgba(255,255,255,0.02)',
        border:     `1px solid ${hasExisting ? config.color + '30' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{
            background: `${config.color}15`,
            border:     `2px solid ${config.color}40`,
          }}
        >
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{config.label}</p>
          {config.confidential && (
            <span className="text-[9px] text-red-400/70 uppercase tracking-wider">Confidentiel</span>
          )}
        </div>
      </div>

      {/* Lauréat existant */}
      {hasExisting ? (
        <div className="space-y-2">
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-lg"
            style={{ background: `${config.color}10` }}
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {existing.user ? `${existing.user.first_name} ${existing.user.last_name}` : '—'}
              </p>
              {existing.user?.services?.name && (
                <p className="text-xs text-white/30">{existing.user.services.name}</p>
              )}
            </div>
            {existing.score_snapshot?.avg_total != null && (
              <span className="text-lg font-black" style={{ color: config.color }}>
                {Math.round(existing.score_snapshot.avg_total)}
              </span>
            )}
          </div>
          {isManager && (
            <button
              onClick={onRevoke}
              className="text-xs text-white/30 hover:text-red-400 transition-colors"
            >
              Révoquer l'attribution
            </button>
          )}
        </div>
      ) : (
        /* Candidat suggéré */
        <div className="space-y-2">
          {hasCandidate ? (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}
            >
              <div>
                <p className="text-xs text-white/30 mb-0.5">Candidat suggéré</p>
                <p className="text-sm font-semibold text-white/70">
                  {`${candidate.firstName} ${candidate.lastName}`}
                </p>
                {candidate.service && (
                  <p className="text-xs text-white/25">{candidate.service}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-white/50">
                  {candidate.improvement != null
                    ? `+${candidate.improvement}`
                    : Math.round(candidate.avgDelivery || candidate.avgTotal)}
                </p>
                <p className="text-[9px] text-white/25">
                  {candidate.daysCount}j
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/25 px-1">Critères d'éligibilité non atteints</p>
          )}

          {/* Bouton attribuer (managers uniquement) */}
          {isManager && hasCandidate && (
            <button
              onClick={onGrant}
              disabled={isGranting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isSuccess ? 'rgba(16,185,129,0.15)' : `${config.color}15`,
                border:     `1px solid ${isSuccess ? '#10B981' : config.color}40`,
                color:      isSuccess ? '#10B981' : config.color,
              }}
            >
              {isGranting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : isSuccess ? (
                <><Check size={13} /> Attribué !</>
              ) : (
                <>Attribuer à {candidate.firstName}</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── LEADERBOARD MINI ────────────────────────────────────────
function LeaderboardMini({ leaderboard }) {
  const top5 = leaderboard.slice(0, 5)

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <h3 className="text-sm font-semibold text-white/70 mb-4">Classement du mois</h3>
      <div className="space-y-2">
        {top5.map((u, i) => (
          <div key={u.userId} className="flex items-center gap-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
              i === 1 ? 'bg-slate-400/20 text-slate-300' :
              i === 2 ? 'bg-orange-600/20 text-orange-400' :
              'bg-white/5 text-white/30'
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate">{u.firstName} {u.lastName}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${u.avgTotal}%`,
                    background: u.avgTotal >= 70 ? PULSE_COLORS.success :
                                u.avgTotal >= 40 ? PULSE_COLORS.warning : PULSE_COLORS.danger,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-white/60 w-8 text-right">
                {u.avgTotal}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ONGLET HALL OF FAME ─────────────────────────────────────
function HallOfFame({ isManager, currentUserId }) {
  const { data: history = [], isLoading } = useHallOfFame(12)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!history.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl p-12 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Crown size={48} className="text-white/15 mx-auto mb-4" />
        <p className="text-white/40 text-sm">Aucun award attribué pour le moment.</p>
        <p className="text-white/25 text-xs mt-1">
          Naviguez vers "Mois en cours" pour attribuer les premiers awards.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="space-y-6"
    >
      {history.map((entry) => (
        <MonthBlock
          key={entry.key}
          year={entry.year}
          month={entry.month}
          awards={entry.awards}
          isManager={isManager}
        />
      ))}
    </motion.div>
  )
}

// ─── BLOC MOIS DANS HALL OF FAME ─────────────────────────────
function MonthBlock({ year, month, awards, isManager }) {
  const visibleAwards = isManager
    ? awards
    : awards.filter(a => a.award_type !== 'lowest_performer')

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-bold text-white/60">{formatAwardMonth(year, month)}</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleAwards.map(award => (
          <AwardCard key={award.id} award={award} isManager={isManager} />
        ))}
        {visibleAwards.length === 0 && (
          <p className="text-xs text-white/25 col-span-2 px-1">Aucun award public ce mois-ci.</p>
        )}
      </div>
    </div>
  )
}
