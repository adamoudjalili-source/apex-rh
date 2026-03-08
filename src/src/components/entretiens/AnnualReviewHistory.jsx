// ============================================================
// APEX RH — components/entretiens/AnnualReviewHistory.jsx
// Session 60 — Historique des entretiens annuels
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Star, CheckCircle, ChevronRight, Calendar,
  TrendingUp, Award, FileText, Loader2, Lock,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useMyReviews, useReview, useEmployeeReviewHistory,
  ANNUAL_REVIEW_STATUS_LABELS, ANNUAL_REVIEW_STATUS_COLORS,
  OVERALL_RATING_LABELS, OVERALL_RATING_COLORS,
  SALARY_RECOMMENDATION_LABELS,
  getReviewProgress,
} from '../../hooks/useAnnualReviews'
import AnnualReviewForm from './AnnualReviewForm'

function RatingBadge({ rating, size = 'md' }) {
  if (!rating) return <span className="text-xs text-white/30">Non noté</span>
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sz}`}
      style={{ background: `${OVERALL_RATING_COLORS[rating]}18`, color: OVERALL_RATING_COLORS[rating], border: `1px solid ${OVERALL_RATING_COLORS[rating]}35` }}>
      <Star size={size === 'sm' ? 10 : 13} fill={OVERALL_RATING_COLORS[rating]}/>
      {OVERALL_RATING_LABELS[rating]}
    </span>
  )
}

function ReviewTimeline({ reviews }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-4 bottom-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }}/>
      <div className="space-y-4">
        {reviews.map((r, i) => {
          const year = r.campaign?.year
          const status = r.status
          const isDone = ['completed', 'signed', 'archived'].includes(status)
          return (
            <div key={r.id} className="flex items-start gap-4 pl-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{
                  background: isDone ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isDone ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {isDone ? <CheckCircle size={14} style={{ color: '#10B981' }}/> : <Clock size={14} className="text-white/30"/>}
              </div>
              <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.campaign?.title ?? `Entretien ${year}`}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {r.manager ? `Manager : ${r.manager.first_name} ${r.manager.last_name}` : ''}
                      {r.completed_at ? ` · Complété le ${new Date(r.completed_at).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                  <RatingBadge rating={r.overall_rating} size="sm"/>
                </div>
                {r.salary_recommendation && (
                  <p className="text-xs text-white/40 mt-2">
                    Reco salariale : <span className="text-white/60">{SALARY_RECOMMENDATION_LABELS[r.salary_recommendation]}</span>
                    {r.salary_increase_pct ? ` (+${r.salary_increase_pct}%)` : ''}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {r.employee_signed_at && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={11}/> Signé collab
                    </span>
                  )}
                  {r.manager_signed_at && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={11}/> Signé manager
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AnnualReviewHistory() {
  const { profile } = useAuth()
  const [selectedReview, setSelectedReview] = useState(null)

  const { data: reviews = [], isLoading } = useMyReviews()
  const { data: history } = useEmployeeReviewHistory()

  const completedReviews = reviews.filter(r => ['completed', 'signed', 'archived'].includes(r.status))

  if (selectedReview) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSelectedReview(null)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            ← Retour
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <AnnualReviewForm review={selectedReview} mode="view" onClose={() => setSelectedReview(null)}/>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/30"/>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Résumé carrière */}
      {history && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4" style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-2xl font-bold text-white">{history.total_reviews}</p>
            <p className="text-xs text-indigo-300 mt-0.5">Entretiens effectués</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.2)' }}>
            <p className="text-2xl font-bold text-white">{history.last_review_year ?? '—'}</p>
            <p className="text-xs text-amber-300 mt-0.5">Dernière année</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm font-bold" style={{ color: OVERALL_RATING_COLORS[history.last_rating] ?? '#ffffff' }}>
              {OVERALL_RATING_LABELS[history.last_rating] ?? '—'}
            </p>
            <p className="text-xs text-emerald-300 mt-0.5">Dernière évaluation</p>
          </div>
        </div>
      )}

      {/* Évolution rating */}
      {completedReviews.length > 1 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Évolution des notes</p>
          <div className="flex items-end gap-4 overflow-x-auto pb-1">
            {completedReviews.slice(0, 8).reverse().map(r => {
              const SCORES = { insuffisant: 1, a_ameliorer: 2, satisfaisant: 3, bien: 4, excellent: 5 }
              const score = SCORES[r.overall_rating] ?? 0
              const height = score > 0 ? `${(score / 5) * 100}%` : '10%'
              const color = OVERALL_RATING_COLORS[r.overall_rating] ?? '#6B7280'
              return (
                <div key={r.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-10 flex flex-col justify-end" style={{ height: 60 }}>
                    <div className="w-full rounded-t-md transition-all" style={{ height: height, background: color, minHeight: 4 }}/>
                  </div>
                  <p className="text-xs text-white/40">{r.campaign?.year ?? '?'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <FileText size={32} className="text-white/15"/>
          <p className="text-sm text-white/35">Aucun entretien annuel dans votre historique.</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Tous vos entretiens</p>
          <ReviewTimeline reviews={reviews}/>
        </div>
      )}
    </div>
  )
}
