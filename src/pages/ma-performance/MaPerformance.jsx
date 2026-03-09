// ============================================================
// APEX RH — MaPerformance.jsx · S115
// Hub Mon Espace — Tableau de bord performance personnelle
// Onglets via useSearchParams(?tab=pulse|okr|entretiens|feedback)
// StatCard KPIs · GLASS_STYLE · Max 400 lignes
// ============================================================
import { useSearchParams }                  from 'react-router-dom'
import { motion }                           from 'framer-motion'
import {
  Activity, Target, CheckCircle2, MessageSquare,
  Calendar, Star, Users,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE,
} from '../../utils/constants'
import StatCard   from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'

import { useAuth }             from '../../contexts/AuthContext'
import { useAppSettings }      from '../../hooks/useSettings'
import { isPulseEnabled }      from '../../lib/pulseHelpers'
import { useTodayScore }       from '../../hooks/usePulse'
import { getPeriodDates, useUserScoreHistory } from '../../hooks/usePerformanceScores'
import { useActiveOKRPeriods } from '../../hooks/useOkrPeriods'
import { useObjectives }       from '../../hooks/useObjectives'
import {
  useMyReviews,
  ANNUAL_REVIEW_STATUS_LABELS,
  ANNUAL_REVIEW_STATUS_COLORS,
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
} from '../../hooks/useAnnualReviews'
import {
  useFeedbackReceived,
  computeAverageScores,
  FEEDBACK_QUESTIONS,
} from '../../hooks/useFeedback360'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'pulse',      label: 'Pulse',       icon: Activity,      color: '#4F46E5' },
  { id: 'okr',        label: 'OKR',         icon: Target,        color: '#10B981' },
  { id: 'entretiens', label: 'Entretiens',  icon: Users,        color: '#F59E0B' },
  { id: 'feedback',   label: 'Feedback',    icon: MessageSquare, color: '#EC4899' },
]
const DEFAULT_TAB = 'pulse'

