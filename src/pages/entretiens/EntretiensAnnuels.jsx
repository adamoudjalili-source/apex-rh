// ============================================================
// APEX RH — pages/entretiens/EntretiensAnnuels.jsx
// Session 60 — Entretiens annuels & Évaluation avancée
// Session 80 — +2 onglets : Auto-éval / Tableau de bord manager + mi-année
// Onglets adaptatifs rôle :
//   Collaborateur  : Mon entretien · Auto-évaluation · Historique
//   Manager        : + Mon équipe · Suivi · Mi-année
//   Admin/Directeur: + Campagnes · Calibration · Tableau de bord
// ============================================================
import { useState } from 'react'
import { lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, History, Users, Settings, BarChart3,
  Clock, CheckCircle, AlertCircle, Star,
  ChevronRight, Calendar, Loader2, Lock,
  UserCheck, CalendarRange,
} from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
import { usePermission }  from '../../hooks/usePermission'
import { useAppSettings } from '../../hooks/useSettings'
import {
  useMyReview, useActiveCampaigns, useManagerPendingReviews,
  ANNUAL_REVIEW_STATUS_LABELS, ANNUAL_REVIEW_STATUS_COLORS,
  OVERALL_RATING_LABELS, OVERALL_RATING_COLORS,
  getReviewProgress, isDeadlineSoon, isDeadlineOverdue,
} from '../../hooks/useAnnualReviews'

import AnnualReviewForm              from '../../components/entretiens/AnnualReviewForm'
import AnnualReviewDashboard         from '../../components/entretiens/AnnualReviewDashboard'
import AnnualReviewAdmin             from '../../components/entretiens/AnnualReviewAdmin'
import AnnualReviewHistory           from '../../components/entretiens/AnnualReviewHistory'
import AnnualReviewEnrichedDashboard from '../../components/entretiens/AnnualReviewEnrichedDashboard'
// S80 — nouveaux composants
import ReviewSelfAssessmentForm from '../../components/entretiens/ReviewSelfAssessmentForm'
import ReviewManagerDashboard   from '../../components/entretiens/ReviewManagerDashboard'
import MidYearCampaignPanel     from '../../components/entretiens/MidYearCampaignPanel'
import { REVIEW_STATUS, STATUS, TASK_STATUS } from '../../utils/constants'

const CalibrationPage = lazy(() => import('../intelligence/CalibrationPage'))

