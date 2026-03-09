// ============================================================
// APEX RH — MonService.jsx · S117
// Batch 3 — Hub métier — Vue service pour chef_service
// Onglets via useSearchParams(?tab=equipe|formations|entretiens|performance)
// StatCard KPIs · GLASS_STYLE · Max 400 lignes
// ============================================================
import { useSearchParams }                  from 'react-router-dom'
import { motion }                           from 'framer-motion'
import {
  Users, BookOpen, ClipboardList, Activity,
  Calendar, Lock, TrendingUp, CheckCircle,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE,
  ROLES, ROLE_LABELS,
} from '../../utils/constants'
import StatCard   from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'

import { useAuth }             from '../../contexts/AuthContext'
import { usePermission }       from '../../hooks/usePermission'
import { useEmployeeList }     from '../../hooks/useEmployeeManagement'
import { useTeamEnrollments, ENROLLMENT_STATUS_LABELS } from '../../hooks/useFormations'
import { useActiveCampaigns, useTeamReviews, ANNUAL_REVIEW_STATUS_LABELS, ANNUAL_REVIEW_STATUS_COLORS } from '../../hooks/useAnnualReviews'
import { useAppSettings }      from '../../hooks/useSettings'
import { isPulseEnabled }      from '../../lib/pulseHelpers'
import {
  getPeriodDates,
  useTeamScoreHistory,
  buildLeaderboard,
} from '../../hooks/usePerformanceScores'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'equipe',      label: 'Équipe',      icon: Users,          color: '#6366F1' },
  { id: 'formations',  label: 'Formations',  icon: BookOpen,       color: '#3B82F6' },
  { id: 'entretiens',  label: 'Entretiens',  icon: ClipboardList,  color: '#10B981' },
  { id: 'performance', label: 'Performance', icon: Activity,       color: '#F59E0B' },
]
const DEFAULT_TAB = 'equipe'

