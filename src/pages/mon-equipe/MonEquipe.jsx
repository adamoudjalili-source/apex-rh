// ============================================================
// APEX RH — MonEquipe.jsx · S116
// Hub Mon Espace — Vue équipe pour managers
// Onglets via useSearchParams(?tab=membres|taches|okr|performance)
// StatCard KPIs · GLASS_STYLE · Max 400 lignes
// ============================================================
import { useSearchParams }                  from 'react-router-dom'
import { motion }                           from 'framer-motion'
import {
  Users, CheckSquare, Target, Activity,
  Calendar, Lock, Star,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE, ROLE_LABELS, TASK_STATUS,
} from '../../utils/constants'
import StatCard   from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'

import { useAuth }             from '../../contexts/AuthContext'
import { usePermission }       from '../../hooks/usePermission'
import { useEmployeeList }     from '../../hooks/useEmployeeManagement'
import { useTasks }            from '../../hooks/useTasks'
import { useActiveOKRPeriods } from '../../hooks/useOkrPeriods'
import { useObjectives }       from '../../hooks/useObjectives'
import { useAppSettings }      from '../../hooks/useSettings'
import { isPulseEnabled }      from '../../lib/pulseHelpers'
import {
  getPeriodDates,
  useTeamScoreHistory,
  buildLeaderboard,
} from '../../hooks/usePerformanceScores'
import { MANAGER_ROLES }       from '../../lib/roles'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'membres',     label: 'Membres',     icon: Users,       color: '#6366F1' },
  { id: 'taches',      label: 'Tâches',      icon: CheckSquare, color: '#3B82F6' },
  { id: 'okr',         label: 'OKR',         icon: Target,      color: '#10B981' },
  { id: 'performance', label: 'Performance', icon: Activity,    color: '#F59E0B' },
]
const DEFAULT_TAB = 'membres'

// ─── PANEL MEMBRES ────────────────────────────────────────────
function MembresPanel({ serviceId }) {
  const { data: employees = [], isLoading } = useEmployeeList()

  const members = serviceId
    ? employees.filter(e => e.service_id === serviceId)
    : employees

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (members.length === 0) return <EmptyState icon={Users} title="Aucun membre" description="Aucun collaborateur dans votre équipe." />

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
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.1)", color: "#A5B4FC" }}
          >
            {ROLE_LABELS[emp.role] || emp.role}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── PANEL TÂCHES ─────────────────────────────────────────────
function TachesPanel({ serviceId }) {
  const { data: tasks = [], isLoading } = useTasks(serviceId ? { service_id: serviceId } : {})

  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const active = tasks.filter(t => !['terminee', 'archivee'].includes(t.status))
  if (active.length === 0) return <EmptyState icon={CheckSquare} title="Aucune tâche" description="Aucune tâche active dans votre équipe." />

  return (
    <div className="space-y-2">
      {active.slice(0, 20).map(task => {
        const s = TASK_STATUS[task.status] || {}
        return (
          <div key={task.id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 font-medium leading-snug truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Calendar size={9} />
                      {new Date(task.due_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {task.task_assignees?.length > 0 && (
                    <span className="text-[10px] text-white/30">
                      {task.task_assignees.length} assigné{task.task_assignees.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: s.bg || 'rgba(255,255,255,0.06)', color: s.text || '#9CA3AF' }}
              >
                {s.label || task.status}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL OKR ───────────────────────────────────────────────
function OKRPanel({ serviceId }) {
  const { data: periods = [], isLoading: loadingP } = useActiveOKRPeriods()
  const activePeriodId = periods[0]?.id ?? null
  const { data: objectives = [], isLoading: loadingO } = useObjectives(activePeriodId, {})

  if (loadingP || loadingO) return <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (!activePeriodId) return <EmptyState icon={Target} title="Aucune période active" description="Aucune période OKR active." />

  const teamObjs = serviceId
    ? objectives.filter(o => o.services?.id === serviceId || !o.services)
    : objectives

  if (teamObjs.length === 0) return <EmptyState icon={Target} title="Aucun objectif" description="Aucun objectif d'équipe sur cette période." />

  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-4 py-2.5 flex items-center gap-2" style={GLASS_STYLE_SUBTLE}>
        <Calendar size={12} className="text-emerald-400" />
        <span className="text-[11px] text-white/40">{periods[0]?.name}</span>
        <span className="ml-auto text-[10px] text-emerald-400">{teamObjs.length} objectif{teamObjs.length > 1 ? 's' : ''}</span>
      </div>
      {teamObjs.map(obj => {
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
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: c }} />
            </div>
            {obj.owner && (
              <p className="text-[10px] text-white/25">{obj.owner.first_name} {obj.owner.last_name}</p>
            )}
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
function useMonEquipeStats(serviceId) {
  const { data: employees = [] } = useEmployeeList()
  const { data: tasks = [] }     = useTasks(serviceId ? { service_id: serviceId } : {})
  const { data: periods = [] }   = useActiveOKRPeriods()
  const activePeriodId           = periods[0]?.id ?? null
  const { data: objectives = [] } = useObjectives(activePeriodId, {})

  const members = serviceId ? employees.filter(e => e.service_id === serviceId) : employees
  const activeTasks = tasks.filter(t => !['terminee', 'archivee'].includes(t.status))
  const teamObjs = serviceId ? objectives.filter(o => o.services?.id === serviceId || !o.services) : objectives
  const okrAtteints = teamObjs.filter(obj => {
    const krs = obj.key_results ?? []
    return krs.length > 0 && (krs.reduce((s, kr) => s + (kr.score ?? 0), 0) / krs.length) >= 80
  }).length

  return { membersCount: members.length, activeTasksCount: activeTasks.length, okrAtteints, okrTotal: teamObjs.length }
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MonEquipe() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile }        = useAuth()
  const { can }            = usePermission()
  const { data: settings } = useAppSettings()
  const pulseOn            = isPulseEnabled(settings)

  const isManager = MANAGER_ROLES.includes(profile?.role)
  const serviceId = profile?.service_id ?? null

  const { membersCount, activeTasksCount, okrAtteints, okrTotal } = useMonEquipeStats(serviceId)

  if (!isManager && !can('employes', 'orgchart', 'read')) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={GLASS_STYLE}>
            <Lock size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">Accès réservé aux managers</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Mon Équipe</h1>
        <p className="text-sm text-white/40">
          {profile?.services?.name || 'Votre service'} · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users}       label="Membres"       value={membersCount}    color="#6366F1" />
        <StatCard icon={CheckSquare} label="Tâches actives" value={activeTasksCount} color="#3B82F6" />
        <StatCard icon={Star}        label="OKR atteints"  value={okrTotal > 0 ? `${okrAtteints}/${okrTotal}` : '—'} color="#10B981" />
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
        {activeTab === 'membres'     && <MembresPanel     serviceId={serviceId} />}
        {activeTab === 'taches'      && <TachesPanel      serviceId={serviceId} />}
        {activeTab === 'okr'         && <OKRPanel          serviceId={serviceId} />}
        {activeTab === 'performance' && <PerformancePanel  pulseOn={pulseOn} />}
      </motion.div>
    </div>
  )
}
