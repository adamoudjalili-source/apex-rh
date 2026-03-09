// ============================================================
// APEX RH — MaDivision.jsx · S117
// Batch 3 — Hub métier — Vue division pour chef_division
// Onglets via useSearchParams(?tab=services|effectifs|formations|performance)
// StatCard KPIs · GLASS_STYLE · Max 400 lignes
// ============================================================
import { useSearchParams }                  from 'react-router-dom'
import { motion }                           from 'framer-motion'
import {
  LayoutGrid, Users, BookOpen, Activity,
  Lock, TrendingUp, CheckCircle, Building2,
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
import { useOrgStructure }     from '../../hooks/useEmployeeManagement'
import { useTeamEnrollments, ENROLLMENT_STATUS_LABELS } from '../../hooks/useFormations'
import { useAppSettings }      from '../../hooks/useSettings'
import { isPulseEnabled }      from '../../lib/pulseHelpers'
import {
  getPeriodDates,
  useTeamScoreHistory,
  buildLeaderboard,
} from '../../hooks/usePerformanceScores'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'services',    label: 'Services',    icon: LayoutGrid, color: '#6366F1' },
  { id: 'effectifs',   label: 'Effectifs',   icon: Users,      color: '#3B82F6' },
  { id: 'formations',  label: 'Formations',  icon: BookOpen,   color: '#10B981' },
  { id: 'performance', label: 'Performance', icon: Activity,   color: '#F59E0B' },
]
const DEFAULT_TAB = 'services'

// ─── PANEL SERVICES ───────────────────────────────────────────
function ServicesPanel({ divisionId }) {
  const { data: structure = {}, isLoading } = useOrgStructure()
  const { data: employees = [] }            = useEmployeeList()

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const services = divisionId
    ? (structure.services || []).filter(s => s.division_id === divisionId)
    : (structure.services || [])

  if (services.length === 0) return (
    <EmptyState icon={LayoutGrid} title="Aucun service" description="Aucun service dans votre division." />
  )

  return (
    <div className="space-y-2">
      {services.map(svc => {
        const count = employees.filter(e => e.service_id === svc.id).length
        return (
          <div key={svc.id} className="rounded-2xl p-4 flex items-center gap-3" style={GLASS_STYLE}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <Building2 size={16} style={{ color: '#A5B4FC' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/80 truncate">{svc.name}</p>
              {svc.description && (
                <p className="text-[10px] text-white/30 truncate">{svc.description}</p>
              )}
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#A5B4FC' }}
            >
              {count} membre{count !== 1 ? 's' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL EFFECTIFS ──────────────────────────────────────────
function EffectifsPanel({ divisionId }) {
  const { data: employees = [], isLoading } = useEmployeeList()

  const members = divisionId
    ? employees.filter(e => e.division_id === divisionId)
    : employees

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (members.length === 0) return (
    <EmptyState icon={Users} title="Aucun collaborateur" description="Aucun membre dans votre division." />
  )

  return (
    <div className="space-y-2">
      {members.map(emp => (
        <div key={emp.id} className="rounded-2xl p-4 flex items-center gap-3" style={GLASS_STYLE}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
          >
            {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">{emp.first_name} {emp.last_name}</p>
            <p className="text-[10px] text-white/35">
              {emp.services?.name || '—'} · {emp.poste || ROLE_LABELS[emp.role] || emp.role}
            </p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD' }}
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
    <EmptyState icon={BookOpen} title="Aucune inscription" description="Aucune formation en cours pour votre division." />
  )

  const completed  = enrollments.filter(e => e.status === 'completed').length
  const inProgress = enrollments.filter(e => e.status === 'in_progress').length
  const taux       = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4 grid grid-cols-3 gap-3" style={GLASS_STYLE_STRONG}>
        <div className="text-center">
          <p className="text-xl font-black text-white">{taux}%</p>
          <p className="text-[10px] text-white/35 mt-0.5">Completion</p>
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
      {enrollments.slice(0, 15).map(enr => {
        const label = ENROLLMENT_STATUS_LABELS[enr.status] ?? enr.status
        const c = enr.status === 'completed' ? '#10B981' : enr.status === 'in_progress' ? '#3B82F6' : '#9CA3AF'
        return (
          <div key={enr.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">
                  {enr.training_catalog?.title ?? 'Formation'}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {enr.users?.first_name} {enr.users?.last_name}
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

// ─── PANEL PERFORMANCE ────────────────────────────────────────
function PerformancePanel({ pulseOn }) {
  const { startDate, endDate } = getPeriodDates('month')
  const { data: scores = [], isLoading } = useTeamScoreHistory(startDate, endDate)

  if (!pulseOn) return <EmptyState icon={Activity} title="PULSE désactivé" description="Activez PULSE dans les Paramètres." />
  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const leaderboard = buildLeaderboard(scores)
  if (leaderboard.length === 0) return <EmptyState icon={Activity} title="Aucune donnée" description="Aucun score Pulse ce mois-ci." />

  return (
    <div className="rounded-2xl p-4" style={GLASS_STYLE_STRONG}>
      <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
        Classement division — {leaderboard.length} agent{leaderboard.length > 1 ? 's' : ''}
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
  )
}

// ─── HOOK KPIs ────────────────────────────────────────────────
function useMaDivisionStats(divisionId, managerId) {
  const { data: employees = [] }   = useEmployeeList()
  const { data: structure = {} }   = useOrgStructure()
  const { data: enrollments = [] } = useTeamEnrollments(managerId)

  const members   = divisionId ? employees.filter(e => e.division_id === divisionId) : employees
  const services  = divisionId ? (structure.services || []).filter(s => s.division_id === divisionId) : (structure.services || [])
  const completed = enrollments.filter(e => e.status === 'completed').length
  const taux      = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0

  return { effectif: members.length, nbServices: services.length, tauxFormation: taux }
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MaDivision() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile }        = useAuth()
  const { can }            = usePermission()
  const { data: settings } = useAppSettings()
  const pulseOn            = isPulseEnabled(settings)

  const isChefDivision = profile?.role === ROLES.CHEF_DIVISION
  const divisionId     = profile?.division_id ?? null
  const managerId      = profile?.id ?? null

  const { effectif, nbServices, tauxFormation } = useMaDivisionStats(divisionId, managerId)

  if (!isChefDivision && !can('divisions', 'read')) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={GLASS_STYLE}>
            <Lock size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">Accès réservé aux chefs de division</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Ma Division</h1>
        <p className="text-sm text-white/40">
          {profile?.divisions?.name || 'Votre division'} · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={LayoutGrid}  label="Services"       value={nbServices}          color="#6366F1" />
        <StatCard icon={Users}       label="Effectif total" value={effectif}             color="#3B82F6" />
        <StatCard icon={TrendingUp}  label="Taux formation" value={`${tauxFormation}%`} color="#10B981" />
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
        {activeTab === 'services'    && <ServicesPanel    divisionId={divisionId} />}
        {activeTab === 'effectifs'   && <EffectifsPanel   divisionId={divisionId} />}
        {activeTab === 'formations'  && <FormationsPanel  managerId={managerId} />}
        {activeTab === 'performance' && <PerformancePanel pulseOn={pulseOn} />}
      </motion.div>
    </div>
  )
}