// ─── PANEL PULSE ─────────────────────────────────────────────
function PulsePanel({ pulseOn }) {
  const { startDate, endDate } = getPeriodDates('month')
  const { data: scores = [], isLoading } = useUserScoreHistory(null, startDate, endDate)
  const { data: today } = useTodayScore()

  if (!pulseOn) return (
    <EmptyState icon={Activity} title="PULSE désactivé"
      description="Activez PULSE dans les Paramètres pour accéder à votre tableau de bord." />
  )
  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const nonNull = scores.filter(s => s.total_score != null)
  const avg = nonNull.length
    ? Math.round(nonNull.reduce((a, s) => a + s.total_score, 0) / nonNull.length)
    : null

  const todayDims = today ? [
    { label: 'Exécution',  v: today.score_delivery   ?? 0, c: '#4F46E5' },
    { label: 'Qualité',    v: today.score_quality    ?? 0, c: '#10B981' },
    { label: 'Régularité', v: today.score_regularity ?? 0, c: '#F59E0B' },
    { label: 'Bonus',      v: today.score_bonus      ?? 0, c: '#EC4899' },
  ] : []

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={GLASS_STYLE_STRONG}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Score du jour</p>
        {today ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black" style={{ color: '#4F46E5' }}>{today.score_total ?? 0}%</span>
              <span className="text-sm text-white/40">Score global</span>
            </div>
            {todayDims.map(d => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="text-[11px] text-white/40 w-20">{d.label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.v}%`, background: d.c }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: d.c }}>{d.v}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30">Aucun score enregistré aujourd'hui.</p>
        )}
      </div>

      <div className="rounded-2xl p-5" style={GLASS_STYLE}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          Évolution du mois ({scores.length} jours)
        </p>
        {scores.length > 0 ? (
          <div className="space-y-1.5">
            {scores.slice(-10).map(s => {
              const pct = s.total_score ?? 0
              const c = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30 w-16">
                    {new Date(s.score_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                  </div>
                  <span className="text-[10px] font-bold w-8 text-right" style={{ color: c }}>{pct}%</span>
                </div>
              )
            })}
            {avg != null && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center">
                <span className="text-[11px] text-white/30">Moyenne du mois</span>
                <span className="text-sm font-black" style={{ color: '#4F46E5' }}>{avg}%</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30">Aucun score ce mois-ci.</p>
        )}
      </div>
    </div>
  )
}

// ─── PANEL OKR ───────────────────────────────────────────────
function OKRPanel() {
  const { profile } = useAuth()
  const { data: periods = [], isLoading: loadingP } = useActiveOKRPeriods()
  const activePeriodId = periods[0]?.id ?? null
  const { data: objectives = [], isLoading: loadingO } = useObjectives(activePeriodId, { owner_id: profile?.id })

  if (loadingP || loadingO) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (!activePeriodId) return <EmptyState icon={Target} title="Aucune période active" description="Aucune période OKR active pour le moment." />
  if (objectives.length === 0) return <EmptyState icon={Target} title="Aucun objectif" description="Vous n'avez pas encore d'objectifs sur cette période." />

  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-4 py-2.5 flex items-center gap-2" style={GLASS_STYLE_SUBTLE}>
        <Calendar size={12} className="text-emerald-400" />
        <span className="text-[11px] text-white/40">{periods[0]?.name}</span>
        <span className="ml-auto text-[10px] text-emerald-400">{objectives.length} objectif{objectives.length > 1 ? 's' : ''}</span>
      </div>
      {objectives.map(obj => {
        const krs = obj.key_results ?? []
        const progress = krs.length
          ? Math.round(krs.reduce((s, kr) => s + (kr.score ?? 0), 0) / krs.length)
          : 0
        const c = progress >= 80 ? '#10B981' : progress >= 50 ? '#F59E0B' : '#EF4444'
        return (
          <div key={obj.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-white/80 leading-snug">{obj.title}</p>
              <span className="text-xs font-black flex-shrink-0" style={{ color: c }}>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: c }} />
            </div>
            <p className="text-[10px] text-white/30">{krs.length} résultat{krs.length > 1 ? 's' : ''} clé{krs.length > 1 ? 's' : ''}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL ENTRETIENS ─────────────────────────────────────────
function EntretiensPanel() {
  const { data: reviews = [], isLoading } = useMyReviews()

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (reviews.length === 0) return <EmptyState icon={Users} title="Aucun entretien" description="Votre historique d'entretiens annuels apparaîtra ici." />

  return (
    <div className="space-y-3">
      {reviews.map(rev => {
        const statusColor = ANNUAL_REVIEW_STATUS_COLORS[rev.status] || '#6B7280'
        const ratingColor = rev.overall_rating ? OVERALL_RATING_COLORS[rev.overall_rating] : null
        return (
          <div key={rev.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold text-white/80">{rev.campaign?.title || `Entretien ${rev.campaign?.year || ''}`}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${statusColor}18`, color: statusColor }}>
                {ANNUAL_REVIEW_STATUS_LABELS[rev.status] || rev.status}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {rev.overall_rating && ratingColor && (
                <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: ratingColor }}>
                  <Star size={10} />
                  {OVERALL_RATING_LABELS[rev.overall_rating]}
                </span>
              )}
              {rev.manager && (
                <span className="text-[10px] text-white/30">
                  Manager : {rev.manager.first_name} {rev.manager.last_name}
                </span>
              )}
              <span className="text-[10px] text-white/25 ml-auto">
                {rev.created_at ? new Date(rev.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL FEEDBACK ───────────────────────────────────────────
function FeedbackPanel() {
  const { data: feedbacks = [], isLoading } = useFeedbackReceived(null)

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (feedbacks.length === 0) return <EmptyState icon={MessageSquare} title="Aucun feedback reçu" description="Les feedbacks 360° validés apparaîtront ici." />

  const allResponses = feedbacks.flatMap(f => f.responses ?? [])
  const avgScores = computeAverageScores(allResponses)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={GLASS_STYLE_STRONG}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          Scores moyens ({feedbacks.length} feedback{feedbacks.length > 1 ? 's' : ''})
        </p>
        <div className="space-y-2.5">
          {FEEDBACK_QUESTIONS.map(q => {
            const score = avgScores[q.key]
            const pct = score != null ? Math.round((score / 5) * 100) : null
            const c = pct != null ? (pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444') : '#6B7280'
            return (
              <div key={q.key} className="flex items-center gap-3">
                <span className="text-base w-6">{q.icon}</span>
                <span className="text-[11px] text-white/50 flex-1">{q.label}</span>
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {pct != null && <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />}
                </div>
                <span className="text-[11px] font-bold w-8 text-right" style={{ color: c }}>
                  {score != null ? score.toFixed(1) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        {feedbacks.slice(0, 5).map(fb => (
          <div key={fb.id} className="rounded-2xl p-3.5 flex items-center gap-3" style={GLASS_STYLE}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(236,72,153,0.12)' }}>
              <MessageSquare size={12} style={{ color: '#EC4899' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/60 font-medium truncate">{fb.campaign?.title || 'Feedback'}</p>
              <p className="text-[10px] text-white/30">
                {fb.evaluator ? `De : ${fb.evaluator.first_name} ${fb.evaluator.last_name}` : 'Anonyme'}
                {fb.submitted_at && ` · ${new Date(fb.submitted_at).toLocaleDateString('fr-FR')}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HOOK KPIs STATS ─────────────────────────────────────────
function useMaPerformanceStats() {
  const { profile } = useAuth()
  const { startDate, endDate } = getPeriodDates('month')
  const { data: scores = [] }     = useUserScoreHistory(null, startDate, endDate)
  const { data: periods = [] }    = useActiveOKRPeriods()
  const activePeriodId            = periods[0]?.id ?? null
  const { data: objectives = [] } = useObjectives(activePeriodId, { owner_id: profile?.id })
  const { data: reviews = [] }    = useMyReviews()

  const nonNull  = scores.filter(s => s.total_score != null)
  const avgPulse = nonNull.length
    ? Math.round(nonNull.reduce((a, s) => a + s.total_score, 0) / nonNull.length)
    : null

  const okrAtteints = objectives.filter(obj => {
    const krs = obj.key_results ?? []
    return krs.length > 0 && (krs.reduce((s, kr) => s + (kr.score ?? 0), 0) / krs.length) >= 80
  }).length

  const entretiensCompletes = reviews.filter(r => ['completed', 'signed'].includes(r.status)).length

  return { avgPulse, okrAtteints, okrTotal: objectives.length, entretiensCompletes }
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MaPerformance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { data: settings } = useAppSettings()
  const pulseOn = isPulseEnabled(settings)

  const { avgPulse, okrAtteints, okrTotal, entretiensCompletes } = useMaPerformanceStats()

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Ma Performance</h1>
        <p className="text-sm text-white/40">Pulse · OKR · Entretiens · Feedback 360°</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Activity}     label="Score pulse moyen"    value={avgPulse != null ? `${avgPulse}%` : '—'} color="#4F46E5" />
        <StatCard icon={Target}       label="OKR atteints"         value={okrTotal > 0 ? `${okrAtteints}/${okrTotal}` : '—'} color="#10B981" />
        <StatCard icon={CheckCircle2} label="Entretiens complétés" value={entretiensCompletes} color="#F59E0B" />
      </div>

      <div className="flex gap-1 p-1 rounded-2xl" style={GLASS_STYLE_SUBTLE}>
        {TABS.map(tab => {
          const active = tab.id === activeTab
          const Icon   = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200"
              style={active
                ? { background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}30` }
                : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
              }
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {activeTab === 'pulse'      && <PulsePanel      pulseOn={pulseOn} />}
        {activeTab === 'okr'        && <OKRPanel />}
        {activeTab === 'entretiens' && <EntretiensPanel />}
        {activeTab === 'feedback'   && <FeedbackPanel />}
      </motion.div>
    </div>
  )
}