// ─── PANEL ÉQUIPE ─────────────────────────────────────────────
function EquipePanel({ serviceId }) {
  const { data: employees = [], isLoading } = useEmployeeList()
  const members = serviceId ? employees.filter(e => e.service_id === serviceId) : employees

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (members.length === 0) return <EmptyState icon={Users} title="Aucun membre" description="Aucun collaborateur dans votre service." />

  return (
    <div className="space-y-2">
      {members.map(emp => (
        <div key={emp.id} className="rounded-2xl p-4 flex items-center gap-3" style={GLASS_STYLE}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
          >
            {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">{emp.first_name} {emp.last_name}</p>
            <p className="text-[10px] text-white/35">{emp.poste || ROLE_LABELS[emp.role] || emp.role}</p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#A5B4FC' }}
          >
            {ROLE_LABELS[emp.role] || emp.role}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── PANEL FORMATIONS ─────────────────────────────────────────
function FormationsPanel({ managerId }) {
  const { data: enrollments = [], isLoading } = useTeamEnrollments(managerId)

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (enrollments.length === 0) return (
    <EmptyState icon={BookOpen} title="Aucune inscription" description="Aucune formation en cours pour votre équipe." />
  )

  const completed  = enrollments.filter(e => e.status === 'completed').length
  const inProgress = enrollments.filter(e => e.status === 'in_progress').length
  const tauxCompletion = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Résumé */}
      <div className="rounded-2xl p-4 grid grid-cols-3 gap-3" style={GLASS_STYLE_STRONG}>
        <div className="text-center">
          <p className="text-xl font-black text-white">{tauxCompletion}%</p>
          <p className="text-[10px] text-white/35 mt-0.5">Taux completion</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black" style={{ color: '#3B82F6' }}>{inProgress}</p>
          <p className="text-[10px] text-white/35 mt-0.5">En cours</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black" style={{ color: '#10B981' }}>{completed}</p>
          <p className="text-[10px] text-white/35 mt-0.5">Terminées</p>
        </div>
      </div>
      {/* Liste */}
      {enrollments.slice(0, 15).map(enr => {
        const label = ENROLLMENT_STATUS_LABELS[enr.status] ?? enr.status
        const c = enr.status === 'completed' ? '#10B981' : enr.status === 'in_progress' ? '#3B82F6' : '#9CA3AF'
        return (
          <div key={enr.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.15)' }}
              >
                <BookOpen size={14} style={{ color: '#60A5FA' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">
                  {enr.training_catalog?.title ?? 'Formation'}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {enr.users?.first_name} {enr.users?.last_name}
                  {enr.training_catalog?.duration_hours ? ` · ${enr.training_catalog.duration_hours}h` : ''}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${c}18`, color: c }}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL ENTRETIENS ─────────────────────────────────────────
function EntretiensPanel() {
  const { data: campaigns = [], isLoading: loadC } = useActiveCampaigns()
  const activeCampaignId = campaigns[0]?.id ?? null
  const { data: reviews = [], isLoading: loadR }   = useTeamReviews(activeCampaignId)

  if (loadC || loadR) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (!activeCampaignId) return <EmptyState icon={ClipboardList} title="Aucune campagne active" description="Aucune campagne d'entretiens en cours." />
  if (reviews.length === 0) return <EmptyState icon={ClipboardList} title="Aucun entretien" description="Aucun entretien dans votre équipe sur cette campagne." />

  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-4 py-2.5 flex items-center gap-2" style={GLASS_STYLE_SUBTLE}>
        <Calendar size={12} className="text-emerald-400" />
        <span className="text-[11px] text-white/40">{campaigns[0]?.name}</span>
        <span className="ml-auto text-[10px] text-emerald-400">{reviews.length} entretien{reviews.length > 1 ? 's' : ''}</span>
      </div>
      {reviews.map(rev => {
        const statusLabel = ANNUAL_REVIEW_STATUS_LABELS?.[rev.status] ?? rev.status
        const statusColor = ANNUAL_REVIEW_STATUS_COLORS?.[rev.status] ?? '#9CA3AF'
        return (
          <div key={rev.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                {rev.employee?.first_name?.charAt(0)}{rev.employee?.last_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">
                  {rev.employee?.first_name} {rev.employee?.last_name}
                </p>
                <p className="text-[10px] text-white/35">{rev.employee?.poste || ROLE_LABELS[rev.employee?.role] || ''}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${statusColor}18`, color: statusColor }}>
                {statusLabel}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL PERFORMANCE ────────────────────────────────────────
function PerformancePanel({ serviceId, pulseOn }) {
  const { startDate, endDate } = getPeriodDates('month')
  const { data: scores = [], isLoading } = useTeamScoreHistory(startDate, endDate)

  if (!pulseOn) return <EmptyState icon={Activity} title="PULSE désactivé" description="Activez PULSE dans les Paramètres." />
  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const leaderboard = buildLeaderboard(scores)
  if (leaderboard.length === 0) return <EmptyState icon={Activity} title="Aucune donnée" description="Aucun score Pulse ce mois-ci." />

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={GLASS_STYLE_STRONG}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          Classement du mois — {leaderboard.length} agent{leaderboard.length > 1 ? 's' : ''}
        </p>
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((agent, idx) => {
            const c = agent.avgTotal >= 75 ? '#10B981' : agent.avgTotal >= 50 ? '#F59E0B' : '#EF4444'
            return (
              <div key={agent.userId} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-white/25 w-5 text-right">{idx + 1}</span>
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.2)' }}
                >
                  {agent.firstName?.charAt(0)}{agent.lastName?.charAt(0)}
                </div>
                <span className="text-[11px] text-white/70 flex-1 truncate">{agent.firstName} {agent.lastName}</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${agent.avgTotal}%`, background: c }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: c }}>{agent.avgTotal}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── HOOK KPIs ────────────────────────────────────────────────
function useMonServiceStats(serviceId, managerId) {
  const { data: employees = [] }   = useEmployeeList()
  const { data: enrollments = [] } = useTeamEnrollments(managerId)
  const { data: campaigns = [] }   = useActiveCampaigns()
  const activeCampaignId           = campaigns[0]?.id ?? null
  const { data: reviews = [] }     = useTeamReviews(activeCampaignId)

  const members        = serviceId ? employees.filter(e => e.service_id === serviceId) : employees
  const completed      = enrollments.filter(e => e.status === 'completed').length
  const tauxFormation  = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0
  const entretiensEnCours = reviews.filter(r => !['archived', 'completed'].includes(r.status)).length

  return { effectif: members.length, tauxFormation, entretiensEnCours }
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MonService() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile }        = useAuth()
  const { can }            = usePermission()
  const { data: settings } = useAppSettings()
  const pulseOn            = isPulseEnabled(settings)

  const isChefService = profile?.role === ROLES.CHEF_SERVICE
  const serviceId     = profile?.service_id ?? null
  const managerId     = profile?.id ?? null

  const { effectif, tauxFormation, entretiensEnCours } = useMonServiceStats(serviceId, managerId)

  if (!isChefService && !can('services', 'read')) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={GLASS_STYLE}>
            <Lock size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">Accès réservé aux chefs de service</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Mon Service</h1>
        <p className="text-sm text-white/40">
          {profile?.services?.name || 'Votre service'} · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users}         label="Effectif"           value={effectif}          color="#6366F1" />
        <StatCard icon={TrendingUp}    label="Taux formation"     value={`${tauxFormation}%`} color="#3B82F6" />
        <StatCard icon={CheckCircle}   label="Entretiens actifs"  value={entretiensEnCours} color="#10B981" />
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
        {activeTab === 'equipe'      && <EquipePanel      serviceId={serviceId} />}
        {activeTab === 'formations'  && <FormationsPanel  managerId={managerId} />}
        {activeTab === 'entretiens'  && <EntretiensPanel  />}
        {activeTab === 'performance' && <PerformancePanel serviceId={serviceId} pulseOn={pulseOn} />}
      </motion.div>
    </div>
  )
}
