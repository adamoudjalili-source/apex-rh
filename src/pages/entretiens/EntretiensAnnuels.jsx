// ============================================================
// APEX RH — pages/entretiens/EntretiensAnnuels.jsx
// Session 60 — Page principale Entretiens annuels & Évaluation avancée
// Onglets adaptatifs rôle :
//   Collaborateur  : Mon entretien · Historique
//   Manager        : + Mon équipe · Entretiens en attente
//   Admin/Directeur: + Administration campagnes
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, History, Users, Settings, BarChart3,
  Clock, CheckCircle, AlertCircle, Star,
  ChevronRight, Calendar, Loader2, Lock,
} from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
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

const MANAGERS = ['administrateur', 'directeur', 'chef_division', 'chef_service']
const ADMINS   = ['administrateur', 'directeur']

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
    const canEdit = ['pending', 'self_in_progress'].includes(review.status)
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
  const urgency = isDeadlineOverdue(deadline) && !review.self_submitted_at ? 'overdue' : isDeadlineSoon(deadline) ? 'soon' : null
  const canOpen = ['pending', 'self_in_progress'].includes(review.status)
  const canView = ['self_submitted', 'meeting_scheduled', 'completed', 'signed', 'archived'].includes(review.status)
  const canSign = review.status === 'completed' && !review.employee_signed_at

  return (
    <div className="space-y-4">
      {/* Alerte deadline */}
      {urgency && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ background: urgency === 'overdue' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${urgency === 'overdue' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
          <AlertCircle size={16} style={{ color: urgency === 'overdue' ? '#EF4444' : '#F59E0B' }}/>
          <p className="text-sm" style={{ color: urgency === 'overdue' ? '#EF4444' : '#F59E0B' }}>
            {urgency === 'overdue'
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
            { label: 'Entretien', done: review.status === 'meeting_scheduled' || !!review.completed_at },
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

export default function EntretiensAnnuels() {
  const { profile, isAdmin } = useAuth()
  const { data: settings }   = useAppSettings()
  const [tab, setTab]        = useState('mine')

  const role      = profile?.role
  const isManager = MANAGERS.includes(role)
  const isAdm     = ADMINS.includes(role) || isAdmin

  const moduleEnabled = settings?.modules?.entretiens_annuels_enabled !== false

  const { data: pendingReviews = [] } = useManagerPendingReviews()

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
    { id: 'mine',    label: 'Mon entretien',    icon: ClipboardList, roles: null },
    { id: 'history', label: 'Historique',        icon: History,       roles: null },
    ...(isManager ? [{
      id: 'team',
      label: 'Mon équipe',
      icon: Users,
      badge: pendingReviews.length > 0 ? pendingReviews.length : null,
      roles: MANAGERS,
    }] : []),
    ...(isAdm ? [{ id: 'admin', label: 'Campagnes', icon: Settings, roles: ADMINS }] : []),
    ...(isAdm ? [{ id: 'tableau', label: 'Tableau de bord', icon: BarChart3, roles: ADMINS }] : []),
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
            {validTab === 'mine'    && <MyReviewTab/>}
            {validTab === 'history' && <AnnualReviewHistory/>}
            {validTab === 'team'    && <AnnualReviewDashboard/>}
            {validTab === 'admin'   && <AnnualReviewAdmin/>}
            {validTab === 'tableau' && <AnnualReviewEnrichedDashboard/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
