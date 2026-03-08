// ============================================================
// APEX RH — src/pages/pulse/Gamification.jsx
// Session 31 — Module Gamification Avancée
// Vue collaborateur : streak, niveau, badges, classement service
// Vue manager : classement inter-équipes + stats gamification
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import {
  BADGES,
  LEVELS,
  POINTS_CONFIG,
  getBadgeByKey,
  computeLevel,
  useMyStreak,
  useMyPoints,
  useMyBadges,
  useInterTeamLeaderboard,
  useServiceLeaderboard,
  useTeamGamifStats,
  useSyncGamification,
} from '../../hooks/useGamification'

// ─── HELPERS ─────────────────────────────────────────────────

function now() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function getScoreColor(score) {
  if (score == null) return '#6B7280'
  if (score >= 75) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

// ─── COMPOSANTS UI ───────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
      {children}
    </h3>
  )
}

// ─── COMPOSANT : STREAK COUNTER ───────────────────────────────

function StreakCounter({ streak }) {
  const { current, max } = streak || { current: 0, max: 0 }
  const flames = Math.min(Math.floor(current / 3), 5)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Streak actuel</div>
          <div className="flex items-end gap-2">
            <span
              className="text-5xl font-black"
              style={{ color: current >= 7 ? '#F59E0B' : current >= 3 ? '#F97316' : '#6B7280' }}
            >
              {current}
            </span>
            <span className="text-gray-400 text-sm mb-2">jours consécutifs</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-3xl" aria-hidden>
            {current === 0 ? '💤' : current >= 30 ? '💫' : current >= 7 ? '⚡' : '🔥'}
          </div>
          <div className="text-xs text-gray-500">Record : {max} jours</div>
        </div>
      </div>

      {/* Barre de flammes */}
      {current > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: i < flames
                  ? 'linear-gradient(90deg, #F97316, #FBBF24)'
                  : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
          <span className="text-xs text-gray-500 ml-2 shrink-0">
            {current >= 7 ? '🔥 En feu !' : current >= 3 ? '🌡 Chaud' : '🌱 Démarrage'}
          </span>
        </div>
      )}

      {current === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Soumettez votre journal pour démarrer ou relancer votre streak.
        </p>
      )}
    </Card>
  )
}

// ─── COMPOSANT : NIVEAU ET PROGRESSION ───────────────────────

function LevelCard({ totalPoints }) {
  const { current, next, progress } = computeLevel(totalPoints)

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Niveau</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.icon}</span>
            <span className="text-xl font-bold text-white">{current.label}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${current.color}22`, color: current.color }}
            >
              Niv. {current.level}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-indigo-400">{totalPoints}</div>
          <div className="text-xs text-gray-500">points</div>
        </div>
      </div>

      {next && (
        <>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{current.minPoints} pts</span>
            <span>{next.label} — {next.minPoints} pts</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${current.color}, ${next.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {next.minPoints - totalPoints} points pour atteindre <strong style={{ color: next.color }}>{next.label}</strong>
          </p>
        </>
      )}

      {!next && (
        <div
          className="mt-2 text-xs text-center py-1.5 rounded-lg font-medium"
          style={{ background: 'rgba(201,162,39,0.15)', color: '#C9A227' }}
        >
          🏆 Niveau maximum atteint — Félicitations !
        </div>
      )}
    </Card>
  )
}

// ─── COMPOSANT : CARTE BADGE ──────────────────────────────────

function BadgeCard({ badge, earned, earnedAt }) {
  const TIER_LABELS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border p-4 flex flex-col items-center text-center gap-2 relative"
      style={{
        background: earned ? badge.tierBg : 'rgba(255,255,255,0.02)',
        borderColor: earned ? `${badge.tierColor}40` : 'rgba(255,255,255,0.06)',
        opacity: earned ? 1 : 0.45,
      }}
    >
      {/* Tier label */}
      <span
        className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full font-semibold"
        style={{
          background: `${badge.tierColor}22`,
          color: badge.tierColor,
          fontSize: '0.6rem',
        }}
      >
        {TIER_LABELS[badge.tier]}
      </span>

      <span className="text-3xl" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>
        {badge.icon}
      </span>
      <div className="font-semibold text-sm text-white leading-tight">{badge.label}</div>
      <div className="text-xs text-gray-500 leading-snug">{badge.desc}</div>
      <div
        className="text-xs font-medium mt-1"
        style={{ color: earned ? badge.tierColor : '#4B5563' }}
      >
        {earned
          ? `✓ Obtenu ${earnedAt ? `— ${new Date(earnedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}`
          : `+${badge.points} pts`}
      </div>
    </motion.div>
  )
}

