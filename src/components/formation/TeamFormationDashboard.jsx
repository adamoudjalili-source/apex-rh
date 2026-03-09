// ============================================================
// APEX RH — components/formation/TeamFormationDashboard.jsx
// Session 57 — Vue manager : formations équipe + certifications
// ============================================================
import { useState } from 'react'
import {
  Users, Award, Clock, TrendingUp, CheckCircle2,
  AlertTriangle, BookOpen, Loader2, ChevronRight,
} from 'lucide-react'
import {
  useTeamEnrollments, useTeamCertifications, useTeamTrainingPlans,
  useEnrollUser, useTrainingCatalog,
  ENROLLMENT_STATUS_LABELS, ENROLLMENT_STATUS_COLORS,
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS,
  PLAN_PRIORITY_LABELS, PLAN_PRIORITY_COLORS,
} from '../../hooks/useFormations'
import { useAuth } from '../../contexts/AuthContext'
import { TASK_STATUS } from '../../utils/constants'
import StatCard from '../ui/StatCard'

const CURRENT_YEAR = new Date().getFullYear()


function EnrollmentRow({ enrollment }) {
  const { training_catalog: training, users: user, status, enrolled_at, completed_at, progress_pct } = enrollment
  if (!training || !user) return null
  const statusColor = ENROLLMENT_STATUS_COLORS[status] || '#6B7280'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: '#4F46E5' }}>
        {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-xs text-white/35 truncate">{training.title}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {(status === TASK_STATUS.EN_COURS) && (
          <span className="text-[11px] text-white/25">{progress_pct}%</span>
        )}
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${statusColor}18`, color: statusColor }}>
          {ENROLLMENT_STATUS_LABELS[status]}
        </span>
      </div>
    </div>
  )
}

function CertRow({ cert }) {
  const { users: user, name, expires_at } = cert
  if (!user) return null
  const days = expires_at
    ? Math.ceil((new Date(expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const expiring = days !== null && days > 0 && days < 60
  const expired  = days !== null && days < 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        expired ? 'bg-red-500/15' : expiring ? 'bg-amber-500/15' : 'bg-amber-500/10'
      }`}>
        <Award size={14} className={expired ? 'text-red-400' : 'text-amber-400'}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-xs text-white/35 truncate">{name}</p>
      </div>
      {expired && (
        <span className="text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
          Expirée
        </span>
      )}
      {expiring && (
        <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
          {days}j
        </span>
      )}
    </div>
  )
}

export default function TeamFormationDashboard() {
  const { profile } = useAuth()
  const managerId = profile?.id
  const [activeTab, setActiveTab] = useState('overview')

  const { data: enrollments = [], isLoading: loadingEnroll } = useTeamEnrollments(managerId)
  const { data: certifications = [], isLoading: loadingCerts }  = useTeamCertifications(managerId)
  const { data: plans = [], isLoading: loadingPlans }           = useTeamTrainingPlans(managerId, CURRENT_YEAR)

  // ── Stats globales équipe
  const totalEnroll   = enrollments.length
  const inProgress    = enrollments.filter(e => e.status === TASK_STATUS.EN_COURS).length
  const completed     = enrollments.filter(e => e.status === TASK_STATUS.TERMINE).length
  const totalCerts    = certifications.length
  const expiringCerts = certifications.filter(c => {
    const days = c.expires_at
      ? Math.ceil((new Date(c.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
      : null
    return days !== null && days > 0 && days < 60
  })

  const isLoading = loadingEnroll || loadingCerts

  const TABS = [
    { id: 'overview',    label: 'Vue d\'ensemble' },
    { id: 'enrollments', label: 'Inscriptions' },
    { id: 'certs',       label: 'Certifications' },
    { id: 'plans',       label: 'Plans' },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-indigo-400"/>
        </div>
      )}

      {/* ═══ VUE D'ENSEMBLE ═══ */}
      {activeTab === 'overview' && !isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={BookOpen}     label="Formations"    value={totalEnroll} color="#6366F1"/>
            <StatCard icon={Clock}        label="En cours"      value={inProgress}  color="#3B82F6"/>
            <StatCard icon={CheckCircle2} label="Terminées"     value={completed}   color="#10B981"/>
            <StatCard icon={Award}        label="Certifications" value={totalCerts} color="#F59E0B"
              sub={expiringCerts.length > 0 ? `${expiringCerts.length} expirent bientôt` : undefined}/>
          </div>

          {/* Alertes */}
          {expiringCerts.length > 0 && (
            <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-amber-300">
                {expiringCerts.length} certification{expiringCerts.length > 1 ? 's' : ''} de votre équipe expire{expiringCerts.length > 1 ? 'nt' : ''} dans moins de 60 jours.
              </p>
            </div>
          )}

          {/* Activité récente */}
          <div>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
              Activité récente
            </p>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              {enrollments.slice(0, 5).map(e => (
                <EnrollmentRow key={e.id} enrollment={e}/>
              ))}
              {enrollments.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/25">Aucune inscription dans votre équipe.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ INSCRIPTIONS ═══ */}
      {activeTab === 'enrollments' && !isLoading && (
        <div className="space-y-2">
          {enrollments.length === 0 ? (
            <div className="py-14 text-center">
              <BookOpen size={28} className="text-white/10 mx-auto mb-2"/>
              <p className="text-sm text-white/30">Aucune inscription dans votre équipe.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              {enrollments.map(e => <EnrollmentRow key={e.id} enrollment={e}/>)}
            </div>
          )}
        </div>
      )}

      {/* ═══ CERTIFICATIONS ═══ */}
      {activeTab === 'certs' && !isLoading && (
        <div className="space-y-2">
          {certifications.length === 0 ? (
            <div className="py-14 text-center">
              <Award size={28} className="text-white/10 mx-auto mb-2"/>
              <p className="text-sm text-white/30">Aucune certification dans votre équipe.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              {certifications.map(c => <CertRow key={c.id} cert={c}/>)}
            </div>
          )}
        </div>
      )}

      {/* ═══ PLANS ═══ */}
      {activeTab === 'plans' && !loadingPlans && (
        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="py-14 text-center">
              <Target size={28} className="text-white/10 mx-auto mb-2"/>
              <p className="text-sm text-white/30">Aucun plan de formation pour {CURRENT_YEAR}.</p>
            </div>
          ) : plans.map(plan => {
            const items = plan.training_plan_items || []
            const done  = items.filter(i => i.status === TASK_STATUS.TERMINE).length
            const pct   = items.length > 0 ? Math.round((done / items.length) * 100) : 0
            const user  = plan.users

            return (
              <div key={plan.id} className="rounded-xl p-4 border border-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.025)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                      {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-[11px] text-white/30">{items.length} formation{items.length > 1 ? 's' : ''} planifiée{items.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    plan.status === 'valide' ? 'bg-emerald-500/15 text-emerald-300'
                    : plan.status === TASK_STATUS.EN_COURS ? 'bg-blue-500/15 text-blue-300'
                    : 'bg-white/[0.05] text-white/35'
                  }`}>
                    {plan.status === 'valide' ? 'Validé' : plan.status === TASK_STATUS.EN_COURS ? 'En cours' : 'Brouillon'}
                  </span>
                </div>
                {items.length > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-white/25 mb-1">
                      <span>Progression</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}/>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
