// ============================================================
// APEX RH — components/entretiens/ReviewManagerDashboard.jsx
// Session 80 — Tableau de bord suivi managérial
// ============================================================
import { useState } from 'react'
import {
  BarChart3, Users, CheckCircle, AlertTriangle, Clock,
  Filter, ChevronRight, Loader2, Calendar, Star,
} from 'lucide-react'
import {
  useReviewCompletionStats,
  useTeamReviews,
  useActiveCampaigns,
  ANNUAL_REVIEW_STATUS_LABELS,
  ANNUAL_REVIEW_STATUS_COLORS,
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  isDeadlineOverdue,
  getDaysUntilDeadline,
} from '../../hooks/useAnnualReviews'
import { useAuth } from '../../contexts/AuthContext'

// ─── Stat card ───────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon, sub }) {
  return (
    <div className="rounded-xl p-3 space-y-1"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{label}</p>
        <Icon size={14} style={{ color }}/>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────

function ProgressBar({ value, color = '#6366F1', label }) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-1.5 rounded-full transition-all"
          style={{ width: `${Math.min(100, value)}%`, background: color }}/>
      </div>
    </div>
  )
}

// ─── Review row ───────────────────────────────────────────────

function ReviewRow({ review, campaign }) {
  const overdue = campaign?.manager_eval_deadline
    && isDeadlineOverdue(campaign.manager_eval_deadline)
    && !['completed','signed','archived'].includes(review.status)

  const daysLeft = campaign?.manager_eval_deadline
    ? getDaysUntilDeadline(campaign.manager_eval_deadline)
    : null

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors hover:bg-white/[0.02]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}>
        {review.employee?.first_name?.[0]}{review.employee?.last_name?.[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {review.employee?.first_name} {review.employee?.last_name}
        </p>
        <p className="text-xs text-white/35 truncate">
          {review.campaign?.title || campaign?.title}
          {review.review_type === 'mid_year' && (
            <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>Mi-année</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Statut */}
        <span className="text-xs rounded-full px-2 py-0.5"
          style={{
            background: `${ANNUAL_REVIEW_STATUS_COLORS[review.status]}15`,
            color: ANNUAL_REVIEW_STATUS_COLORS[review.status],
          }}>
          {ANNUAL_REVIEW_STATUS_LABELS[review.status]}
        </span>

        {/* Retard */}
        {overdue && (
          <span className="text-xs rounded-full px-2 py-0.5 flex items-center gap-1"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            <AlertTriangle size={10}/> En retard
          </span>
        )}

        {/* Note */}
        {review.overall_rating && (
          <span className="text-xs font-semibold" style={{ color: OVERALL_RATING_COLORS[review.overall_rating] }}>
            {OVERALL_RATING_LABELS[review.overall_rating]}
          </span>
        )}

        {/* Délai */}
        {daysLeft !== null && !overdue && daysLeft <= 7 && daysLeft >= 0 && (
          <span className="text-xs text-amber-400">{daysLeft}j</span>
        )}
      </div>
    </div>
  )
}

// ─── Campaign block ───────────────────────────────────────────

function CampaignBlock({ stat }) {
  const completionColor = stat.completion_pct >= 80 ? '#10B981'
    : stat.completion_pct >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <p className="text-sm font-semibold text-white">{stat.campaign_title}</p>
          <p className="text-xs text-white/35">{stat.campaign_year}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color: completionColor }}>{stat.completion_pct}%</p>
          <p className="text-xs text-white/35">complétion</p>
        </div>
      </div>

      <div className="px-4 py-2">
        <ProgressBar value={stat.completion_pct} color={completionColor}/>
      </div>

      <div className="grid grid-cols-4 gap-0 px-4 pb-3">
        {[
          { label: 'Total', value: stat.total_reviews, color: '#6B7280' },
          { label: 'En cours', value: stat.pending_count + stat.self_submitted, color: '#F59E0B' },
          { label: 'Complétés', value: stat.completed_count, color: '#10B981' },
          { label: 'En retard', value: stat.overdue_count, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="text-center py-1">
            <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-white/30">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────

export default function ReviewManagerDashboard() {
  const { profile } = useAuth()
  const [filter, setFilter] = useState('all')

  const { data: stats = [], isLoading: statsLoading } = useReviewCompletionStats(profile?.id)
  const { data: campaigns = [] } = useActiveCampaigns()
  const activeCampaign = campaigns[0]
  const { data: reviews = [], isLoading: reviewsLoading } = useTeamReviews(activeCampaign?.id)

  const filtered = reviews.filter(r => {
    if (filter === 'pending') return ['pending','self_in_progress'].includes(r.status)
    if (filter === 'overdue') return isDeadlineOverdue(activeCampaign?.manager_eval_deadline)
      && !['completed','signed','archived'].includes(r.status)
    if (filter === 'done') return ['completed','signed'].includes(r.status)
    return true
  })

  const totalReviews   = reviews.length
  const pending        = reviews.filter(r => ['pending','self_in_progress'].includes(r.status)).length
  const selfSubmitted  = reviews.filter(r => r.status === 'self_submitted').length
  const completed      = reviews.filter(r => ['completed','signed'].includes(r.status)).length
  const overdue        = reviews.filter(r =>
    isDeadlineOverdue(activeCampaign?.manager_eval_deadline)
    && !['completed','signed','archived'].includes(r.status)
  ).length

  if (statsLoading || reviewsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-white/30"/>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 size={16} style={{ color: '#818CF8' }}/>
        <h3 className="text-sm font-bold text-white">Suivi de campagne</h3>
      </div>

      {/* Stats rapides campagne en cours */}
      {activeCampaign ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Entretiens"  value={totalReviews} color="#818CF8" icon={Users}/>
            <StatCard label="En attente"  value={pending}      color="#F59E0B" icon={Clock}
              sub={selfSubmitted > 0 ? `${selfSubmitted} auto-éval soumise` : undefined}/>
            <StatCard label="Complétés"   value={completed}    color="#10B981" icon={CheckCircle}
              sub={totalReviews > 0 ? `${Math.round(completed/totalReviews*100)}%` : undefined}/>
            <StatCard label="En retard"   value={overdue}      color={overdue > 0 ? '#EF4444' : '#6B7280'} icon={AlertTriangle}/>
          </div>

          {/* Barre globale */}
          {totalReviews > 0 && (
            <ProgressBar
              value={Math.round(completed/totalReviews*100)}
              color={completed/totalReviews >= 0.8 ? '#10B981' : completed/totalReviews >= 0.5 ? '#F59E0B' : '#EF4444'}
              label="Taux de complétion"
            />
          )}

          {/* Filtres */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all',     label: 'Tous',           count: totalReviews },
              { id: 'pending', label: 'En attente',      count: pending },
              { id: 'done',    label: 'Complétés',       count: completed },
              { id: 'overdue', label: 'En retard',       count: overdue },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all"
                style={{
                  background: filter === f.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  color: filter === f.id ? '#818CF8' : '#ffffff50',
                  border: `1px solid ${filter === f.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <Filter size={10}/> {f.label}
                {f.count > 0 && (
                  <span className="rounded-full w-4 h-4 flex items-center justify-center text-xs"
                    style={{ background: filter === f.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)' }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Liste entretiens */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle size={24} className="text-white/10"/>
                <p className="text-sm text-white/30">Aucun entretien dans cette catégorie.</p>
              </div>
            ) : (
              filtered.map(r => (
                <ReviewRow key={r.id} review={r} campaign={activeCampaign}/>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-10 gap-2">
          <Calendar size={28} className="text-white/10"/>
          <p className="text-sm text-white/30">Aucune campagne active en cours.</p>
        </div>
      )}

      {/* Historique par campagne */}
      {stats.length > 0 && (
        <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Historique des campagnes</p>
          {stats.map(s => (
            <CampaignBlock key={s.campaign_id} stat={s}/>
          ))}
        </div>
      )}
    </div>
  )
}
