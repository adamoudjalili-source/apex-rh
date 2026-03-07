// ============================================================
// APEX RH — components/entretiens/AnnualReviewDashboard.jsx
// Session 60 — Vue manager : Tableau de bord entretiens équipe
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, ChevronRight, Calendar, CheckCircle, Clock,
  AlertCircle, Filter, Search, Star, TrendingUp,
  MessageSquare, Loader2, Edit3, Eye,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useTeamReviews, useManagerPendingReviews, useActiveCampaigns,
  ANNUAL_REVIEW_STATUS_LABELS, ANNUAL_REVIEW_STATUS_COLORS,
  OVERALL_RATING_LABELS, OVERALL_RATING_COLORS,
  getReviewProgress, isDeadlineSoon, isDeadlineOverdue,
} from '../../hooks/useAnnualReviews'
import AnnualReviewForm from './AnnualReviewForm'

// ─── Composants utilitaires ───────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `${ANNUAL_REVIEW_STATUS_COLORS[status]}18`,
        color: ANNUAL_REVIEW_STATUS_COLORS[status],
        border: `1px solid ${ANNUAL_REVIEW_STATUS_COLORS[status]}35`,
      }}>
      {ANNUAL_REVIEW_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function RatingBadge({ rating }) {
  if (!rating) return <span className="text-xs text-white/30">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: `${OVERALL_RATING_COLORS[rating]}18`,
        color: OVERALL_RATING_COLORS[rating],
      }}>
      <Star size={10} fill={OVERALL_RATING_COLORS[rating]} />
      {OVERALL_RATING_LABELS[rating]}
    </span>
  )
}

function ProgressBar({ value }) {
  const color = value >= 80 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }}/>
      </div>
      <span className="text-xs text-white/40 w-8 text-right">{value}%</span>
    </div>
  )
}

function ReviewCard({ review, onClick }) {
  const emp = review.employee
  const fullName = [emp?.first_name, emp?.last_name].filter(Boolean).join(' ')
  const initials = (emp?.first_name?.[0] ?? '') + (emp?.last_name?.[0] ?? '')
  const progress = getReviewProgress(review)
  const deadline = review.campaign?.manager_eval_deadline
  const urgency = isDeadlineOverdue(deadline) ? 'overdue' : isDeadlineSoon(deadline) ? 'soon' : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group rounded-xl p-4 cursor-pointer transition-all hover:translate-y-[-1px]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${urgency === 'overdue' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.2))' }}>
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{fullName}</p>
              <p className="text-xs text-white/40 mt-0.5 capitalize">{emp?.role?.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {review.overall_rating && <RatingBadge rating={review.overall_rating}/>}
              <StatusBadge status={review.status}/>
              <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors"/>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress}/>
          </div>
          {deadline && (
            <div className="mt-2 flex items-center gap-1.5">
              <Clock size={11} style={{ color: urgency === 'overdue' ? '#EF4444' : urgency === 'soon' ? '#F59E0B' : '#ffffff30' }}/>
              <span className="text-xs" style={{ color: urgency === 'overdue' ? '#EF4444' : urgency === 'soon' ? '#F59E0B' : '#ffffff30' }}>
                {urgency === 'overdue' ? 'Délai dépassé' : `Délai : ${new Date(deadline).toLocaleDateString('fr-FR')}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Composant principal ──────────────────────────────────────

export default function AnnualReviewDashboard() {
  const { profile, isAdmin } = useAuth()
  const [selectedCampaignId, setSelectedCampaignId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedReview, setSelectedReview] = useState(null)
  const [reviewMode, setReviewMode] = useState('manager')

  const { data: campaigns = [], isLoading: loadingCampaigns } = useActiveCampaigns()
  const activeCampaignId = selectedCampaignId ?? campaigns?.[0]?.id
  const { data: teamReviews = [], isLoading: loadingTeam } = useTeamReviews(activeCampaignId)
  const { data: pendingReviews = [] } = useManagerPendingReviews()

  // Filtrage
  const filtered = teamReviews.filter(r => {
    const name = [r.employee?.first_name, r.employee?.last_name].join(' ').toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  // Stats
  const total = teamReviews.length
  const pending = teamReviews.filter(r => r.status === 'pending').length
  const submitted = teamReviews.filter(r => r.status === 'self_submitted').length
  const completed = teamReviews.filter(r => ['completed', 'signed', 'archived'].includes(r.status)).length
  const signed = teamReviews.filter(r => r.status === 'signed').length

  const campaign = campaigns.find(c => c.id === activeCampaignId)

  if (selectedReview) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSelectedReview(null)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5">
            ← Retour à l'équipe
          </button>
          <span className="text-white/20">|</span>
          <span className="text-sm text-white/60">
            {[selectedReview.employee?.first_name, selectedReview.employee?.last_name].join(' ')}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <AnnualReviewForm
            review={selectedReview}
            mode={reviewMode}
            onClose={() => setSelectedReview(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Sélecteur de campagne */}
      {campaigns.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {campaigns.map(c => (
            <button key={c.id} onClick={() => setSelectedCampaignId(c.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: c.id === activeCampaignId ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${c.id === activeCampaignId ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: c.id === activeCampaignId ? '#818CF8' : '#ffffff50',
              }}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* KPI Stats */}
      {campaign && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total équipe', value: total, color: '#818CF8', icon: Users },
            { label: 'En attente', value: submitted, color: '#F59E0B', icon: Clock, badge: submitted > 0 },
            { label: 'Complétés', value: completed, color: '#10B981', icon: CheckCircle },
            { label: 'Signés', value: signed, color: '#059669', icon: Star },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <Icon size={16} style={{ color: stat.color }}/>
                  {stat.badge && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">{submitted}</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Barre de progression globale */}
      {total > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50">Progression de la campagne</span>
            <span className="text-sm font-bold text-white">{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.round((completed / total) * 100)}%`, background: 'linear-gradient(90deg, #4F46E5, #10B981)' }}/>
          </div>
          <div className="flex justify-between mt-2">
            {[
              { label: 'En attente', n: pending, color: '#6B7280' },
              { label: 'Auto-éval soumise', n: submitted, color: '#F59E0B' },
              { label: 'Complétés', n: completed - signed, color: '#10B981' },
              { label: 'Signés', n: signed, color: '#059669' },
            ].map(s => s.n > 0 && (
              <span key={s.label} className="text-xs" style={{ color: s.color }}>{s.n} {s.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={14} className="text-white/30"/>
          <input type="text" placeholder="Rechercher un collaborateur…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"/>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white/70 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="all">Tous les statuts</option>
          {Object.entries(ANNUAL_REVIEW_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Liste des reviews */}
      {loadingTeam ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-white/30"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Users size={32} className="text-white/15"/>
          <p className="text-sm text-white/35">
            {campaigns.length === 0 ? 'Aucune campagne d\'entretiens active.' : 'Aucun entretien trouvé.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(review => (
            <ReviewCard key={review.id} review={review} onClick={() => {
              setSelectedReview(review)
              const editable = ['self_submitted', 'meeting_scheduled', 'manager_in_progress'].includes(review.status)
              const canSign = review.status === 'completed' && !review.manager_signed_at
              setReviewMode(editable || canSign ? 'manager' : 'view')
            }}/>
          ))}
        </div>
      )}
    </div>
  )
}
