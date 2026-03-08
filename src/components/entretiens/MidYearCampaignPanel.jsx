// ============================================================
// APEX RH — components/entretiens/MidYearCampaignPanel.jsx
// Session 80 — Panneau campagne mi-année
// ============================================================
import { useState } from 'react'
import { usePermission } from '../../hooks/usePermission'
import {
  CalendarRange, Users, Plus, Loader2, CheckCircle,
  AlertTriangle, Play, Clock, BookOpen,
} from 'lucide-react'
import {
  useMidYearReviews,
  useCreateMidYearReviews,
  useActiveCampaigns,
  ANNUAL_REVIEW_STATUS_LABELS,
  ANNUAL_REVIEW_STATUS_COLORS,
  getDaysUntilDeadline,
  isDeadlineOverdue,
} from '../../hooks/useAnnualReviews'
import { useUsersList } from '../../hooks/useSettings'
import { useAuth } from '../../contexts/AuthContext'

// ─── Mid-year review card ─────────────────────────────────────

function MidYearCard({ review }) {
  const overdue = review.campaign?.manager_eval_deadline
    && isDeadlineOverdue(review.campaign.manager_eval_deadline)
    && !['completed','signed','archived'].includes(review.status)

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>
        {review.employee?.first_name?.[0]}{review.employee?.last_name?.[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {review.employee?.first_name} {review.employee?.last_name}
        </p>
        <p className="text-xs text-white/35">
          {review.campaign?.title}
          {review.campaign?.self_eval_deadline && (
            <span className="ml-1.5">
              — Limite : {new Date(review.campaign.self_eval_deadline).toLocaleDateString('fr-FR')}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs rounded-full px-2 py-0.5"
          style={{
            background: `${ANNUAL_REVIEW_STATUS_COLORS[review.status]}15`,
            color: ANNUAL_REVIEW_STATUS_COLORS[review.status],
          }}>
          {ANNUAL_REVIEW_STATUS_LABELS[review.status]}
        </span>
        {overdue && (
          <AlertTriangle size={14} style={{ color: '#EF4444' }}/>
        )}
      </div>
    </div>
  )
}

// ─── Launch modal ─────────────────────────────────────────────

function LaunchMidYearModal({ campaign, onClose }) {
  const { profile } = useAuth()
  const { data: users = [] } = useUsersList()
  const createMidYear = useCreateMidYearReviews()

  const [selected, setSelected] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // Mes collaborateurs directs
  const myTeam = users.filter(u => u.manager_id === profile?.id && u.id !== profile?.id)

  function toggle(userId) {
    setSelected(s => s.includes(userId) ? s.filter(x => x !== userId) : [...s, userId])
  }
  function toggleAll() {
    setSelected(s => s.length === myTeam.length ? [] : myTeam.map(u => u.id))
  }

  async function launch() {
    if (!selected.length || !campaign) return
    setSubmitting(true)
    try {
      const assignments = selected.map(uid => ({
        employee_id: uid,
        manager_id: profile.id,
      }))
      await createMidYear.mutateAsync({ campaign_id: campaign.id, assignments })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1f2e, #1e2440)', border: '1px solid rgba(255,255,255,0.12)' }}>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <CalendarRange size={15} style={{ color: '#A78BFA' }}/>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lancer les entretiens mi-année</h3>
              <p className="text-xs text-white/40">{campaign?.title}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/50">Sélectionner les collaborateurs</p>
            <button onClick={toggleAll} className="text-xs text-indigo-400 hover:text-indigo-300">
              {selected.length === myTeam.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
          </div>

          {myTeam.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-4">Aucun collaborateur direct trouvé.</p>
          ) : myTeam.map(u => (
            <button key={u.id} onClick={() => toggle(u.id)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors text-left"
              style={{
                background: selected.includes(u.id) ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selected.includes(u.id) ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
              }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}>
                {u.first_name?.[0]}{u.last_name?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{u.first_name} {u.last_name}</p>
                <p className="text-xs text-white/35 capitalize">{u.role?.replace('_', ' ')}</p>
              </div>
              {selected.includes(u.id) && <CheckCircle size={15} style={{ color: '#818CF8' }}/>}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={onClose} className="text-sm text-white/50 hover:text-white transition-colors">
            Annuler
          </button>
          <button
            onClick={launch}
            disabled={!selected.length || submitting}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
            {submitting ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
            Lancer ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────

export default function MidYearCampaignPanel() {
  const { can } = usePermission()
  const canManageTeam = can('evaluations', 'entretiens_team', 'read')
  const { data: midYearReviews = [], isLoading } = useMidYearReviews()
  const { data: campaigns = [] } = useActiveCampaigns()
  const activeCampaign = campaigns[0]
  const [showModal, setShowModal] = useState(false)

  const stats = {
    total:     midYearReviews.length,
    pending:   midYearReviews.filter(r => ['pending','self_in_progress'].includes(r.status)).length,
    submitted: midYearReviews.filter(r => r.status === 'self_submitted').length,
    completed: midYearReviews.filter(r => ['completed','signed'].includes(r.status)).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-white/30"/>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} style={{ color: '#A78BFA' }}/>
          <h3 className="text-sm font-bold text-white">Entretiens Mi-Année</h3>
        </div>
        {canManageTeam && activeCampaign && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
            <Plus size={14}/> Lancer mi-année
          </button>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex items-start gap-2">
          <BookOpen size={14} style={{ color: '#A78BFA' }} className="mt-0.5 flex-shrink-0"/>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/80">À propos des entretiens mi-année</p>
            <p className="text-xs text-white/45 leading-relaxed">
              Les entretiens mi-année (Q2) permettent de faire le point à mi-parcours, 
              d'ajuster les objectifs et d'anticiper les besoins de développement avant l'entretien annuel.
              Ils s'appuient sur le même template mais avec une périodicité semestrielle.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total',      value: stats.total,     color: '#818CF8' },
            { label: 'En attente', value: stats.pending,   color: '#F59E0B' },
            { label: 'Soumis',     value: stats.submitted, color: '#3B82F6' },
            { label: 'Complétés',  value: stats.completed, color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liste */}
      {midYearReviews.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <CalendarRange size={22} style={{ color: '#A78BFA' }}/>
          </div>
          <p className="text-sm text-white/35">Aucun entretien mi-année actif.</p>
          {canManageTeam && activeCampaign && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition-colors"
              style={{ border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}>
              <Plus size={13}/> Lancer pour mon équipe
            </button>
          )}
          {!activeCampaign && (
            <p className="text-xs text-white/25">Aucune campagne active — contactez votre administrateur.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {midYearReviews.map(r => (
            <MidYearCard key={r.id} review={r}/>
          ))}
        </div>
      )}

      {showModal && (
        <LaunchMidYearModal
          campaign={activeCampaign}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