// S81 — Feedback 360° tab
function Feedback360Tab() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canAdmin = can('evaluations', 'cycles', 'admin')
  const { data: activeCycle } = useActiveFeedback360Cycle()
  const { data: toComplete = [], isLoading } = useMyFeedback360ToComplete(activeCycle?.id)
  const [selected, setSelected]   = useState(null)  // request en cours d'évaluation
  const [view, setView]           = useState('list') // 'list' | 'form' | 'summary' | 'trends' | 'admin'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-white/30"/>
      </div>
    )
  }

  if (view === 'form' && selected) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <button onClick={() => { setView('list'); setSelected(null) }}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-4">
          ← Retour à la liste
        </button>
        <Feedback360Form request={selected} onDone={() => { setView('list'); setSelected(null) }}/>
      </div>
    )
  }

  if (view === 'summary') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('list')}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            ← Retour
          </button>
          <div className="flex gap-2">
            <button onClick={() => setView('summary')}
              className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(129,140,248,0.15)', color: '#818CF8', border: '1px solid rgba(129,140,248,0.3)' }}>
              Ma synthèse
            </button>
            <button onClick={() => setView('trends')}
              className="text-xs px-2.5 py-1 rounded-lg text-white/40 hover:text-white/60 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              Tendances
            </button>
          </div>
        </div>
        {activeCycle ? (
          <Feedback360Summary
            evaluateeId={profile.id}
            cycleId={activeCycle.id}
            evaluateeName={`${profile.first_name} ${profile.last_name}`}/>
        ) : (
          <p className="text-sm text-white/30 text-center py-8">Aucun cycle actif.</p>
        )}
      </div>
    )
  }

  if (view === 'trends') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('list')}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            ← Retour
          </button>
          <div className="flex gap-2">
            <button onClick={() => setView('summary')}
              className="text-xs px-2.5 py-1 rounded-lg text-white/40 hover:text-white/60 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              Ma synthèse
            </button>
            <button onClick={() => setView('trends')}
              className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(129,140,248,0.15)', color: '#818CF8', border: '1px solid rgba(129,140,248,0.3)' }}>
              Tendances
            </button>
          </div>
        </div>
        <Feedback360Trends userId={profile.id}/>
      </div>
    )
  }

  if (view === 'admin' && canAdmin) {
    return (
      <div>
        <button onClick={() => setView('list')}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-4 block">
          ← Retour
        </button>
        <Feedback360CycleAdmin/>
      </div>
    )
  }

  // Liste principale
  const pending   = toComplete.filter(r => r.status !== STATUS.SUBMITTED)
  const submitted = toComplete.filter(r => r.status === STATUS.SUBMITTED)

  return (
    <div className="flex flex-col gap-4">
      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView('summary')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ background: 'rgba(129,140,248,0.1)', color: '#A5B4FC', border: '1px solid rgba(129,140,248,0.2)' }}>
          <BarChart3 size={12}/> Ma synthèse
        </button>
        <button onClick={() => setView('trends')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ background: 'rgba(129,140,248,0.1)', color: '#A5B4FC', border: '1px solid rgba(129,140,248,0.2)' }}>
          <RefreshCw size={12}/> Tendances
        </button>
        {canAdmin && (
          <button onClick={() => setView('admin')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
            <Settings size={12}/> Gérer les cycles
          </button>
        )}
      </div>

      {/* Cycle actif */}
      {activeCycle && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"/>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-green-300">{activeCycle.title}</p>
            <p className="text-xs text-white/35">
              Clôture : {new Date(activeCycle.end_date).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <span className="text-xs text-green-400/60">{pending.length} à compléter</span>
        </div>
      )}

      {/* Évaluations à compléter */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">À compléter</p>
          <div className="flex flex-col gap-2">
            {pending.map(req => (
              <button key={req.id}
                onClick={() => { setSelected(req); setView('form') }}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                  style={{ background: 'rgba(99,102,241,0.2)' }}>
                  {req.evaluatee?.first_name?.[0]}{req.evaluatee?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    {req.evaluatee?.first_name} {req.evaluatee?.last_name}
                  </p>
                  <p className="text-xs text-white/35">
                    {req.relationship === 'peer' ? 'Collègue' : req.relationship === 'manager' ? 'Manager' : req.relationship === 'direct_report' ? 'Collaborateur' : req.relationship}
                    {req.status === 'in_progress' && <span className="ml-2 text-amber-400">· En cours</span>}
                  </p>
                </div>
                <ChevronRight size={14} className="text-white/20 flex-shrink-0"/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Soumises */}
      {submitted.length > 0 && (
        <div>
          <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Soumises</p>
          <div className="flex flex-col gap-1.5">
            {submitted.map(req => (
              <div key={req.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <CheckCircle size={14} className="text-green-400 flex-shrink-0"/>
                <span className="text-sm text-white/60">
                  {req.evaluatee?.first_name} {req.evaluatee?.last_name}
                </span>
                <span className="text-xs text-white/25 ml-auto">
                  {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeCycle && toComplete.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw size={40} className="text-white/10"/>
          <p className="text-sm text-white/30">Aucun cycle 360° actif.</p>
          {canAdmin && (
            <button onClick={() => setView('admin')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white mt-1"
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
              <Settings size={13}/> Créer un cycle
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// S69 — guards via AuthContext helpers (MANAGERS/ADMINS locaux supprimés)

// ─── Mon entretien (tab collaborateur) ───────────────────────

function MyReviewTab() {
  const { data: campaigns = [] } = useActiveCampaigns()
  const activeCampaign = campaigns[0]
  const { data: review, isLoading } = useMyReview(activeCampaign?.id)
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/30"/>
      </div>
    )
  }

  if (!activeCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Calendar size={40} className="text-white/10"/>
        <p className="text-sm text-white/35">Aucun entretien annuel en cours.</p>
        <p className="text-xs text-white/20">Votre responsable lancera prochainement la campagne annuelle.</p>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <ClipboardList size={40} className="text-white/10"/>
        <p className="text-sm text-white/35">Votre entretien n'a pas encore été créé.</p>
        <p className="text-xs text-white/20">Campagne active : {activeCampaign.title}</p>
      </div>
    )
  }

  if (formOpen) {
    const canEdit = ['pending', REVIEW_STATUS.SELF_IN_PROGRESS].includes(review.status)
    const canSign = review.status === 'completed' && !review.employee_signed_at
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setFormOpen(false)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            ← Retour
          </button>
        </div>
        <AnnualReviewForm review={review} mode={canEdit || canSign ? 'self' : 'view'} onClose={() => setFormOpen(false)}/>
      </div>
    )
  }

  const progress = getReviewProgress(review)
  const deadline = activeCampaign.self_eval_deadline
  const urgency = isDeadlineOverdue(deadline) && !review.self_submitted_at ? TASK_STATUS.OVERDUE : isDeadlineSoon(deadline) ? 'soon' : null
  const canOpen = ['pending', REVIEW_STATUS.SELF_IN_PROGRESS].includes(review.status)
  const canView = [REVIEW_STATUS.SELF_SUBMITTED, REVIEW_STATUS.MEETING_SCHEDULED, 'completed', 'signed', 'archived'].includes(review.status)
  const canSign = review.status === 'completed' && !review.employee_signed_at

  return (
    <div className="space-y-4">
      {/* Alerte deadline */}
      {urgency && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ background: urgency === TASK_STATUS.OVERDUE ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${urgency === TASK_STATUS.OVERDUE ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
          <AlertCircle size={16} style={{ color: urgency === TASK_STATUS.OVERDUE ? '#EF4444' : '#F59E0B' }}/>
          <p className="text-sm" style={{ color: urgency === TASK_STATUS.OVERDUE ? '#EF4444' : '#F59E0B' }}>
            {urgency === TASK_STATUS.OVERDUE
              ? 'La date limite d\'auto-évaluation est dépassée.'
              : `Il vous reste peu de temps pour compléter votre auto-évaluation (${new Date(deadline).toLocaleDateString('fr-FR')}).`}
          </p>
        </div>
      )}

      {/* Card campagne */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-base font-bold text-white">{activeCampaign.title}</p>
            <p className="text-xs text-white/40 mt-0.5">
              {activeCampaign.start_date && new Date(activeCampaign.start_date).toLocaleDateString('fr-FR')}
              {activeCampaign.end_date && ` → ${new Date(activeCampaign.end_date).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
          <span className="text-xs font-medium rounded-full px-2.5 py-1"
            style={{
              background: `${ANNUAL_REVIEW_STATUS_COLORS[review.status]}20`,
              color: ANNUAL_REVIEW_STATUS_COLORS[review.status],
            }}>
            {ANNUAL_REVIEW_STATUS_LABELS[review.status]}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/50">Progression</span>
            <span className="text-sm font-bold text-white">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: progress >= 80 ? '#10B981' : '#4F46E5' }}/>
          </div>
        </div>

        {/* Étapes */}
        <div className="flex items-center gap-0 overflow-x-auto">
          {[
            { label: 'En attente', done: true },
            { label: 'Auto-évaluation', done: !!review.self_submitted_at },
            { label: 'Entretien', done: review.status === REVIEW_STATUS.MEETING_SCHEDULED || !!review.completed_at },
            { label: 'Éval manager', done: !!review.completed_at },
            { label: 'Signature', done: !!review.employee_signed_at },
          ].map((step, i, arr) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${step.done ? '' : ''}`}
                  style={{
                    background: step.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${step.done ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {step.done
                    ? <CheckCircle size={12} style={{ color: '#10B981' }}/>
                    : <span className="w-2 h-2 rounded-full bg-white/20"/>}
                </div>
                <span className="text-xs text-white/30 text-center w-16 leading-tight">{step.label}</span>
              </div>
              {i < arr.length - 1 && <div className="w-8 h-px mx-1 mb-5" style={{ background: 'rgba(255,255,255,0.1)' }}/>}
            </div>
          ))}
        </div>

        {/* Résultat si complété */}
        {review.overall_rating && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Star size={16} fill={OVERALL_RATING_COLORS[review.overall_rating]} style={{ color: OVERALL_RATING_COLORS[review.overall_rating] }}/>
                <span className="text-sm font-semibold" style={{ color: OVERALL_RATING_COLORS[review.overall_rating] }}>
                  {OVERALL_RATING_LABELS[review.overall_rating]}
                </span>
              </div>
              {review.manager && (
                <span className="text-xs text-white/35">
                  par {review.manager.first_name} {review.manager.last_name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bouton action */}
        <div className="mt-4">
          {canSign ? (
            <button onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <CheckCircle size={15}/> Signer mon entretien
            </button>
          ) : canOpen ? (
            <button onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
              <ClipboardList size={15}/>
              {review.status === 'pending' ? 'Commencer mon auto-évaluation' : 'Continuer mon auto-évaluation'}
            </button>
          ) : canView ? (
            <button onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <ClipboardList size={15}/> Consulter mon entretien
            </button>
          ) : null}
        </div>
      </div>

      {/* Info dates */}
      {(activeCampaign.self_eval_deadline || activeCampaign.meeting_deadline) && (
        <div className="grid grid-cols-2 gap-3">
          {activeCampaign.self_eval_deadline && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-white/40">Limite auto-évaluation</p>
              <p className="text-sm font-medium text-white mt-0.5">{new Date(activeCampaign.self_eval_deadline).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
          {activeCampaign.meeting_deadline && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-white/40">Limite entretiens</p>
              <p className="text-sm font-medium text-white mt-0.5">{new Date(activeCampaign.meeting_deadline).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────


// ─── Auto-évaluation structurée (S80) ────────────────────────
function AutoEvalTab() {
  const { data: campaigns = [] } = useActiveCampaigns()
  const activeCampaign = campaigns[0]
  const { data: review, isLoading } = useMyReview(activeCampaign?.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/30"/>
      </div>
    )
  }
  if (!activeCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Calendar size={40} className="text-white/10"/>
        <p className="text-sm text-white/35">Aucun entretien en cours.</p>
      </div>
    )
  }
  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <ClipboardList size={40} className="text-white/10"/>
        <p className="text-sm text-white/35">Votre entretien n'a pas encore été créé par votre manager.</p>
      </div>
    )
  }
  const canEdit = ['pending',REVIEW_STATUS.SELF_IN_PROGRESS,REVIEW_STATUS.SELF_SUBMITTED].includes(review.status)
  return (
    <ReviewSelfAssessmentForm
      review={review}
      readOnly={!canEdit}
    />
  )
}

// ─── QuickStats entretiens (Étape 21) ────────────────────────
function QuickStatsEntretiens() {
  const { data: campaigns = [] } = useActiveCampaigns()
  const activeCampaign = campaigns[0]
  const { data: pending = [] } = useManagerPendingReviews(activeCampaign?.id)
  const stats = [
    { label: 'Campagne active',  value: activeCampaign ? 1 : 0, color: '#4F46E5' },
    { label: 'En attente',       value: pending.filter(r => ['pending',REVIEW_STATUS.SELF_IN_PROGRESS].includes(r.status)).length, color: '#F59E0B' },
    { label: 'Complétés',        value: pending.filter(r => r.status === 'completed').length, color: '#10B981' },
    { label: 'Signés',           value: pending.filter(r => r.employee_signed_at && r.manager_signed_at).length, color: '#8B5CF6' },
  ]
  return (
    <div className="flex flex-wrap gap-3 px-4 sm:px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
          <span className="text-xs text-white/35">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function EntretiensAnnuels() {
  const { profile } = useAuth()
  const { can: canDo } = usePermission()
  const canAdmin = canDo('evaluations', 'cycles', 'admin')
  const hasStrategic = canDo('evaluations', 'feedback360', 'read')
  const canManageTeam = canDo('evaluations', 'entretiens_team', 'read')
  const { data: settings }   = useAppSettings()
  const [tab, setTab]        = useState('mine')

  const role = profile?.role

  const moduleEnabled = settings?.modules?.entretiens_annuels_enabled !== false

  const { data: pendingReviews = [] } = useManagerPendingReviews()
  // S81 — badge 360° à compléter
  const { data: activeCycle360 } = useActiveFeedback360Cycle()
  const { data: toComplete360 = [] } = useMyFeedback360ToComplete(activeCycle360?.id)
  const feedback360Pending = toComplete360.filter(r => r.status !== STATUS.SUBMITTED).length

  if (!moduleEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Lock size={22} className="text-white/25"/>
        </div>
        <p className="text-white/35 text-sm">Le module Entretiens Annuels est désactivé.</p>
        <p className="text-white/20 text-xs">Contactez votre administrateur pour l'activer.</p>
      </div>
    )
  }

  const TABS = [
    { id: 'mine',     label: 'Mon entretien',   icon: ClipboardList },
    { id: 'autoeval', label: 'Auto-évaluation', icon: UserCheck },
    {
      id: 'feedback360', label: 'Feedback 360°', icon: RefreshCw,
      badge: feedback360Pending > 0 ? feedback360Pending : null,
    },
    { id: 'history',  label: 'Historique',      icon: History },
    ...(canManageTeam ? [{
      id: 'team',
      label: 'Mon équipe',
      icon: Users,
      badge: pendingReviews.length > 0 ? pendingReviews.length : null,
    }] : []),
    // S80 — Suivi managérial + Mi-année
    ...(canManageTeam ? [{ id: 'suivi',    label: 'Suivi',    icon: BarChart3 }] : []),
    ...(canManageTeam ? [{ id: 'mi_annee', label: 'Mi-année', icon: CalendarRange }] : []),
    ...(hasStrategic ? [{ id: 'calibration', label: 'Calibration', icon: Settings }] : []),
    ...(canAdmin ? [{ id: 'admin',   label: 'Campagnes', icon: Settings }] : []),
    ...(hasStrategic ? [{ id: 'tableau', label: 'Tableau de bord', icon: BarChart3 }] : []),
  ]

  const validTab = TABS.find(t => t.id === tab) ? tab : 'mine'

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.2))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ClipboardList size={18} style={{ color: '#818CF8' }}/>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Entretiens Annuels</h1>
            <p className="text-xs text-white/35">Évaluation & Développement professionnel</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon
            const active = validTab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="relative flex items-center gap-1.5 flex-shrink-0 rounded-lg px-3 py-1.5 text-sm transition-all"
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? '#ffffff' : '#ffffff50',
                }}>
                <Icon size={14}/>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="inline sm:hidden text-xs">{t.label.split(' ')[0]}</span>
                {t.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
                {active && (
                  <motion.div layoutId="entretiens-tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ background: '#818CF8' }}/>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div key={validTab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {validTab === 'mine'        && <MyReviewTab/>}
            {/* S80 — Auto-évaluation structurée */}
            {validTab === 'autoeval'    && <AutoEvalTab/>}
            {/* S81 — Feedback 360° */}
            {validTab === 'feedback360' && <Feedback360Tab/>}
            {validTab === 'history'     && <AnnualReviewHistory/>}
            {validTab === 'team'        && canManageTeam && <AnnualReviewDashboard/>}
            {/* S80 — Suivi managérial et mi-année */}
            {validTab === 'suivi'       && canManageTeam && <ReviewManagerDashboard/>}
            {validTab === 'mi_annee'    && canManageTeam && <MidYearCampaignPanel/>}
            {validTab === 'admin'       && canAdmin      && <AnnualReviewAdmin/>}
            {validTab === 'calibration' && hasStrategic  && (
              <Suspense fallback={<div className="flex items-center justify-center py-12"><span className="text-white/30 text-sm">Chargement calibration...</span></div>}>
                <CalibrationPage/>
              </Suspense>
            )}
            {validTab === 'tableau'     && hasStrategic  && <AnnualReviewEnrichedDashboard/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