// ─── COMPOSANT : CLASSEMENT SERVICE ──────────────────────────

function ServiceLeaderboard({ serviceId, year, month, currentUserId }) {
  const { data: board = [], isLoading } = useServiceLeaderboard(serviceId, year, month)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (board.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Aucune donnée ce mois-ci.
      </div>
    )
  }

  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div className="flex flex-col gap-2">
      {board.map((member, i) => {
        const isMe = member.id === currentUserId
        const scoreColor = getScoreColor(member.avgScore)
        return (
          <div
            key={member.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all"
            style={{
              background: isMe ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
              border: isMe ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}
          >
            <div className="w-7 text-center text-sm font-bold" style={{ color: i < 3 ? '#C9A227' : '#6B7280' }}>
              {i < 3 ? MEDALS[i] : `${i + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white truncate">{member.name}</span>
                {isMe && <span className="text-xs text-indigo-400">(moi)</span>}
              </div>
              <div className="text-xs text-gray-500">{member.nbLogs} journaux</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">{member.totalPoints} pts</div>
              <div
                className="text-sm font-bold w-8 text-right"
                style={{ color: scoreColor }}
              >
                {member.avgScore}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── COMPOSANT : CLASSEMENT INTER-ÉQUIPES ────────────────────

function InterTeamLeaderboard({ year, month }) {
  const { data: board = [], isLoading } = useInterTeamLeaderboard(year, month)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (board.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Aucun journal soumis ce mois-ci. Les données apparaîtront dès les premières soumissions.
      </div>
    )
  }

  const maxScore = board[0]?.avgScore || 100
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div className="flex flex-col gap-3">
      {board.map((svc, i) => {
        const scoreColor = getScoreColor(svc.avgScore)
        const barWidth = maxScore > 0 ? (svc.avgScore / maxScore) * 100 : 0
        return (
          <div key={svc.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-7 text-center text-sm font-bold" style={{ color: i < 3 ? '#C9A227' : '#6B7280' }}>
                {i < 3 ? MEDALS[i] : `${i + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white truncate">{svc.name}</span>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs text-gray-500">{svc.nbLogs} logs</span>
                    <span className="text-sm font-bold" style={{ color: scoreColor }}>{svc.avgScore}</span>
                  </div>
                </div>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: scoreColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── COMPOSANT : STATS ÉQUIPE (manager) ──────────────────────

function TeamGamifStatsCard({ serviceId }) {
  const { data: stats, isLoading } = useTeamGamifStats(serviceId)

  if (isLoading || !stats) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Total badges équipe', value: stats.totalBadges, icon: '🏅', color: '#C9A227' },
        { label: 'Points moyens/personne', value: stats.avgPoints, icon: '⭐', color: '#8B5CF6' },
      ].map(item => (
        <Card key={item.label}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
          <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
        </Card>
      ))}
    </div>
  )
}

// ─── BOUTON SYNCHRONISATION ──────────────────────────────────

function SyncButton({ onSync }) {
  const { mutate: sync, isPending, isSuccess } = useSyncGamification()
  const [justSynced, setJustSynced] = useState(false)

  function handleSync() {
    sync(undefined, {
      onSuccess: (result) => {
        setJustSynced(true)
        if (onSync) onSync(result)
        setTimeout(() => setJustSynced(false), 3000)
      },
    })
  }

  return (
    <button
      onClick={handleSync}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
      style={{
        background: justSynced ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
        color: justSynced ? '#10B981' : '#818CF8',
        border: `1px solid ${justSynced ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
      }}
    >
      {isPending ? (
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      ) : justSynced ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
      {justSynced ? 'Synchronisé !' : isPending ? 'Calcul en cours...' : 'Mettre à jour mes stats'}
    </button>
  )
}

// ─── NOTIFICATION NOUVEAU BADGE ──────────────────────────────

function NewBadgeToast({ badges, onClose }) {
  useEffect(() => {
    if (badges.length > 0) {
      const t = setTimeout(onClose, 5000)
      return () => clearTimeout(t)
    }
  }, [badges, onClose])

  if (!badges.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-6 right-6 z-50 rounded-2xl border px-5 py-4 shadow-2xl max-w-xs"
      style={{
        background: 'rgba(17,17,27,0.97)',
        borderColor: 'rgba(201,162,39,0.4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">🏅</span>
        <div>
          <div className="text-sm font-bold text-white">
            {badges.length === 1 ? 'Nouveau badge obtenu !' : `${badges.length} nouveaux badges !`}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {badges.map(k => getBadgeByKey(k)?.label).filter(Boolean).join(', ')}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white ml-1 mt-0.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// ─── VUE COLLABORATEUR ───────────────────────────────────────

function CollaborateurView({ profile }) {
  const { year, month } = now()
  const [newBadges, setNewBadges]   = useState([])
  const [toastOpen, setToastOpen]   = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  const { data: streakData, isLoading: streakLoading } = useMyStreak()
  const { data: pointsData, isLoading: pointsLoading } = useMyPoints()
  const { data: badgesData = [], isLoading: badgesLoading } = useMyBadges()

  const totalPoints = pointsData?.total || 0
  const earnedKeys  = new Set(badgesData.map(b => b.badge_key))

  function handleSync(result) {
    if (result?.newBadges?.length) {
      setNewBadges(result.newBadges)
      setToastOpen(true)
    }
  }

  const SECTIONS = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'badges', label: `Badges (${earnedKeys.size}/${BADGES.length})` },
    { id: 'classement', label: 'Classement équipe' },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Ma Gamification</h2>
          <p className="text-sm text-gray-500 mt-0.5">Streaks, badges et points rewards</p>
        </div>
        <SyncButton onSync={handleSync} />
      </div>

      {/* Nav sections */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeSection === s.id ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: activeSection === s.id ? '#A5B4FC' : '#6B7280',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* VUE : Overview */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {streakLoading || pointsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <StreakCounter streak={streakData} />
              <LevelCard totalPoints={totalPoints} />

              {/* Résumé points */}
              {Object.keys(pointsData?.byReason || {}).length > 0 && (
                <Card>
                  <SectionTitle>Comment j'ai gagné mes points</SectionTitle>
                  <div className="space-y-2">
                    {[
                      { key: 'journal_submitted', label: 'Journaux soumis', icon: '📓' },
                      { key: 'brief_submitted', label: 'Briefs soumis', icon: '🌅' },
                      { key: 'score_excellent', label: 'Scores excellents (≥70)', icon: '⭐' },
                      { key: 'badge_first_journal', label: 'Badge Premier Journal', icon: '🌱' },
                      { key: 'badge_streak_3', label: 'Badge Streak 3 jours', icon: '🔥' },
                      { key: 'badge_streak_7', label: 'Badge Streak 7 jours', icon: '⚡' },
                      { key: 'badge_streak_30', label: 'Badge Sprint du Mois', icon: '💫' },
                    ]
                      .filter(r => (pointsData.byReason[r.key] || 0) > 0)
                      .map(r => (
                        <div key={r.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{r.icon}</span>
                            <span className="text-sm text-gray-300">{r.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-indigo-400">
                            +{pointsData.byReason[r.key]} pts
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </Card>
              )}

              {/* Prochains badges à obtenir */}
              <Card>
                <SectionTitle>Prochains badges à débloquer</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  {BADGES.filter(b => !earnedKeys.has(b.key)).slice(0, 4).map(badge => (
                    <BadgeCard key={badge.key} badge={badge} earned={false} />
                  ))}
                </div>
                {BADGES.filter(b => !earnedKeys.has(b.key)).length === 0 && (
                  <div className="text-center py-4 text-yellow-400 font-semibold">
                    🏆 Tous les badges obtenus — Champion absolu !
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* VUE : Badges */}
      {activeSection === 'badges' && (
        <div className="space-y-4">
          {earnedKeys.size > 0 && (
            <div>
              <SectionTitle>Badges obtenus ({earnedKeys.size})</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {badgesData.map(eb => {
                  const badge = getBadgeByKey(eb.badge_key)
                  if (!badge) return null
                  return <BadgeCard key={eb.badge_key} badge={badge} earned earnedAt={eb.earned_at} />
                })}
              </div>
            </div>
          )}

          {BADGES.filter(b => !earnedKeys.has(b.key)).length > 0 && (
            <div>
              <SectionTitle>Badges à débloquer</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {BADGES.filter(b => !earnedKeys.has(b.key)).map(badge => (
                  <BadgeCard key={badge.key} badge={badge} earned={false} />
                ))}
              </div>
            </div>
          )}

          {badgesLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* VUE : Classement équipe */}
      {activeSection === 'classement' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Classement de mon équipe</SectionTitle>
              <span className="text-xs text-gray-500">
                {new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <ServiceLeaderboard
              serviceId={profile?.service_id}
              year={year}
              month={month}
              currentUserId={profile?.id}
            />
          </Card>
        </div>
      )}

      {/* Toast nouveaux badges */}
      <AnimatePresence>
        {toastOpen && (
          <NewBadgeToast
            badges={newBadges}
            onClose={() => setToastOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── VUE MANAGER ─────────────────────────────────────────────

function ManagerView({ profile }) {
  const { year, month } = now()
  const [activeTab, setActiveTab] = useState('inter-teams')

  const TABS = [
    { id: 'inter-teams', label: '🏆 Classement inter-équipes' },
    { id: 'my-team', label: '👥 Mon équipe' },
  ]

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Gamification — Vue Manager</h2>
          <p className="text-sm text-gray-500 mt-0.5">Classements et stats de gamification</p>
        </div>
        <div
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}
        >
          {new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === t.id ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: activeTab === t.id ? '#A5B4FC' : '#6B7280',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Classement inter-équipes */}
      {activeTab === 'inter-teams' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Score PULSE moyen par service</SectionTitle>
              <span className="text-xs text-gray-500">Mois en cours</span>
            </div>
            <InterTeamLeaderboard year={year} month={month} />
          </Card>

          <Card>
            <SectionTitle>Comment est calculé le classement ?</SectionTitle>
            <div className="text-xs text-gray-400 space-y-1 leading-relaxed">
              <p>• Chaque service est noté par la <strong className="text-gray-300">moyenne des scores PULSE</strong> de ses membres ce mois-ci.</p>
              <p>• Seuls les journaux avec un score calculé sont pris en compte.</p>
              <p>• Le nombre de journaux soumis reflète la participation.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Mon équipe */}
      {activeTab === 'my-team' && (
        <div className="space-y-4">
          <TeamGamifStatsCard serviceId={profile?.service_id} />

          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Classement de mon service</SectionTitle>
            </div>
            <ServiceLeaderboard
              serviceId={profile?.service_id}
              year={year}
              month={month}
              currentUserId={profile?.id}
            />
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function GamificationPage() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManageTeam = can('pulse', 'team', 'read')

  return (
    <div className="min-h-full">
      {isManager
        ? <ManagerView profile={profile} />
        : <CollaborateurView profile={profile} />
      }
    </div>
  )
}
